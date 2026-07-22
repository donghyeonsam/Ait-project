"""
Chroma DB 클라이언트 (영속 모드) — 컬렉션 2개 관리
  · user_documents : 개인 문서(이력서/자소서/깃허브) — user_id 로 필터
  · cs_knowledge   : CS 전역 지식 — user_id 없음, 모든 사용자 공용
"""
import logging

import chromadb
from chromadb.config import Settings as ChromaSettings
from chromadb.utils import embedding_functions

from config import settings

logger = logging.getLogger(__name__)

_client: chromadb.ClientAPI | None = None
_embedding_fn = None
_collections: dict[str, object] = {}


def _get_client() -> "chromadb.ClientAPI":
    global _client
    if _client is None:
        logger.info("Chroma 초기화: dir=%s", settings.chroma_persist_dir)
        _client = chromadb.PersistentClient(
            path=settings.chroma_persist_dir,
            settings=ChromaSettings(anonymized_telemetry=False, allow_reset=False),
        )
    return _client


def _get_embedding_function():
    global _embedding_fn
    if _embedding_fn is None:
        logger.info("임베딩 모델 로딩: %s", settings.embedding_model)
        _embedding_fn = embedding_functions.SentenceTransformerEmbeddingFunction(
            model_name=settings.embedding_model
        )
    return _embedding_fn


def _get_or_create(name: str):
    if name in _collections:
        return _collections[name]
    col = _get_client().get_or_create_collection(
        name=name,
        embedding_function=_get_embedding_function(),
        metadata={"hnsw:space": "cosine"},
    )
    _collections[name] = col
    return col


def get_collection():
    """개인 문서 컬렉션 (user_documents)."""
    return _get_or_create(settings.chroma_collection)


def get_cs_collection():
    """CS 전역 지식 컬렉션 (cs_knowledge)."""
    return _get_or_create(settings.chroma_cs_collection)


def reset_collection(name: str | None = None) -> None:
    """(테스트/관리용) 지정 컬렉션 삭제 후 재생성. name 없으면 개인 문서."""
    target = name or settings.chroma_collection
    client = _get_client()
    try:
        client.delete_collection(target)
    except Exception:  # noqa: BLE001
        pass
    _collections.pop(target, None)
    _get_or_create(target)