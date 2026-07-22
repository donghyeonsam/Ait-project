"""
Chroma DB 클라이언트 (영속 모드) — 컬렉션 2개 관리
  · user_documents : 개인 문서(이력서/자소서/깃허브) — user_id 로 필터
  · cs_knowledge   : CS 전역 지식 — user_id 없음, 모든 사용자 공용

[전체 서비스 흐름에서의 역할]
이 파일은 벡터DB(Chroma)에 대한 유일한 접근 창구다. 다른 모든 서비스는 Chroma
클라이언트를 직접 만들지 않고 반드시 get_collection()/get_cs_collection() 을 통해서만
컬렉션을 얻는다.
  - services/embedding_service.py, services/cs_embedding_service.py → 이 컬렉션에 upsert(저장)
  - services/rag_service.py → 이 컬렉션에 query(유사도 검색) — 질문/꼬리질문/답변보완
    프롬프트를 만들 때 근거 문서를 가져오는 RAG의 "R"(Retrieval) 담당
클라이언트/임베딩 모델/컬렉션 객체를 전부 모듈 전역(_client, _embedding_fn,
_collections)에 캐싱해두는 이유는, 매 요청마다 새로 만들면 SentenceTransformer
모델을 다시 로딩하게 되어 매우 느려지기 때문이다(수 초 단위 지연). main.py 의
lifespan 훅이 서버 기동 시 한 번 미리 호출해 이 캐시를 채워둔다.
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
    """
    Chroma PersistentClient 싱글턴.
    docker-compose 영속 볼륨(chroma_persist_dir)에 데이터를 디스크로 저장하므로,
    컨테이너를 재시작해도 임베딩이 사라지지 않는다.
    """
    global _client
    if _client is None:
        logger.info("Chroma 초기화: dir=%s", settings.chroma_persist_dir)
        _client = chromadb.PersistentClient(
            path=settings.chroma_persist_dir,
            settings=ChromaSettings(anonymized_telemetry=False, allow_reset=False),
        )
    return _client


def _get_embedding_function():
    """
    한국어 임베딩 모델(jhgan/ko-sroberta-multitask) 싱글턴.
    Chroma는 upsert/query 시 이 함수를 자동으로 호출해 텍스트를 벡터로 변환하므로,
    호출하는 쪽(embedding_service.py 등)은 임베딩 자체를 신경 쓸 필요 없이
    문자열만 넘기면 된다.
    """
    global _embedding_fn
    if _embedding_fn is None:
        logger.info("임베딩 모델 로딩: %s", settings.embedding_model)
        _embedding_fn = embedding_functions.SentenceTransformerEmbeddingFunction(
            model_name=settings.embedding_model
        )
    return _embedding_fn


def _get_or_create(name: str):
    """
    컬렉션 캐시 조회 후 없으면 생성.
    metadata={"hnsw:space": "cosine"} 는 벡터 유사도 계산 방식을 코사인 유사도로
    고정하는 설정 — rag_service.py 의 query() 결과 distance 값이 이 방식 기준이다.
    """
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
    """개인 문서 컬렉션 (user_documents). 이력서/자소서/GitHub 분석 텍스트가 저장되는 곳."""
    return _get_or_create(settings.chroma_collection)


def get_cs_collection():
    """CS 전역 지식 컬렉션 (cs_knowledge). user_id 구분 없이 모든 사용자가 공유."""
    return _get_or_create(settings.chroma_cs_collection)


def reset_collection(name: str | None = None) -> None:
    """
    (테스트/관리용) 지정 컬렉션 삭제 후 재생성. name 없으면 개인 문서.
    services/cs_embedding_service.py 의 clear_cs_knowledge()/embed_cs_knowledge(replace=True)
    가 CS 지식을 전량 재구축할 때 이 함수를 사용한다.
    """
    target = name or settings.chroma_collection
    client = _get_client()
    try:
        client.delete_collection(target)
    except Exception:  # noqa: BLE001
        pass  # 컬렉션이 아직 없어서 삭제 실패하는 경우 등 — 재생성만 되면 되므로 무시
    _collections.pop(target, None)
    _get_or_create(target)