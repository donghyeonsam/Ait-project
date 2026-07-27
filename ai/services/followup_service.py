"""
꼬리질문 서비스 (rubric narrowing 전환)

[꼬리질문 narrowing 전환 - 2026-07-26]
기존에는 매 턴 rubric 전체를 백지 상태에서 재채점했다. FastAPI는 stateless라
"이전 턴에 어떤 rubric이 이미 통과됐는지"를 서버 스스로 알 방법이 없어, 같은
rubric이 턴마다 pass/fail을 오가는 진동이 발생했다(자세한 배경은
schemas/interview.py의 FollowupRequest 주변 주석 참고).

이제는 "통과한 rubric 항목을 응답에서 제거해 내려준다"는 narrowing 방식으로
바뀐다. LLM 1회 호출(One-Call JSON Mode)로 다음을 동시에 처리하는 구조는 그대로
유지된다:
  1) req.question.rubric(아직 통과하지 못한 기준) 중 이번 답변으로도 여전히
     미충족인 항목만 추려낸다(unpassed_rubric).
  2) 미충족 항목이 남아있으면, 그중 하나를 겨냥한 꼬리질문을 생성한다.

종료 조건은 "미통과 rubric이 남았는가"이며, rubric이 계속 통과되지 않아 대화가
무한정 이어지는 것을 막기 위해 depth 상한(안전장치)은 그대로 유지한다.
"""
import logging
import re

from config import settings
from core.gms_client import gms_client, GMSError
from prompts.templates import FOLLOWUP_SYSTEM, build_followup_prompt
from schemas.interview import FollowupRequest, FollowupResponse, FollowupNextQuestion
from services.rag_service import retrieve_context, format_context, build_target_ids

logger = logging.getLogger(__name__)

# [꼬리질문 narrowing 전환] 공백/구두점을 제거한 뒤 비교하기 위한 정규화 함수.
# \w는 유니코드 모드(파이썬 3 기본)에서 한글도 단어 문자로 취급하므로, 한글 문구의
# 띄어쓰기/구두점 차이만 흡수하고 실제 글자는 그대로 비교 대상이 된다.
_NON_WORD_RE = re.compile(r"[^\w]+", re.UNICODE)


def _normalize_for_match(text: str) -> str:
    return _NON_WORD_RE.sub("", text)


def _narrow_rubric(input_rubric: list[str], llm_unpassed: object) -> list[str]:
    """LLM이 반환한 unpassed_rubric을 입력 rubric(req.question.rubric)과 원문
    대조해 정규화한다.

    매칭은 ① 정확 일치 → ② 공백/구두점 제거 후 일치 순으로 시도하고, 둘 다
    실패한 항목은 버린다 — LLM이 지어낸 기준 문구가 rubric에 흘러들어오는 것을
    막기 위함이다. 반환값은 항상 input_rubric의 부분집합이라는 불변식이 보장된다
    (중복 제거, input_rubric 순서 유지).
    """
    if not isinstance(llm_unpassed, list):
        return []

    llm_exact: set[str] = set()
    llm_normalized: set[str] = set()
    for item in llm_unpassed:
        if not isinstance(item, str):
            continue
        text = item.strip()
        if not text:
            continue
        llm_exact.add(text)
        llm_normalized.add(_normalize_for_match(text))

    result: list[str] = []
    seen: set[str] = set()
    for criterion in input_rubric:
        if criterion in seen:
            continue
        if criterion in llm_exact or _normalize_for_match(criterion) in llm_normalized:
            result.append(criterion)
            seen.add(criterion)
    return result


async def generate_followup(req: FollowupRequest) -> FollowupResponse:
    # 1. [꼬리질문 narrowing 전환] rubric이 비어 있으면 이 질문은 이미 전부
    #    통과한 상태다. 호출측이 방어적으로(narrowing 후 빈 rubric인 채로) 호출해도
    #    안전하게 만들고, 어차피 채점할 게 없는 상황에서 GMS 호출 비용을 아낀다.
    if not req.question.rubric:
        logger.info(
            "꼬리질문 스킵(rubric 없음): interview=%s order=%s depth=%s",
            req.ai_interview_id, req.question.order, req.question.depth,
        )
        return FollowupResponse(is_pass=True, next_question=None)

    max_depth = settings.max_followup_per_question

    # 2. 안전장치: 꼬리질문 횟수 상한 도달 → LLM 호출 없이 즉시 종료.
    #    미통과 rubric이 남아있어도 강제로 끝내는 경우이므로, is_pass=True는
    #    "모두 통과"와 "상한 도달로 강제 종료" 두 의미를 함께 갖는다. 호출측은
    #    이 둘을 구분하려면 question.depth 값을 봐야 한다.
    if req.question.depth >= max_depth:
        logger.info(
            "꼬리질문 한도 도달(capped): interview=%s order=%s depth=%s max=%s",
            req.ai_interview_id, req.question.order, req.question.depth, max_depth,
        )
        return FollowupResponse(is_pass=True, next_question=None)

    # 3. 답변 + 질문 기반 RAG 검색 (관련 근거 보강)
    query = f"{req.question.question} {req.answer}"
    target_ids = build_target_ids(req.resume_id, req.cover_letter_id, req.github_repo_id)
    contexts = retrieve_context(
        req.user_id, query, req.interview_type, top_k=3, target_ids=target_ids
    )
    context_text = format_context(contexts)

    # 4. 프롬프트 구성 & GMS 호출 (답변 1건당 1회 — narrowing 전환으로도 늘지 않음)
    prompt = build_followup_prompt(
        interview_type=req.interview_type,
        parent_question=req.question.question,
        rubric=req.question.rubric,
        user_answer=req.answer,
        context=context_text,
    )
    try:
        data = await gms_client.chat_json(FOLLOWUP_SYSTEM, prompt, temperature=0.7)
    except GMSError:
        raise

    if not isinstance(data, dict):
        data = {}

    # 5. unpassed_rubric 정규화 — 결과는 req.question.rubric의 부분집합임이 보장된다.
    unpassed = _narrow_rubric(req.question.rubric, data.get("unpassed_rubric", []))

    logger.info(
        "꼬리질문 채점 완료: interview=%s order=%s depth=%s rubric_in=%s unpassed=%s",
        req.ai_interview_id, req.question.order, req.question.depth,
        len(req.question.rubric), len(unpassed),
    )

    # 6. 정규화 결과가 비면(LLM이 전부 통과로 판단, 또는 지어낸 문구만 반환해 전부
    #    걸러짐) 전부 통과로 처리한다.
    if not unpassed:
        return FollowupResponse(is_pass=True, next_question=None)

    followup_question = data.get("followup_question")
    has_followup = bool(followup_question and str(followup_question).strip())

    # 7. 방어: 미통과 rubric은 있는데 꼬리질문이 비어있으면(LLM 형식 누락) 강제로
    #    통과 처리한다 — 꼬리질문도 없고 다음 단계로도 못 가는 교착 상태를 막기
    #    위한 기존 방어 로직을 그대로 계승한다.
    if not has_followup:
        logger.warning(
            "꼬리질문 생성 누락, 통과 처리로 폴백: interview=%s order=%s unpassed=%s",
            req.ai_interview_id, req.question.order, len(unpassed),
        )
        return FollowupResponse(is_pass=True, next_question=None)

    return FollowupResponse(
        is_pass=False,
        next_question=FollowupNextQuestion(
            order=req.question.order,
            question=str(followup_question).strip(),
            rubric=unpassed,
            topic=req.question.topic,
            source=req.question.source,
            depth=req.question.depth + 1,
        ),
    )
