"""
임베딩 라우터 - 이력서/자소서/깃허브 분석 데이터를 Chroma에 저장/삭제

[전체 서비스 흐름에서의 위치] 면접 시작보다 먼저 호출되는 "사전 준비" API다.
BE가 이력서/자소서/GitHub 분석을 마칠 때마다 호출해 Chroma에 벡터로 저장해두면,
이후 면접 중 routers/interview.py 의 각 엔드포인트가 services/rag_service.py 를
통해 이 데이터를 검색해 질문/꼬리질문/답변보완의 근거로 사용한다.
"""
import logging

from fastapi import APIRouter, HTTPException

from schemas.analysis_document import AnalysisDocumentError
from schemas.embedding import (
    EmbedRequest,
    EmbedResponse,
    DeleteEmbeddingResponse,
)
from services.embedding_service import (
    embed_user_documents,
    delete_user_embeddings,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/embeddings", tags=["embeddings"])


@router.post("", response_model=EmbedResponse)
def create_embeddings(req: EmbedRequest):
    """
    사용자 분석 문서 임베딩.
    Spring Boot 가 analyses 저장 후 호출 (resume/cover_letter/github).
    실제 청킹+저장 로직은 services/embedding_service.py 에 위임하고, 이 함수는
    HTTP 계층(에러를 상태 코드로 변환)만 담당한다. (SentenceTransformer 호출이
    동기 라이브러리라 async def 가 아닌 일반 def 로 두고, FastAPI가 내부 스레드풀에서
    실행하도록 한다 — 이벤트 루프를 블로킹하지 않기 위함)
    """
    try:
        embedded, chunks = embed_user_documents(req)
    except AnalysisDocumentError as e:
        # [구조화 분석 문서 지원 - 신규] content가 새 구조화 포맷인 것은 확실한데
        # (embedding_documents 키가 있음) 그 구조 자체가 명백히 손상된 경우
        # (예: embedding_documents가 리스트가 아님)만 여기로 온다. 애매한 파싱
        # 실패는 embed_user_documents() 내부에서 조용히 평문 청킹으로 fallback하므로
        # 여기까지 오지 않는다 — 이 경우는 "클라이언트 요청 자체가 잘못됨"이 명확하므로
        # 500이 아니라 400으로 구분해서 알린다.
        logger.warning("구조화 분석 문서 파싱 실패: %s", e)
        raise HTTPException(status_code=400, detail=f"분석 문서 형식 오류: {e}") from e
    except Exception as e:  # noqa: BLE001
        logger.exception("임베딩 실패")
        raise HTTPException(status_code=500, detail=f"임베딩 실패: {e}") from e

    # embed_user_documents 가 (0, 0) 을 반환하는 경우 = 모든 item.content 가 빈 문자열이었던
    # 경우 — 클라이언트 요청 자체가 잘못됐다고 보고 400으로 명확히 알린다(500과 구분).
    if embedded == 0:
        raise HTTPException(status_code=400, detail="임베딩할 유효한 문서가 없습니다.")

    return EmbedResponse(
        user_id=req.user_id,
        embedded_count=embedded,
        chunk_count=chunks,
    )


@router.delete("/{user_id}", response_model=DeleteEmbeddingResponse)
def delete_embeddings(user_id: int):
    """
    사용자 탈퇴/문서 삭제 시 임베딩 정리.
    삭제 대상이 없어도 실패로 취급하지 않는다(멱등성 — 여러 번 호출해도 안전).
    """
    try:
        delete_user_embeddings(user_id)
    except Exception as e:  # noqa: BLE001
        logger.exception("임베딩 삭제 실패")
        raise HTTPException(status_code=500, detail=f"삭제 실패: {e}") from e

    return DeleteEmbeddingResponse(
        user_id=user_id, deleted=True, message="임베딩 삭제 완료"
    )
