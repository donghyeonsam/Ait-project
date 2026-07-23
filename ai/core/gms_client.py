"""
GMS (Gen AI Management System) LLM 클라이언트

[전체 서비스 흐름에서의 역할]
question_service.py(질문+rubric 생성), followup_service.py(rubric 채점+꼬리질문),
answer_service.py(답변 보완) 세 서비스가 전부 이 클라이언트 하나를 통해서만 LLM을
호출한다. 즉 "프롬프트를 만드는 로직"(prompts/templates.py)과 "그 프롬프트로 실제
HTTP 호출을 하고 재시도/에러 처리를 하는 로직"(이 파일)이 분리되어 있어, 각 서비스는
GMS 가 어떤 프로토콜을 쓰는지 몰라도 되고, GMS 쪽 정책이 바뀌어도 이 파일만 고치면 된다.

- SSAFY GMS 게이트웨이를 통해 OpenAI 호환 Chat Completions API 호출
- 모델: gpt-5.4-nano (gpt-5 계열이라 지시문을 system 이 아닌 developer role 로 보냄)
"""
import json
import logging
from typing import Any

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from config import settings

logger = logging.getLogger(__name__)


class GMSError(Exception):
    """
    GMS 호출 실패를 나타내는 공통 예외.
    routers/interview.py 의 각 엔드포인트가 이 예외만 잡아서 HTTP 502로 변환하므로,
    이 파일 아래에서 발생하는 모든 실패(HTTP 오류/연결 오류/JSON 파싱 오류)는
    반드시 이 예외로 통일해서 올려보낸다.
    """


class GMSClient:
    def __init__(self) -> None:
        self.base_url = settings.gms_base_url.rstrip("/")
        self.model = settings.gms_model
        self.timeout = settings.gms_timeout
        self._headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {settings.gms_key}",
        }

    @retry(
        # 일시적 장애(네트워크 끊김, 5xx 등)만 재시도하고, 4xx(요청 자체가 잘못됨)는
        # 재시도해도 결과가 달라지지 않으므로 즉시 실패시킨다.
        retry=retry_if_exception_type((httpx.TransportError, httpx.HTTPStatusError)),
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=8),  # 1s → 2s → 4s(최대 8s) 지수 백오프
        reraise=True,  # 3회 모두 실패하면 마지막 예외를 그대로 올려 위에서 GMSError로 변환
    )
    async def _post(self, payload: dict[str, Any]) -> dict[str, Any]:
        """실제 HTTP POST 1회 시도. tenacity 데코레이터가 이 함수 자체를 감싸 재시도한다."""
        url = f"{self.base_url}/chat/completions"
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.post(url, headers=self._headers, json=payload)
            resp.raise_for_status()  # 4xx/5xx 면 여기서 HTTPStatusError 발생 → 위 retry 로직이 처리
            return resp.json()

    async def chat(
        self,
        system_prompt: str,
        user_prompt: str,
        *,
        temperature: float = 0.7,
        json_mode: bool = False,
    ) -> str:
        """
        단일 턴 채팅 호출.

        Args:
            system_prompt: 지시문 (gpt-5 계열은 'developer' role 사용)
            user_prompt: 실제 요청 내용
            temperature: 창의성
            json_mode: True 이면 응답을 JSON object 로 강제

        Returns:
            모델 응답 문자열 (content)
        """
        payload: dict[str, Any] = {
            "model": self.model,
            "messages": [
                {"role": "developer", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": temperature,
        }
        if json_mode:
            payload["response_format"] = {"type": "json_object"}

        try:
            data = await self._post(payload)
        except httpx.HTTPStatusError as e:
            body = e.response.text if e.response is not None else ""
            logger.error("GMS HTTP error %s: %s", e.response.status_code, body)
            raise GMSError(f"GMS 호출 실패 (status={e.response.status_code})") from e
        except httpx.TransportError as e:
            logger.error("GMS transport error: %s", e)
            raise GMSError("GMS 연결 실패") from e

        try:
            return data["choices"][0]["message"]["content"]
        except (KeyError, IndexError) as e:
            logger.error("GMS 응답 파싱 실패: %s", data)
            raise GMSError("GMS 응답 형식 오류") from e

    async def chat_json(
        self, system_prompt: str, user_prompt: str, *, temperature: float = 0.7
    ) -> Any:
        """
        JSON 응답을 파싱해서 반환. 모델이 코드펜스로 감싸도 복구.

        question_service.py / followup_service.py / answer_service.py 가 공통으로
        이 메서드를 호출한다 — 세 서비스 모두 "LLM에게 JSON만 내놓으라고 시키고,
        받은 문자열을 dict/list 로 파싱해서 쓴다"는 동일한 패턴이기 때문에 파싱
        로직을 여기 한 곳에 모아뒀다.
        """
        raw = await self.chat(
            system_prompt, user_prompt, temperature=temperature, json_mode=True
        )
        return _safe_json_parse(raw)


def _safe_json_parse(raw: str) -> Any:
    """
    LLM 출력에서 JSON 안전 추출 (```json 코드펜스 등 방어).

    response_format=json_object 로 강제해도 LLM이 가끔 ```json ... ``` 코드펜스로
    감싸서 응답하는 경우가 있어(모델 학습 습관), 이를 방어적으로 벗겨낸다.
    1) 코드펜스 제거 → 2) 그대로 json.loads 시도 → 3) 실패하면 문자열에서 가장 바깥쪽
    {...} 또는 [...] 블록만 잘라내 재시도(예: 앞뒤에 설명 문구가 섞여 나온 경우 대비).
    이 3단계를 모두 실패하면 GMSError 로 명확히 실패를 알린다(원본 응답 앞 200자 포함,
    로그/디버깅용).
    """
    text = raw.strip()
    if text.startswith("```"):
        # ```json ... ``` 제거
        text = text.split("```", 2)
        text = text[1] if len(text) >= 2 else raw
        if text.lstrip().startswith("json"):
            text = text.lstrip()[4:]
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # 중괄호/대괄호 블록만 발라내기
        start = min(
            (i for i in (text.find("{"), text.find("[")) if i != -1), default=-1
        )
        end = max(text.rfind("}"), text.rfind("]"))
        if start != -1 and end != -1 and end > start:
            return json.loads(text[start : end + 1])
        raise GMSError(f"JSON 파싱 실패: {raw[:200]}")


# 싱글턴
gms_client = GMSClient()
