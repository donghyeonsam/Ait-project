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

[구조화 분석 문서 지원 - 신규, ai/docs/AI_작업일지_0724.md 2절 참고]
기존에는 `EmbeddingItem.content`가 단순 평문 텍스트였고, `_split_text()`로 500자
슬라이딩 윈도우 청킹을 해서 저장했다. 이제 BE가 별도의 "분석 LLM"으로 미리 의미
단위 청킹 + 메타데이터(역량/면접 질문 주제/키워드/불확실한 점 등)를 붙인 구조화된
JSON을 `content`(여전히 str 타입)에 실어 보낼 수도 있다. 두 포맷을 다음처럼 자동
판별해 둘 다 지원한다(하위 호환 — BE가 포맷 버전을 명시적으로 알려주기로 확정되지
않았으므로, 내용 기반 자동 판별이 가장 안전하다):
  - `content`가 `json.loads()`로 파싱되고, 그 결과 dict에 `"embedding_documents"`
    키가 있으면 → 새 구조화 포맷(`_build_structured_chunks()`).
  - 파싱 실패하거나 그 키가 없으면 → 기존 평문으로 보고 `_split_text()` 슬라이딩
    윈도우 청킹 경로(`_build_plain_text_chunks()`)를 그대로 탄다.
"""
import json
import logging

from pydantic import ValidationError

from db.chroma import get_collection
from schemas.analysis_document import (
    AnalysisDocument,
    AnalysisDocumentError,
    EmbeddingDocumentChunk,
)
from schemas.embedding import DeleteDocumentsRequest, EmbedRequest, EmbeddingItem

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


def delete_document_embeddings(req: DeleteDocumentsRequest) -> int:
    """
    문서 여러 건의 임베딩을 한 번에 삭제 (자소서/GitHub 레포 삭제 시 BE가 호출).

    [문서 단위 삭제 API 신설 - 신규, 2026-07-31] 기존 delete_document_embedding()을
    items 개수만큼 그대로 반복 호출한다. Chroma where 절을 "$or"로 묶어 한 번에
    처리하는 최적화는 하지 않았다 — chromadb 0.5.5에서 "$or" 안에 "$and"가 중첩
    가능한지 검증되지 않았고, 이 루프 방식은 embed_user_documents()가 이미 쓰고
    있는 검증된 패턴이기 때문이다. 삭제 대상이 없는 항목이 섞여 있어도(이미 삭제된
    문서를 재요청 등) 예외 없이 조용히 넘어간다 — delete_document_embedding()
    자체가 멱등이다.

    Returns:
        요청받은 items 개수 (실제 삭제된 청크 수는 Chroma collection.delete()가
        반환하지 않아 알 수 없다).
    """
    for item in req.items:
        delete_document_embedding(req.user_id, item.doc_type.value, item.target_id)
    return len(req.items)


def _make_id(user_id: int, item: EmbeddingItem, idx: int) -> str:
    """
    청크 고유 ID 생성 규칙: u{user_id}:{doc_type}:{target_id}:{청크 순번}.
    동일한 문서(같은 user_id+doc_type+target_id)를 재분석해 다시 임베딩 요청이 오면
    같은 ID로 upsert되어 자동 갱신된다 — 별도의 "기존 항목 찾아서 삭제" 로직 불필요.

    [구조화 분석 문서 지원 - 신규] 새 구조화 포맷 청크는 이 함수를 쓰지 않는다 —
    BE가 이미 `chunk_id`를 부여해서 보내주므로 순번 기반 id 대신
    `_make_structured_id()`(BE의 chunk_id + user_id prefix)를 사용한다.
    """
    return f"u{user_id}:{item.doc_type.value}:{item.target_id}:{idx}"


def _make_structured_id(user_id: int, chunk_id: str) -> str:
    """
    구조화 포맷 청크의 Chroma id. BE가 준 chunk_id를 그대로 쓰되, 사용자 간 id
    충돌을 막기 위해 user_id를 prefix로 붙인다(예: chunk_id="resume_project_1",
    user_id=42 → "u42:resume_project_1"). `_make_id()`와 이름 규칙이 다른 이유는
    청크 순번이 아니라 BE가 부여한 안정적인 청크 식별자를 그대로 신뢰하기 때문이다.
    """
    return f"u{user_id}:{chunk_id}"


def _try_parse_analysis_document(content: str) -> AnalysisDocument | None:
    """
    `content`가 새 구조화 분석 문서 포맷인지 판별해 파싱한다.

    판별 기준: json.loads()가 성공하고, 결과가 dict이며 "embedding_documents" 키가
    있으면 새 포맷으로 간주한다. 파싱 실패/구조 아님(둘 다 "이건 새 포맷이 아니다"는
    뜻) → None을 반환해 호출부가 기존 평문 청킹 경로로 조용히 fallback하게 한다.
    다만 "embedding_documents" 키가 있는데 그 값이 리스트가 아닌 경우는 "새 포맷인
    것은 확실한데 구조 자체가 깨진" 명백한 손상이므로, 조용히 넘어가지 않고
    AnalysisDocumentError를 던져 routers/embedding.py 가 400으로 응답하게 한다.

    코드펜스(```json ... ```) 방어: BE의 분석 LLM 출력도 결국 LLM 출력이라
    core/gms_client.py._safe_json_parse() 가 방어하는 것과 같은 문제(코드펜스로
    감싸서 응답)가 생길 수 있다. 다만 도메인이 달라(BE 분석 결과 vs 우리가 직접
    호출하는 GMS 응답) 그 함수를 그대로 재사용하지 않고 여기 최소한만 반복한다.
    """
    text = content.strip()
    if not text:
        return None

    if text.startswith("```"):
        parts = text.split("```", 2)
        text = parts[1] if len(parts) >= 2 else text
        if text.lstrip().startswith("json"):
            text = text.lstrip()[4:]
        text = text.strip()

    try:
        raw = json.loads(text)
    except json.JSONDecodeError:
        return None

    if not isinstance(raw, dict) or "embedding_documents" not in raw:
        return None

    if not isinstance(raw["embedding_documents"], list):
        raise AnalysisDocumentError(
            "embedding_documents가 리스트가 아님"
            f"(실제 타입={type(raw['embedding_documents']).__name__}) - 구조화 분석 문서 포맷이 손상됨"
        )

    return AnalysisDocument.model_validate(raw)


def _build_chunk_metadata(user_id: int, item: EmbeddingItem, chunk: EmbeddingDocumentChunk) -> dict:
    """
    구조화 포맷 청크 1개의 Chroma metadata를 만든다.

    [평탄화가 필요한 이유] Chroma metadata는 str/int/float/bool 같은 flat 값만
    허용하고 list/dict 같은 중첩 구조는 저장할 수 없다(그대로 넣으면 예외 발생).
    그래서:
      - 문자열 리스트(competencies/keywords/uncertainties): 콤마로 join해서
        하나의 문자열로 저장한다(예: "BACKEND_DEVELOPMENT,DATABASE"). 개별 항목에
        콤마가 섞여 있을 가능성은 낮다고 보고(역량/키워드 특성상 짧은 단어 단위) 별도
        이스케이프는 하지 않았다 — 완벽한 왕복 대신 표시/검색 편의를 우선했다.
      - 리스트-of-객체/중첩 객체(question_topics, details): json.dumps(...,
        ensure_ascii=False)로 문자열화해서 저장하고, 사용하는 쪽
        (services/rag_service.py)에서 json.loads()로 복원한다.
    """
    return {
        # 아래 4개는 기존 평문 청크와 동일한 키 이름/의미를 유지한다 — rag_service.py의
        # _build_where() 필터(user_id/doc_type/target_id)와 format_context()의 출처
        # 표시(title)가 새 포맷/기존 포맷 구분 없이 그대로 동작해야 하기 때문이다.
        "user_id": user_id,
        "doc_type": item.doc_type.value,
        "target_id": item.target_id,
        "title": item.title or "",
        # 아래부터는 구조화 포맷 전용 신규 메타데이터.
        "chunk_id": chunk.chunk_id,
        "parent_id": chunk.parent_id or "",
        "experience_id": chunk.experience_id or "",
        "chunk_type": chunk.chunk_type,
        # 청크 자체의 제목(예: 프로젝트명)은 위 "title"(문서 전체 제목/레포명 등)과
        # 의미가 달라 키 이름을 구분했다 — 하나의 dict에 같은 키를 두 번 못 쓰기도 하고,
        # format_context() 등에서 "문서 제목"과 "청크 제목"을 구분해 쓸 수 있게 한다.
        "chunk_title": chunk.title or "",
        "summary": chunk.summary or "",
        "competencies": ",".join(chunk.competencies),
        "keywords": ",".join(chunk.keywords),
        "uncertainties": ",".join(chunk.uncertainties),
        "question_topics": json.dumps(chunk.question_topics, ensure_ascii=False),
        "details": json.dumps(chunk.details, ensure_ascii=False),
    }


def _build_structured_chunks(
    user_id: int, item: EmbeddingItem, document: AnalysisDocument
) -> tuple[list[str], list[str], list[dict]]:
    """
    새 구조화 포맷(document.embedding_documents)에서 Chroma upsert용
    (ids, documents, metadatas) 리스트를 만든다.

    청크 단위 방어적 파싱: document.embedding_documents는 원시 dict 리스트로
    보관되어 있다(schemas/analysis_document.py의 AnalysisDocument 참고 — 여기서
    이미 EmbeddingDocumentChunk로 엄격 검증하지 않는 이유가 설명돼 있음). 청크
    하나가 스펙과 안 맞아 EmbeddingDocumentChunk 검증에 실패해도 그 청크만
    건너뛰고, 문서의 나머지 청크는 정상적으로 임베딩된다.
    """
    ids: list[str] = []
    documents: list[str] = []
    metadatas: list[dict] = []

    for raw_chunk in document.embedding_documents:
        try:
            chunk = EmbeddingDocumentChunk.model_validate(raw_chunk)
        except ValidationError as e:
            logger.warning(
                "구조화 청크 파싱 실패(스킵): user=%s type=%s target=%s chunk_id=%s error=%s",
                user_id, item.doc_type, item.target_id,
                raw_chunk.get("chunk_id") if isinstance(raw_chunk, dict) else None, e,
            )
            continue

        if not chunk.embedding_text.strip():
            logger.warning(
                "embedding_text 없는 청크 스킵: user=%s chunk_id=%s", user_id, chunk.chunk_id
            )
            continue

        ids.append(_make_structured_id(user_id, chunk.chunk_id))
        documents.append(chunk.embedding_text)
        metadatas.append(_build_chunk_metadata(user_id, item, chunk))

    # [document_summary/cross_document_insights 를 의도적으로 임베딩하지 않음]
    # 이 둘은 청크 단위가 아니라 "문서 전체" 또는 "문서 간" 요약이라, 이걸 RAG에서
    # 어떻게(예: 별도 컬렉션? 항상 프롬프트에 포함?) 활용할지 아직 제품적으로 결정되지
    # 않았다. 그래서 이번 작업 범위에서는 파싱만 해두고(구조 검증 겸 향후 확장 대비),
    # 검색 가능한 별도 Chroma 문서로 저장하지 않는다 — 대신 파싱됐다는 사실만
    # 로그로 남겨 향후 활용 논의 시 실제로 데이터가 오고 있었는지 확인할 수 있게 한다.
    if isinstance(document.document_summary, dict):
        logger.info(
            "문서 요약 파싱됨(향후 활용 방안 미정 - 의도적으로 임베딩하지 않음): "
            "user=%s type=%s target=%s company=%s role=%s",
            user_id, item.doc_type, item.target_id,
            document.document_summary.get("target_company"),
            document.document_summary.get("target_role"),
        )

    return ids, documents, metadatas


def _build_plain_text_chunks(user_id: int, item: EmbeddingItem) -> tuple[list[str], list[str], list[dict]]:
    """
    기존 평문 `content`를 `_split_text()`로 슬라이딩 윈도우 청킹해 Chroma upsert용
    (ids, documents, metadatas) 리스트를 만든다. `embed_user_documents()`에 인라인으로
    있던 로직을 그대로 옮긴 것으로, 동작은 전혀 바뀌지 않았다(구조화 포맷 분기 추가를
    위해 함수로만 추출).
    """
    ids: list[str] = []
    documents: list[str] = []
    metadatas: list[dict] = []

    chunks = _split_text(item.content)
    for idx, chunk in enumerate(chunks):
        ids.append(_make_id(user_id, item, idx))
        documents.append(chunk)
        # 이 metadata 가 services/rag_service.py 의 _build_where() 필터(user_id,
        # doc_type)와 format_context() 의 출처 표시(title)에 그대로 쓰인다.
        metadatas.append(
            {
                "user_id": user_id,
                "doc_type": item.doc_type.value,
                "target_id": item.target_id,
                "title": item.title or "",
                "chunk_index": idx,
            }
        )
    return ids, documents, metadatas


def embed_user_documents(req: EmbedRequest) -> tuple[int, int]:
    """
    사용자 문서(이력서/자소서/GitHub) 임베딩.
    BE가 analyses 테이블에 분석 결과를 저장한 직후 호출하는 것을 전제로 한다.

    [구조화 분석 문서 지원 - 신규] item.content를 _try_parse_analysis_document() 로
    먼저 판별한다 — 새 구조화 포맷이면 _build_structured_chunks(), 아니면(기존 평문)
    _build_plain_text_chunks()를 탄다. 두 경로 모두 동일한 (ids, documents,
    metadatas) 형태를 반환하므로 이후 upsert/집계 로직은 포맷 구분 없이 공통이다.

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
        # [구조화 분석 문서 지원] 이 삭제 호출은 새 포맷/기존 포맷 구분 없이 동일하게
        # 필요하다 — 삭제 범위는 user_id/doc_type/target_id 세 조건으로만 잡고 있어서
        # (청크 id가 순번이든 BE의 chunk_id든 무관), 재분석 시 청크 구성이 통째로
        # 바뀌어도(예: 평문 5청크 → 구조화 8청크) 이전 청크가 유령으로 남지 않는다.
        if req.replace:
            delete_document_embedding(req.user_id, item.doc_type.value, item.target_id)

        analysis_document = _try_parse_analysis_document(item.content)
        if analysis_document is not None:
            item_ids, item_docs, item_metas = _build_structured_chunks(
                req.user_id, item, analysis_document
            )
        else:
            item_ids, item_docs, item_metas = _build_plain_text_chunks(req.user_id, item)

        if not item_ids:
            logger.warning(
                "빈 문서 스킵: user=%s type=%s target=%s",
                req.user_id, item.doc_type, item.target_id,
            )
            continue

        ids.extend(item_ids)
        documents.extend(item_docs)
        metadatas.extend(item_metas)

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
