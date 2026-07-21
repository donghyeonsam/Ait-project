"""
꼬리질문 서비스
- 사용자 답변을 보고 꼬리질문 필요 여부 판단 + 생성
- 질문당 최대 MAX_FOLLOWUP_PER_QUESTION 회 제한
"""
import logging

from config import settings
from core.gms_client import gms_client, GMSError
from prompts.templates import FOLLOWUP_SYSTEM, build_followup_prompt
from schemas.interview import FollowupRequest, FollowupResponse
from services.rag_service import retrieve_context, format_context

logger = logging.getLogger(__name__)


async def generate_followup(req: FollowupRequest) -> FollowupResponse:
    max_depth = settings.max_followup_per_question
    remaining = max_depth - req.followup_depth

    # 1. 횟수 초과 → 즉시 종료 (LLM 호출 없이 비용 절약)
    if remaining <= 0:
        logger.info(
            "꼬리질문 한도 도달: interview=%s depth=%s",
            req.ai_interview_id, req.followup_depth,
        )
        return FollowupResponse(
            ai_interview_id=req.ai_interview_id,
            need_followup=False,
            reason="꼬리질문 최대 횟수 도달",
            question=None,
            expected_answer=None,
            followup_depth=req.followup_depth,
        )

    # 2. 답변 + 질문 기반 RAG 검색 (관련 근거 보강)
    query = f"{req.parent_question} {req.user_answer}"
    contexts = retrieve_context(req.user_id, query, req.interview_type, top_k=3)
    context_text = format_context(contexts)

    # 3. 프롬프트 구성 & GMS 호출
    prompt = build_followup_prompt(
        interview_type=req.interview_type,
        parent_question=req.parent_question,
        user_answer=req.user_answer,
        context=context_text,
        remaining=remaining,
    )
    try:
        data = await gms_client.chat_json(FOLLOWUP_SYSTEM, prompt, temperature=0.7)
    except GMSError:
        raise

    if not isinstance(data, dict):
        data = {}

    need = bool(data.get("need_followup", False))
    question = data.get("question")
    expected = data.get("expected_answer")

    # 방어: need_followup=true 인데 질문이 비면 무효 처리
    if need and not (question and str(question).strip()):
        need = False

    new_depth = req.followup_depth + 1 if need else req.followup_depth

    logger.info(
        "꼬리질문 판단: interview=%s need=%s depth=%s->%s",
        req.ai_interview_id, need, req.followup_depth, new_depth,
    )

    return FollowupResponse(
        ai_interview_id=req.ai_interview_id,
        need_followup=need,
        reason=data.get("reason"),
        question=str(question).strip() if need and question else None,
        expected_answer=str(expected).strip() if need and expected else None,
        followup_depth=new_depth,
    )
