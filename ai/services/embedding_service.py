"""
임베딩 서비스
- 이력서/자소서/깃허브 분석 텍스트를 청크로 분할 → Chroma 저장
- user_id / doc_type / target_id 를 metadata 로 부착 (RAG 필터링 근거)
"""
import logging

from db.chroma import get_collection
from schemas.embedding import EmbedRequest, EmbeddingItem

logger = logging.getLogger(__name__)

# 청크 파라미터 (한국어 기준 대략 문단 단위)
CHUNK_SIZE = 500
CHUNK_OVERLAP = 80


def _split_text(text: str, size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> list[str]:
    """
    문자 기반 슬라이딩 윈도우 청킹.
    문단(\n\n) 경계를 우선 존중하고, 너무 길면 강제 분할.
    """
    text = text.strip()
    if not text:
        return []

    # 1차: 문단 단위로 뭉치기
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    chunks: list[str] = []
    buf = ""
    for p in paragraphs:
        if len(buf) + len(p) + 2 <= size:
            buf = f"{buf}\n\n{p}" if buf else p
        else:
            if buf:
                chunks.append(buf)
            # 문단 자체가 size 보다 크면 강제 슬라이딩
            if len(p) > size:
                start = 0
                while start < len(p):
                    chunks.append(p[start : start + size])
                    start += size - overlap
                buf = ""
            else:
                buf = p
    if buf:
        chunks.append(buf)
    return chunks


def delete_user_embeddings(user_id: int) -> bool:
    """해당 사용자의 모든 임베딩 삭제. 삭제 대상 존재 여부와 무관하게 True."""
    collection = get_collection()
    collection.delete(where={"user_id": user_id})
    logger.info("임베딩 삭제 완료: user_id=%s", user_id)
    return True


def _make_id(user_id: int, item: EmbeddingItem, idx: int) -> str:
    return f"u{user_id}:{item.doc_type.value}:{item.target_id}:{idx}"


def embed_user_documents(req: EmbedRequest) -> tuple[int, int]:
    """
    사용자 문서 임베딩.

    Returns:
        (embedded_items, total_chunks)
    """
    collection = get_collection()

    if req.replace:
        delete_user_embeddings(req.user_id)

    ids: list[str] = []
    documents: list[str] = []
    metadatas: list[dict] = []

    for item in req.items:
        chunks = _split_text(item.content)
        if not chunks:
            logger.warning(
                "빈 문서 스킵: user=%s type=%s target=%s",
                req.user_id, item.doc_type, item.target_id,
            )
            continue
        for idx, chunk in enumerate(chunks):
            ids.append(_make_id(req.user_id, item, idx))
            documents.append(chunk)
            metadatas.append(
                {
                    "user_id": req.user_id,
                    "doc_type": item.doc_type.value,
                    "target_id": item.target_id,
                    "title": item.title or "",
                    "chunk_index": idx,
                }
            )

    if not ids:
        return (0, 0)

    # upsert: 동일 id 재삽입 시 갱신
    collection.upsert(ids=ids, documents=documents, metadatas=metadatas)
    embedded_items = len({(m["doc_type"], m["target_id"]) for m in metadatas})
    logger.info(
        "임베딩 저장: user=%s items=%s chunks=%s",
        req.user_id, embedded_items, len(ids),
    )
    return (embedded_items, len(ids))
