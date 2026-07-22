"""
GMS (Gen AI Management System) LLM 클라이언트
- SSAFY GMS 게이트웨이를 통해 OpenAI 호환 Chat Completions API 호출
- 모델: gpt-5.4-nano
"""
import json
import logging
from typing import Any

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from config import settings

logger = logging.getLogger(__name__)


class GMSError(Exception):
    """GMS 호출 실패"""


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
        retry=retry_if_exception_type((httpx.TransportError, httpx.HTTPStatusError)),
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=8),
        reraise=True,
    )
    async def _post(self, payload: dict[str, Any]) -> dict[str, Any]:
        url = f"{self.base_url}/chat/completions"
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.post(url, headers=self._headers, json=payload)
            resp.raise_for_status()
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
        """JSON 응답을 파싱해서 반환. 모델이 코드펜스로 감싸도 복구."""
        raw = await self.chat(
            system_prompt, user_prompt, temperature=temperature, json_mode=True
        )
        return _safe_json_parse(raw)


def _safe_json_parse(raw: str) -> Any:
    """LLM 출력에서 JSON 안전 추출 (```json 코드펜스 등 방어)."""
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
