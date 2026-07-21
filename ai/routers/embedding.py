"""임베딩 라우터 - 이력서/자소서/깃허브 분석 데이터를 Chroma에 저장/삭제"""
import logging

from fastapi import APIRouter, HTTPException

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
    """
    try:
        embedded, chunks = embed_user_documents(req)
    except Exception as e:  # noqa: BLE001
        logger.exception("임베딩 실패")
        raise HTTPException(status_code=500, detail=f"임베딩 실패: {e}") from e

    if embedded == 0:
        raise HTTPException(status_code=400, detail="임베딩할 유효한 문서가 없습니다.")

    return EmbedResponse(
        user_id=req.user_id,
        embedded_count=embedded,
        chunk_count=chunks,
    )


@router.delete("/{user_id}", response_model=DeleteEmbeddingResponse)
def delete_embeddings(user_id: int):
    """사용자 탈퇴/문서 삭제 시 임베딩 정리."""
    try:
        delete_user_embeddings(user_id)
    except Exception as e:  # noqa: BLE001
        logger.exception("임베딩 삭제 실패")
        raise HTTPException(status_code=500, detail=f"삭제 실패: {e}") from e

    return DeleteEmbeddingResponse(
        user_id=user_id, deleted=True, message="임베딩 삭제 완료"
    )
