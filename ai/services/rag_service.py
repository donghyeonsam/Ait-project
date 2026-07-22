"""
RAG 검색 서비스
- Chroma 에서 user_id 로 필터링 + 쿼리 유사도로 관련 문서 청크 조회
- 면접 유형에 맞춰 doc_type 필터링 가능
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
    """Chroma where 필터 구성."""
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
    관련 문서 청크 조회.

    Returns:
        [{"content": str, "doc_type": str, "title": str, "distance": float}, ...]
    """
    collection = get_collection()
    top_k = top_k or settings.rag_top_k

    # 해당 사용자 임베딩이 아예 없으면 빈 결과
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
    """CS 전역 지식(cs_knowledge) 검색. user_id 필터 없음 (모든 사용자 공용)."""
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
    """검색 결과를 LLM 프롬프트에 넣을 텍스트로 정리."""
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
        title = f" - {ctx['title']}" if ctx["title"] else ""
        blocks.append(f"[문서 {i} | {src}{title}]\n{ctx['content']}")
    return "\n\n".join(blocks)
