"""
임베딩 서비스
- 이력서/자소서/깃허브 분석 텍스트를 청크로 분할 → Chroma 저장
- user_id / doc_type / target_id 를 metadata 로 부착 (RAG 필터링 근거)

[전체 서비스 흐름에서의 역할]
면접이 시작되기 훨씬 이전, BE가 이력서/자소서/GitHub 분석(analyses)을 저장할 때마다
호출되는(routers/embedding.py) 준비 단계다. 여기서 Chroma에 저장해둔 벡터가 나중에
면접 중 services/rag_service.py 의 retrieve_context() 로 검색되어 질문/꼬리질문/
답변보완 프롬프트의 근거 자료로 쓰인다 — 즉 이 서비스가 먼저 잘 돌아가야 RAG 전체가
의미를 갖는다.
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

    [왜 청킹이 필요한가] 이력서/자소서 전체를 하나의 벡터로 임베딩하면 문서가 다루는
    여러 주제(예: 프로젝트 A, 프로젝트 B, 자기소개)가 뭉개져 검색 정확도가 떨어진다.
    문단 단위로 잘라서 저장하면 RAG 검색 시 "이 질문과 가장 관련 있는 문단"만 정확히
    골라낼 수 있다. overlap(80자)을 두는 이유는 문단 강제 분할 시 경계에서 문맥이
    끊기는 것을 완화하기 위함이다.

    services/cs_embedding_service.py 도 이 함수를 그대로 import 해서 재사용한다
    (CS 지식도 동일한 청킹 정책을 따름 — 청킹 로직 중복 방지).
    """
    text = text.strip()
    if not text:
        return []

    # 1차: 문단 단위로 뭉치기 (size 이내에서는 여러 문단을 하나의 청크로 합침)
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    chunks: list[str] = []
    buf = ""
    for p in paragraphs:
        if len(buf) + len(p) + 2 <= size:
            buf = f"{buf}\n\n{p}" if buf else p
        else:
            if buf:
                chunks.append(buf)
            # 문단 자체가 size 보다 크면(예: 개행 없이 긴 문단) 강제 슬라이딩 윈도우로 분할
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
    """
    해당 사용자의 모든 임베딩 삭제. 삭제 대상 존재 여부와 무관하게 True.
    호출 시점: ① embed_user_documents(replace=True) 내부에서 재임베딩 전 정리용,
    ② routers/embedding.py 의 DELETE 엔드포인트에서 사용자 탈퇴/문서 삭제 시.
    """
    collection = get_collection()
    collection.delete(where={"user_id": user_id})
    logger.info("임베딩 삭제 완료: user_id=%s", user_id)
    return True


def _make_id(user_id: int, item: EmbeddingItem, idx: int) -> str:
    """
    청크 고유 ID 생성 규칙: u{user_id}:{doc_type}:{target_id}:{청크 순번}.
    동일한 문서(같은 user_id+doc_type+target_id)를 재분석해 다시 임베딩 요청이 오면
    같은 ID로 upsert되어 자동 갱신된다 — 별도의 "기존 항목 찾아서 삭제" 로직 불필요.
    """
    return f"u{user_id}:{item.doc_type.value}:{item.target_id}:{idx}"


def embed_user_documents(req: EmbedRequest) -> tuple[int, int]:
    """
    사용자 문서(이력서/자소서/GitHub) 임베딩.
    BE가 analyses 테이블에 분석 결과를 저장한 직후 호출하는 것을 전제로 한다.

    Returns:
        (embedded_items, total_chunks)
    """
    collection = get_collection()

    # replace=True(기본값)면 기존 임베딩을 지우고 새로 넣는다 — 사용자가 이력서를
    # 재분석했을 때 예전 버전 문서가 검색 결과에 함께 섞여 나오는 것을 방지.
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
            # 이 metadata 가 services/rag_service.py 의 _build_where() 필터(user_id,
            # doc_type)와 format_context() 의 출처 표시(title)에 그대로 쓰인다.
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

    # upsert: 동일 id 재삽입 시 갱신 (delete 후 insert 가 아니라 원자적으로 갱신됨)
    collection.upsert(ids=ids, documents=documents, metadatas=metadatas)
    embedded_items = len({(m["doc_type"], m["target_id"]) for m in metadatas})
    logger.info(
        "임베딩 저장: user=%s items=%s chunks=%s",
        req.user_id, embedded_items, len(ids),
    )
    return (embedded_items, len(ids))
