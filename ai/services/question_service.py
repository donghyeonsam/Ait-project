"""
질문 생성 서비스
- RAG 검색 → GMS LLM 프롬프트 구성 → 질문 N개 + 예상답안 생성
"""
import logging

from config import settings
from core.gms_client import gms_client, GMSError
from prompts.templates import QUESTION_SYSTEM, build_question_prompt
from schemas.interview import (
    QuestionGenerateRequest,
    QuestionGenerateResponse,
    GeneratedQuestion,
)
from schemas.common import InterviewType
from services.rag_service import retrieve_context, retrieve_cs_knowledge, format_context

logger = logging.getLogger(__name__)


def _build_rag_query(req: QuestionGenerateRequest) -> str:
    """RAG 검색용 쿼리 문자열. 지원 정보 + 면접 유형으로 관련 문서 유도."""
    parts = [f"{req.interview_type.value} 면접"]
    if req.position:
        parts.append(req.position)
    if req.company_name:
        parts.append(req.company_name)
    parts.append("프로젝트 경험 기술 스택 역량")
    return " ".join(parts)


async def generate_questions(req: QuestionGenerateRequest) -> QuestionGenerateResponse:
    count = req.question_count or settings.question_count

    # 1. RAG 검색
    query = _build_rag_query(req)
    contexts = retrieve_context(req.user_id, query, req.interview_type)

    # 1-2. CS/종합 면접이면 CS 전역 지식도 함께 검색해서 합침
    if req.interview_type in (InterviewType.CS, InterviewType.COMPREHENSIVE):
        cs_query = req.position or "컴퓨터공학 기초 CS 면접"
        cs_contexts = retrieve_cs_knowledge(cs_query)
        contexts = contexts + cs_contexts

    context_text = format_context(contexts)

    # 2. 프롬프트 구성
    prompt = build_question_prompt(
        interview_type=req.interview_type,
        difficulty=req.difficulty,
        company_name=req.company_name,
        position=req.position,
        question_count=count,
        context=context_text,
    )

    # 3. GMS 호출
    try:
        data = await gms_client.chat_json(QUESTION_SYSTEM, prompt, temperature=0.8)
    except GMSError:
        raise

    # 4. 파싱 & 정규화
    raw_questions = data.get("questions", []) if isinstance(data, dict) else []
    questions: list[GeneratedQuestion] = []
    for i, q in enumerate(raw_questions[:count], start=1):
        if not isinstance(q, dict) or not q.get("question"):
            continue
        questions.append(
            GeneratedQuestion(
                order=q.get("order", i),
                question=str(q["question"]).strip(),
                expected_answer=str(q.get("expected_answer", "")).strip(),
                topic=q.get("topic"),
                source=q.get("source"),
            )
        )

    # order 재정렬 (누락/중복 방지)
    for idx, q in enumerate(questions, start=1):
        q.order = idx

    logger.info(
        "질문 생성 완료: interview=%s type=%s count=%s rag=%s",
        req.ai_interview_id, req.interview_type.value, len(questions), bool(contexts),
    )

    return QuestionGenerateResponse(
        ai_interview_id=req.ai_interview_id,
        interview_type=req.interview_type,
        questions=questions,
        rag_used=bool(contexts),
    )
