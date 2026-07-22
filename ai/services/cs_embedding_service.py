"""
CS 지식 임베딩 서비스
- category/concept/content 형식의 CS 지식을 cs_knowledge 컬렉션에 저장
- 개인 문서와 달리 user_id 가 없는 전역 데이터
- 청킹 로직은 개인 문서용(embedding_service)과 공유
"""
import hashlib
import json
import logging
from pathlib import Path

from db.chroma import get_cs_collection, reset_collection
from config import settings
from schemas.cs_knowledge import CSEmbedRequest, CSKnowledgeItem
from services.embedding_service import _split_text  # 동일 청킹 재사용

logger = logging.getLogger(__name__)


def _make_cs_id(item: CSKnowledgeItem, idx: int) -> str:
    """
    개념+청크로 안정적인 ID 생성.
    같은 개념을 다시 넣으면 같은 ID → upsert 로 갱신(중복 방지).
    """
    key = f"{item.category}:{item.concept}"
    digest = hashlib.md5(key.encode("utf-8")).hexdigest()[:12]
    return f"cs:{digest}:{idx}"


def clear_cs_knowledge() -> bool:
    """CS 지식 컬렉션 전체 비우기 (전량 재구축용)."""
    reset_collection(settings.chroma_cs_collection)
    logger.info("CS 지식 컬렉션 초기화 완료")
    return True


def embed_cs_knowledge(req: CSEmbedRequest) -> tuple[int, int, int]:
    """
    CS 지식 임베딩.

    Returns:
        (embedded_concepts, total_chunks, total_in_collection)
    """
    if req.replace:
        clear_cs_knowledge()

    collection = get_cs_collection()

    ids: list[str] = []
    documents: list[str] = []
    metadatas: list[dict] = []

    for item in req.items:
        # concept 을 본문 앞에 붙여 검색 정확도 향상
        full_text = f"[{item.category}] {item.concept}\n{item.content}"
        chunks = _split_text(full_text)
        if not chunks:
            logger.warning("빈 CS 문서 스킵: %s / %s", item.category, item.concept)
            continue
        for idx, chunk in enumerate(chunks):
            ids.append(_make_cs_id(item, idx))
            documents.append(chunk)
            metadatas.append(
                {
                    "category": item.category,
                    "concept": item.concept,
                    "chunk_index": idx,
                }
            )

    if not ids:
        return (0, 0, get_cs_collection().count())

    collection.upsert(ids=ids, documents=documents, metadatas=metadatas)
    embedded_concepts = len({(m["category"], m["concept"]) for m in metadatas})
    total = collection.count()
    logger.info(
        "CS 지식 임베딩: concepts=%s chunks=%s total=%s",
        embedded_concepts, len(ids), total,
    )
    return (embedded_concepts, len(ids), total)


def seed_cs_knowledge_if_empty() -> int:
    """
    서버 기동 시 자동 시딩.
    - CS 컬렉션에 이미 데이터가 있으면 아무것도 안 함 (재임베딩 방지)
    - 비어있고 시드 JSON 파일이 있으면 임베딩

    시드 JSON 형식:
        [ {"category": "...", "concept": "...", "content": "..."}, ... ]

    Returns:
        새로 임베딩된 청크 수 (스킵 시 0)
    """
    collection = get_cs_collection()
    if collection.count() > 0:
        logger.info("CS 지식 이미 존재(%s) — 시딩 스킵", collection.count())
        return 0

    seed_file = Path(settings.cs_seed_path)
    if not seed_file.is_file():
        logger.info("CS 시드 파일 없음(%s) — 시딩 스킵", seed_file)
        return 0

    try:
        raw = json.loads(seed_file.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError) as e:
        logger.error("CS 시드 파일 읽기 실패: %s", e)
        return 0

    if not isinstance(raw, list) or not raw:
        logger.warning("CS 시드 파일이 비었거나 형식 오류")
        return 0

    items = [
        CSKnowledgeItem(
            category=str(r.get("category", "")).strip(),
            concept=str(r.get("concept", "")).strip(),
            content=str(r.get("content", "")).strip(),
        )
        for r in raw
        if r.get("content")
    ]
    if not items:
        logger.warning("CS 시드 유효 항목 없음")
        return 0

    _, chunks, total = embed_cs_knowledge(CSEmbedRequest(items=items, replace=False))
    logger.info("CS 지식 시딩 완료: %s개 항목 → %s청크 (전체 %s)", len(items), chunks, total)
    return chunks