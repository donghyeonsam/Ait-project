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
    해당 사용자의 모든 임베딩 삭제(이력서/자소서/GitHub 전부). 삭제 대상 존재 여부와
    무관하게 True.
    호출 시점: routers/embedding.py 의 DELETE 엔드포인트(회원 탈퇴/전체 문서 삭제) 전용.

    [주의] embed_user_documents(replace=True) 는 더 이상 이 함수를 쓰지 않는다
    (2026-07-23 수정) — 문서 1건(예: 자소서 1개) 재분석 시 이 함수를 호출하면
    user_id 로만 필터링해 이력서/다른 자소서/GitHub 등 같은 사용자의 다른 문서까지
    전부 지워버리는 버그가 있었다. 문서 단위 삭제는 delete_document_embedding() 을
    대신 사용한다. 이 함수 자체는 "사용자 전체 삭제"가 맞는 유일한 용도(탈퇴)에서는
    그대로 쓰이므로 삭제/변경하지 않는다.
    """
    collection = get_collection()
    collection.delete(where={"user_id": user_id})
    logger.info("임베딩 삭제 완료: user_id=%s", user_id)
    return True


def delete_document_embedding(user_id: int, doc_type: str, target_id: int) -> None:
    """
    특정 사용자의 특정 문서(user_id+doc_type+target_id) 하나에 해당하는 임베딩
    청크만 삭제.

    [왜 필요한가] delete_user_embeddings(user_id) 는 user_id 만으로 필터링하기 때문에
    "자소서 1개만 재분석"한 경우에도 그 사용자의 이력서/다른 자소서/GitHub 임베딩까지
    전부 지워버리는 문제가 있었다. 재임베딩 시 실제로 지워야 할 대상은 "지금 갱신하려는
    바로 그 문서"뿐이므로, user_id/doc_type/target_id 세 조건을 모두 걸어 삭제 범위를
    문서 단위로 좁힌다. 세 필드 조합은 _make_id() 가 청크 ID를 만들 때 이미 문서
    고유 키로 쓰고 있는 것과 동일하므로, 그 키 기준과 일관되게 삭제 범위를 맞춘 것이다.
    삭제 대상이 없어도(신규 문서 최초 임베딩) 예외 없이 조용히 종료된다.
    """
    collection = get_collection()
    collection.delete(
        where={
            "$and": [
                {"user_id": user_id},
                {"doc_type": doc_type},
                {"target_id": target_id},
            ]
        }
    )
    logger.info(
        "문서 단위 임베딩 삭제: user_id=%s doc_type=%s target_id=%s",
        user_id, doc_type, target_id,
    )


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

    ids: list[str] = []
    documents: list[str] = []
    metadatas: list[dict] = []

    for item in req.items:
        # replace=True(기본값)면 "이 문서(item)"의 기존 임베딩만 지우고 새로 넣는다.
        # (2026-07-23 수정) 과거에는 여기서 delete_user_embeddings(req.user_id) 를
        # 루프 밖에서 한 번 호출했는데, 그러면 user_id 전체가 지워져 이번에 갱신하려는
        # 문서 하나 때문에 같은 사용자의 다른 이력서/자소서/GitHub 임베딩까지 함께
        # 삭제되는 버그가 있었다. 문서 단위 삭제(delete_document_embedding)를 아이템마다
        # 개별 호출하도록 바꿔, "수정된 문서만 지우고 나머지는 그대로 유지"가 되도록 했다.
        # 사실 upsert 만으로도 같은 id(청크 순번까지 동일)는 갱신되지만, 청크 개수가
        # 줄어든 경우(예: 5개 → 3개) 남은 뒤쪽 청크(idx=3,4)가 삭제 없이는 그대로
        # 남아버리므로, upsert 이전에 명시적으로 지워주는 이 삭제 호출이 필요하다.
        if req.replace:
            delete_document_embedding(req.user_id, item.doc_type.value, item.target_id)

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
