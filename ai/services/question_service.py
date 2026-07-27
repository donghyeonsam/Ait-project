"""
질문 생성 서비스
- RAG 검색 → GMS LLM 프롬프트 구성 → 질문 N개 + rubric(채점 기준) 생성
- [루브릭 아키텍처 재설계] expected_answer(사전 예상 답안) 생성은 제거됨.
  답변 보완(ai_answer)은 사용자가 실제로 답변을 제출한 뒤 services/answer_service.py 가 담당한다.
- [CS 카테고리 제한 기능 / 경력·스킬 반영 - 신규] CS 면접은 사용자가 고른 CS 카테고리
  내부로만 질문을 제한하고, 경력/보유 스킬을 RAG 쿼리와 프롬프트에 반영한다.
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
from schemas.common import InterviewType, CS_CATEGORY_LABEL
from services.rag_service import (
    retrieve_context,
    retrieve_cs_knowledge,
    retrieve_cs_knowledge_random,
    format_context,
    build_target_ids,
)

logger = logging.getLogger(__name__)


def _build_rag_query(req: QuestionGenerateRequest) -> str:
    """
    RAG 검색용 쿼리 문자열. 지원 정보 + 면접 유형으로 관련 문서 유도.
    [경력/보유 스킬 반영 - 신규] career/skills 가 있으면 쿼리에 포함시켜, 지원자의
    연차/기술 스택과 실제로 관련된 문서 청크가 더 잘 검색되도록 한다.
    """
    parts = [f"{req.interview_type.value} 면접"]
    if req.position:
        parts.append(req.position)
    if req.company_name:
        parts.append(req.company_name)
    if req.career:
        parts.append(req.career)
    if req.skills:
        parts.append(" ".join(req.skills))
    parts.append("프로젝트 경험 기술 스택 역량")
    return " ".join(parts)


def _build_cs_query(req: QuestionGenerateRequest) -> str:
    """
    [CS 카테고리 제한 기능 - 신규 / BE 요청 형식 개편 - 다중 선택 대응] CS 면접 전용
    RAG 쿼리. "사용자가 고른 CS 카테고리(들)"을 쿼리의 중심에 두고, 있다면 직무/스킬
    정보도 덧붙여 "이 카테고리 안에서 지원자와 관련 있는 내용"을 검색하도록 유도한다.
    카테고리를 여러 개 골랐으면 라벨을 쉼표로 이어붙여 하나의 쿼리 문자열로 합친다.
    """
    labels = [CS_CATEGORY_LABEL[c] for c in req.cs_categories]
    parts = [", ".join(labels), "CS 면접"]
    if req.position:
        parts.append(req.position)
    if req.skills:
        parts.append(" ".join(req.skills))
    return " ".join(parts)


async def generate_questions(req: QuestionGenerateRequest) -> QuestionGenerateResponse:
    # count = req.question_count or settings.question_count
    count = 7

    # [BE 요청 형식 개편 - 신규] resume_id/cover_letter_id/github_repo_id 가 지정된
    # doc_type만 target_id로 좁혀 검색하도록 retrieve_context() 전 호출에 공통으로 넘긴다.
    # (build_target_ids() 는 followup_service.py/answer_service.py 도 함께 쓰는 공용
    # 헬퍼로, 세 서비스가 각자 동일한 변환 로직을 중복 구현하지 않도록 rag_service.py 에 둠)
    target_ids = build_target_ids(req.resume_id, req.cover_letter_id, req.github_repo_id)

    if req.interview_type == InterviewType.CS:
        # [CS 카테고리 제한 기능 - 신규 / BE 요청 형식 개편 - 다중 선택 대응]
        # schemas/interview.py 의 model_validator 가 이미 cs_categories 최소 1개 존재를
        # 보장하므로 여기서는 빈 리스트 체크 없이 바로 사용해도 안전하다.
        cs_query = _build_cs_query(req)

        # 1. 개인 문서(이력서/자소서/GitHub)를 "선택한 CS 카테고리(들)" 기준으로 검색.
        #    DOC_TYPE_WEIGHTS(rag_service.py)에 정의된 CS 면접 비율(이력서10/자소서40/GitHub50)과
        #    target_ids(지정된 특정 문서 필터)가 retrieve_context() 내부에서 그대로 적용된다.
        personal_contexts = retrieve_context(
            req.user_id, cs_query, req.interview_type, target_ids=target_ids
        )

        # 2. 관련도 판단: 최상위 검색 결과의 코사인 거리가 임계값보다 크면(=유사도가 낮으면)
        #    "지원자 문서가 이 카테고리와 사실상 무관하다"고 보고 개인 문서를 버린다.
        #    (예: '보안' 카테고리를 골랐는데 문서에는 프론트엔드 경험만 있는 경우)
        top_distance = personal_contexts[0]["distance"] if personal_contexts else None
        is_relevant = (
            top_distance is not None and top_distance <= settings.cs_relevance_distance_threshold
        )

        if is_relevant:
            contexts = personal_contexts
            cs_contexts = retrieve_cs_knowledge(cs_query, cs_categories=req.cs_categories)
        else:
            # 개인 문서가 무관하므로 사용하지 않고, 선택한 카테고리(들) 안에서 무작위로
            # CS 지식을 뽑아 질문 생성 근거로 삼는다("카테고리 내에서라면 무엇이든 OK").
            contexts = []
            cs_contexts = retrieve_cs_knowledge_random(req.cs_categories)

        contexts = contexts + cs_contexts
        logger.info(
            "CS 질문 생성 RAG: categories=%s personal_relevant=%s top_distance=%s",
            [c.value for c in req.cs_categories], is_relevant, top_distance,
        )
    else:
        # 1. RAG 검색 (JOB/TECH/PORTFOLIO/COMPREHENSIVE)
        query = _build_rag_query(req)
        contexts = retrieve_context(req.user_id, query, req.interview_type, target_ids=target_ids)

        # 1-2. 종합 면접이면 CS 전역 지식도 함께 검색해서 합침.
        #      cs_categories 가 함께 왔으면(선택 사항) 그 카테고리(들)로 제한하고,
        #      비어있으면(기본값) 기존처럼 전체 CS 지식에서 검색한다.
        if req.interview_type == InterviewType.COMPREHENSIVE:
            cs_query = req.position or "컴퓨터공학 기초 CS 면접"
            cs_contexts = retrieve_cs_knowledge(cs_query, cs_categories=req.cs_categories)
            contexts = contexts + cs_contexts

    context_text = format_context(contexts)

    # 2. 프롬프트 구성
    # [루브릭 아키텍처 전환] rubric 개수 범위(config.py, 기본 2~3개)를 프롬프트에 전달해
    # 질문마다 채점 기준을 함께 생성하도록 지시한다.
    # [CS 카테고리 제한 기능 / 경력·스킬 반영] cs_category/career/skills 를 그대로 넘겨
    # RAG 컨텍스트가 부족해도 프롬프트 문구 자체가 범위를 명시하도록 한다.
    # [면접관 스타일 반영 기능] req.ai_attitude_style(BE 요청 형식 개편으로 필드명이
    # interviewer_style → ai_attitude_style 로 바뀜, 값 타입은 기존 InterviewerStyle
    # enum 그대로)을 그대로 프롬프트 빌더에 전달한다. build_question_prompt() 자체의
    # 파라미터명은 interviewer_style 그대로 두었다 — 프롬프트 내부 로직은 "면접관
    # 스타일"이라는 개념을 다루는 것이지 BE wire 필드명과는 무관하기 때문. 질문
    # "내용"에 영향을 주는 다른 인자(difficulty, cs_categories 등)와 달리 이 값은
    # build_question_prompt() 내부에서 오직 어조 지시문(INTERVIEWER_STYLE_GUIDE)
    # 섹션에만 쓰인다. followup_service.py/answer_service.py 프롬프트에는 아직 반영하지
    # 않음(범위 밖 — 별도 논의 후 결정).
    prompt = build_question_prompt(
        interview_type=req.interview_type,
        difficulty=req.difficulty,
        interviewer_style=req.ai_attitude_style,
        company_name=req.company_name,
        position=req.position,
        career=req.career,
        skills=req.skills,
        cs_categories=req.cs_categories,
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
