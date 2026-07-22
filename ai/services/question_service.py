"""
질문 생성 서비스
- RAG 검색 → GMS LLM 프롬프트 구성 → 질문 N개 + rubric(채점 기준) 생성
- [루브릭 아키텍처 재설계] expected_answer(사전 예상 답안) 생성은 제거됨.
  답변 보완(ai_answer)은 사용자가 실제로 답변을 제출한 뒤 services/answer_service.py 가 담당한다.
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
    # [루브릭 아키텍처 전환] rubric 개수 범위(config.py, 기본 2~3개)를 프롬프트에 전달해
    # 질문마다 채점 기준을 함께 생성하도록 지시한다.
    prompt = build_question_prompt(
        interview_type=req.interview_type,
        difficulty=req.difficulty,
        company_name=req.company_name,
        position=req.position,
        question_count=count,
        rubric_min_count=settings.rubric_min_count,
        rubric_max_count=settings.rubric_max_count,
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

        # [루브릭 아키텍처 전환] LLM이 반환한 rubric 리스트를 정규화.
        # - 리스트가 아니거나 문자열이 아닌 항목은 버리고,
        # - 개수가 rubric_max_count를 넘으면 앞에서부터 잘라 상한을 지킨다.
        #   (LLM이 지시보다 많이 생성하는 경우에 대한 방어적 트리밍이며,
        #    개수가 min에 못 미치는 경우는 그대로 두어 BE/프론트가 실제 개수를 알 수 있게 한다.)
        raw_rubric = q.get("rubric", [])
        rubric = [
            str(item).strip()
            for item in raw_rubric
            if isinstance(raw_rubric, list) and isinstance(item, (str, int, float)) and str(item).strip()
        ][: settings.rubric_max_count]

        # [루브릭 아키텍처 재설계] expected_answer 필드는 더 이상 파싱하지 않는다.
        # LLM이 옛 프롬프트 습관으로 여전히 expected_answer를 보내더라도 무시한다.
        questions.append(
            GeneratedQuestion(
                order=q.get("order", i),
                question=str(q["question"]).strip(),
                rubric=rubric,
                topic=q.get("topic"),
                source=q.get("source"),
            )
        )

    # order 재정렬 (누락/중복 방지)
    for idx, q in enumerate(questions, start=1):
        q.order = idx

    # [루브릭 아키텍처 전환] rubric이 비어있는 질문이 있는지 로그로 남겨 모니터링한다.
    # (LLM이 rubric 생성 지시를 무시한 경우 조기에 알아채기 위함)
    missing_rubric = sum(1 for q in questions if not q.rubric)
    logger.info(
        "질문 생성 완료: interview=%s type=%s count=%s rag=%s rubric_missing=%s",
        req.ai_interview_id, req.interview_type.value, len(questions), bool(contexts), missing_rubric,
    )

    return QuestionGenerateResponse(
        ai_interview_id=req.ai_interview_id,
        interview_type=req.interview_type,
        questions=questions,
        rag_used=bool(contexts),
    )
