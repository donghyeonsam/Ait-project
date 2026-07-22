"""
답변 보완 서비스 (신규 — 루브릭 아키텍처 재설계)

[루브릭 아키텍처 재설계]
기존 계획(Phase 3)은 "면접 종료 후 전체 대화 기록을 한 번에 처리해 모범 답안을 만드는"
방식이었다. 이번 재설계로 이를 "사용자가 답변을 제출할 때마다(기본 질문/꼬리질문 구분
없이) BE가 그때그때 비동기로 호출해, 그 답변 하나를 보완한 ai_answer 를 즉시 생성"하는
방식으로 바꿨다.

호출 시점: BE가 사용자 답변을 DB에 저장한 직후, 면접 진행 자체를 막지 않는 백그라운드
작업으로 비동기 호출하는 것을 전제로 한다. 생성된 ai_answer 는
ai_interview_questions.ai_answer 컬럼에 저장되어, 면접 최종 완료 화면에서
(질문, 사용자 답변, ai_answer) 목록으로 노출된다.
"""
import logging

from core.gms_client import gms_client, GMSError
from prompts.templates import ANSWER_SUPPLEMENT_SYSTEM, build_answer_supplement_prompt
from schemas.interview import AnswerSupplementRequest, AnswerSupplementResponse
from services.rag_service import retrieve_context, format_context

logger = logging.getLogger(__name__)


async def generate_answer_supplement(req: AnswerSupplementRequest) -> AnswerSupplementResponse:
    # 1. 질문 + 답변 기반 RAG 검색 (보완 시 지원자 실제 경험을 근거로 삼기 위함)
    query = f"{req.question} {req.user_answer}"
    contexts = retrieve_context(req.user_id, query, req.interview_type, top_k=3)
    context_text = format_context(contexts)

    # 2. rubric_results 가 있으면 프롬프트 모듈이 기대하는 dict 형태로 변환.
    #    [루브릭 아키텍처 재설계] Phase 2(/followup)에서 이미 채점된 결과가 있으면
    #    그대로 넘겨서, 어떤 기준을 놓쳤는지 재채점 없이 바로 알려준다.
    rubric_results_dicts = (
        [r.model_dump() for r in req.rubric_results] if req.rubric_results else None
    )

    # 3. 프롬프트 구성 & GMS 호출
    prompt = build_answer_supplement_prompt(
        interview_type=req.interview_type,
        question=req.question,
        rubric=req.rubric,
        rubric_results=rubric_results_dicts,
        user_answer=req.user_answer,
        context=context_text,
    )
    try:
        data = await gms_client.chat_json(ANSWER_SUPPLEMENT_SYSTEM, prompt, temperature=0.6)
    except GMSError:
        raise

    if not isinstance(data, dict):
        data = {}

    # 4. 파싱 & 방어: LLM이 ai_answer 를 비워서 보내면(형식 오류 등) 사용자 원문 답변을
    #    그대로 폴백으로 사용한다 — 빈 문자열을 DB에 저장해 화면이 깨지는 것을 방지.
    ai_answer = str(data.get("ai_answer") or "").strip()
    if not ai_answer:
        logger.warning(
            "답변 보완 결과 비어있음, 원문 답변으로 폴백: interview=%s question=%s",
            req.ai_interview_id, req.question[:50],
        )
        ai_answer = req.user_answer

    logger.info(
        "답변 보완 완료: interview=%s question=%s rag=%s",
        req.ai_interview_id, req.question[:50], bool(contexts),
    )

    return AnswerSupplementResponse(
        ai_interview_id=req.ai_interview_id,
        question=req.question,
        ai_answer=ai_answer,
    )
