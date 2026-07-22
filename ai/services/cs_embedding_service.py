"""
CS 지식 임베딩 서비스
- category/concept/content 형식의 CS 지식을 cs_knowledge 컬렉션에 저장
- 개인 문서와 달리 user_id 가 없는 전역 데이터
- 청킹 로직은 개인 문서용(embedding_service)과 공유

[전체 서비스 흐름에서의 역할]
CS/종합 면접에서 사용할 "일반 CS 지식" 근거 데이터를 준비하는 단계다.
개인 문서(embedding_service.py)와 달리 특정 사용자에 종속되지 않는 전역 데이터라서
서버 최초 기동 시 한 번 시딩해두면 모든 사용자가 공유해서 쓴다(main.py의
seed_cs_knowledge_if_empty() 호출 참고). 이후 services/question_service.py 가 CS/
종합 면접 질문을 만들 때 services/rag_service.py 의 retrieve_cs_knowledge() 로 이
데이터를 검색해 근거로 사용한다.
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
    category+concept 조합을 MD5 해시해 ID에 넣는 이유는, concept 문자열에 Chroma ID로
    쓰기 부적절한 문자(공백/특수문자)가 섞여 있을 수 있어 안전한 고정 길이 문자열로
    정규화하기 위함이다.
    """
    key = f"{item.category}:{item.concept}"
    digest = hashlib.md5(key.encode("utf-8")).hexdigest()[:12]
    return f"cs:{digest}:{idx}"


def clear_cs_knowledge() -> bool:
    """CS 지식 컬렉션 전체 비우기 (전량 재구축용). routers/cs_knowledge.py 의 DELETE 가 호출."""
    reset_collection(settings.chroma_cs_collection)
    logger.info("CS 지식 컬렉션 초기화 완료")
    return True


def embed_cs_knowledge(req: CSEmbedRequest) -> tuple[int, int, int]:
    """
    CS 지식 임베딩. gyoogle 등 외부 CS 지식 레포를 category/concept/content 형태로
    가공한 뒤 배치로 받아 저장한다(routers/cs_knowledge.py 경유, 또는 서버 기동 시
    seed_cs_knowledge_if_empty() 경유).

    Returns:
        (embedded_concepts, total_chunks, total_in_collection)
    """
    # replace=True 면 "전량 재구축" 의도이므로 먼저 컬렉션을 비운다.
    # (기존 개념 중 일부만 갱신하고 싶다면 replace=False 로 upsert만 수행)
    if req.replace:
        clear_cs_knowledge()

    collection = get_cs_collection()

    ids: list[str] = []
    documents: list[str] = []
    metadatas: list[dict] = []

    for item in req.items:
        # concept(개념명)을 본문 앞에 붙여 검색 정확도 향상 — 사용자가 "TCP 3-way handshake"로
        # 검색했을 때 본문 중간에만 등장하는 경우보다 훨씬 잘 매칭된다.
        full_text = f"[{item.category}] {item.concept}\n{item.content}"
        chunks = _split_text(full_text)  # embedding_service.py 의 청킹 로직 재사용
        if not chunks:
            logger.warning("빈 CS 문서 스킵: %s / %s", item.category, item.concept)
            continue
        for idx, chunk in enumerate(chunks):
            ids.append(_make_cs_id(item, idx))
            documents.append(chunk)
            # 이 metadata 가 services/rag_service.py 의 retrieve_cs_knowledge() /
            # format_context() 에서 "[CS지식 - 운영체제]" 같은 출처 표시에 쓰인다.
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
    서버 기동 시 자동 시딩 (main.py 의 lifespan 훅에서 호출).
    - CS 컬렉션에 이미 데이터가 있으면 아무것도 안 함 (재임베딩 방지 — 매번 서버 재시작할
      때마다 다시 임베딩하면 시간 낭비이자 불필요한 upsert 부하)
    - 비어있고 시드 JSON 파일(git 에 커밋된 data/cs_knowledge.json)이 있으면 임베딩
      → 팀원이 새로 클론해서 처음 서버를 띄워도 별도 API 호출 없이 CS 지식이 자동으로 채워짐

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