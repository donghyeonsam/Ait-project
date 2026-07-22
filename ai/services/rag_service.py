"""
RAG 검색 서비스
- Chroma 에서 user_id 로 필터링 + 쿼리 유사도로 관련 문서 청크 조회
- 면접 유형에 맞춰 doc_type 필터링 가능

[전체 서비스 흐름에서의 역할]
RAG(Retrieval-Augmented Generation)의 "R"을 담당한다. LLM에게 질문/꼬리질문/답변보완을
시키기 전에, 지원자가 실제로 제출한 이력서/자소서/GitHub 분석 내용을 이 서비스로 먼저
검색해서 프롬프트에 근거로 넣어준다 — 이렇게 해야 LLM이 지원자와 무관한 일반론이 아니라
"이 지원자가 실제로 한 프로젝트/기술"을 근거로 질문하고 채점할 수 있다.
호출하는 쪽: services/question_service.py(질문 생성), services/followup_service.py
(꼬리질문 채점), services/answer_service.py(답변 보완) 전부 이 모듈의 retrieve_context()
또는 retrieve_cs_knowledge() → format_context() 순서로 사용한다.
"""
import logging

from config import settings
from db.chroma import get_collection, get_cs_collection
from schemas.common import InterviewType, DocType

logger = logging.getLogger(__name__)


# 면접 유형별로 우선적으로 참고할 문서 출처, 리스트 안에 내용이 적혀있다면 해당 문서 종류만 참고. 비어있다면 종류 상관없이 모두 참고
INTERVIEW_DOC_PREFERENCE: dict[InterviewType, list[str]] = {
    InterviewType.JOB: [],
    InterviewType.TECH: [],
    InterviewType.PORTFOLIO: [],
    InterviewType.CS: [],  # CS 는 개인 문서보다 CS 지식 컬렉션 기반 (추후 확장)
    InterviewType.COMPREHENSIVE: [],  # 전체 포괄
}


def _build_where(user_id: int, interview_type: InterviewType) -> dict:
    """
    Chroma where 필터 구성.
    user_id 는 항상 필수(다른 사용자의 문서가 섞여 검색되면 안 되므로), doc_type 은
    INTERVIEW_DOC_PREFERENCE 에 값이 있을 때만 추가 필터로 걸린다.
    """
    doc_types = INTERVIEW_DOC_PREFERENCE.get(interview_type, [])
    if doc_types:
        return {
            "$and": [
                {"user_id": user_id},
                {"doc_type": {"$in": doc_types}},
            ]
        }
    return {"user_id": user_id}


def retrieve_context(
    user_id: int,
    query: str,
    interview_type: InterviewType,
    top_k: int | None = None,
) -> list[dict]:
    """
    개인 문서(user_documents 컬렉션)에서 관련 문서 청크 조회.

    호출 시점: 질문 생성 시(주제 전반을 검색), 꼬리질문/답변보완 시(직전 질문+답변을
    쿼리로 재검색해 더 좁고 정확한 근거를 찾음) — 즉 면접 진행 상황에 따라 쿼리 문자열만
    바뀌고 이 함수 자체는 동일하게 재사용된다.

    Returns:
        [{"content": str, "doc_type": str, "title": str, "distance": float}, ...]
        (distance 는 코사인 거리 — 값이 작을수록 쿼리와 더 유사한 문서)
    """
    collection = get_collection()
    top_k = top_k or settings.rag_top_k

    # 해당 사용자의 임베딩이 아예 없는 경우(문서 미등록/아직 임베딩 API 미호출 등)
    # Chroma 가 예외를 던질 수 있어 방어적으로 빈 리스트를 반환한다.
    # → question_service.py 등은 이 빈 리스트를 "문서 없음"으로 받아 일반 질문으로 대체한다.
    where = _build_where(user_id, interview_type)
    try:
        result = collection.query(
            query_texts=[query],
            n_results=top_k,
            where=where,
        )
    except Exception as e:  # noqa: BLE001
        logger.warning("RAG 조회 실패 (빈 컬렉션 가능): %s", e)
        return []

    docs = result.get("documents", [[]])[0]
    metas = result.get("metadatas", [[]])[0]
    dists = result.get("distances", [[]])[0]

    contexts: list[dict] = []
    for doc, meta, dist in zip(docs, metas, dists):
        contexts.append(
            {
                "content": doc,
                "doc_type": meta.get("doc_type", ""),
                "title": meta.get("title", ""),
                "distance": dist,
            }
        )
    logger.info("RAG 조회: user=%s type=%s hits=%s",
                user_id, interview_type.value, len(contexts))
    return contexts

def retrieve_cs_knowledge(query: str, top_k: int | None = None) -> list[dict]:
    """
    CS 전역 지식(cs_knowledge) 검색. user_id 필터 없음 (모든 사용자 공용).
    question_service.py 가 CS/종합 면접일 때만 retrieve_context() 결과에 이 함수의
    결과를 이어붙여, "지원자 개인 문서 근거 + CS 일반 지식 근거"를 함께 프롬프트에 담는다.
    """
    collection = get_cs_collection()
    top_k = top_k or settings.cs_top_k
    try:
        result = collection.query(query_texts=[query], n_results=top_k)
    except Exception as e:  # noqa: BLE001
        logger.warning("CS 지식 조회 실패 (빈 컬렉션 가능): %s", e)
        return []

    docs = result.get("documents", [[]])[0]
    metas = result.get("metadatas", [[]])[0]
    dists = result.get("distances", [[]])[0]

    contexts: list[dict] = []
    for doc, meta, dist in zip(docs, metas, dists):
        contexts.append({
            "content": doc, "doc_type": "cs_knowledge",
            "category": meta.get("category", ""), "concept": meta.get("concept", ""),
            "title": meta.get("concept", ""), "distance": dist,
        })
    logger.info("CS 지식 조회: hits=%s", len(contexts))
    return contexts

def format_context(contexts: list[dict]) -> str:
    """
    retrieve_context()/retrieve_cs_knowledge() 결과를 LLM 프롬프트에 그대로 붙여넣을
    수 있는 텍스트 블록으로 정리한다. prompts/templates.py 의 build_question_prompt(),
    build_followup_prompt(), build_answer_supplement_prompt() 가 각각 이 함수의 반환값을
    "## 지원자 문서 (RAG 검색 결과)" 섹션에 그대로 삽입한다.

    검색 결과가 하나도 없으면(신규 가입자라 문서가 아직 없는 경우 등) LLM이 근거 문서가
    없다는 걸 명확히 인지하고 "일반적인 질문"으로 대체하도록 안내 문구를 넣어준다.
    """
    if not contexts:
        return "(관련 문서 없음 — 일반적인 질문을 생성하세요.)"

    blocks: list[str] = []
    label = {
        "resume": "이력서",
        "cover_letter": "자기소개서",
        "github": "GitHub",
        "cs_knowledge": "CS지식",
    }
    for i, ctx in enumerate(contexts, 1):
        src = label.get(ctx["doc_type"], ctx["doc_type"])
        # CS 지식은 category(대분류)를, 개인 문서는 title(레포명/회사명 등)을 부제로 표시
        # — 두 컬렉션의 메타데이터 구조가 다르기 때문에(schemas/cs_knowledge.py 참고) 분기 처리.
        if ctx["doc_type"] == "cs_knowledge":
            sub = f" - {ctx.get('category', '')}" if ctx.get("category") else ""
        else:
            sub = f" - {ctx['title']}" if ctx.get("title") else ""
        blocks.append(f"[문서 {i} | {src}{sub}]\n{ctx['content']}")
    return "\n\n".join(blocks)
