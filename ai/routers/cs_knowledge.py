"""CS 전역 지식 라우터 - gyoogle 등 CS 지식을 Chroma에 저장/삭제"""
import logging

from fastapi import APIRouter, HTTPException

from schemas.cs_knowledge import CSEmbedRequest, CSEmbedResponse, CSDeleteResponse
from services.cs_embedding_service import embed_cs_knowledge, clear_cs_knowledge

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/cs-knowledge", tags=["cs-knowledge"])


@router.post("", response_model=CSEmbedResponse)
def create_cs_knowledge(req: CSEmbedRequest):
    """CS 지식 임베딩 (전역, user_id 없음). replace=true 이면 기존 전체 비우고 재삽입."""
    try:
        embedded, chunks, total = embed_cs_knowledge(req)
    except Exception as e:  # noqa: BLE001
        logger.exception("CS 지식 임베딩 실패")
        raise HTTPException(status_code=500, detail=f"CS 임베딩 실패: {e}") from e

    if embedded == 0:
        raise HTTPException(status_code=400, detail="임베딩할 유효한 CS 지식이 없습니다.")

    return CSEmbedResponse(embedded_count=embedded, chunk_count=chunks, total_in_collection=total)


@router.delete("", response_model=CSDeleteResponse)
def delete_cs_knowledge():
    """CS 지식 컬렉션 전체 삭제 (전량 재구축 전에 사용)."""
    try:
        clear_cs_knowledge()
    except Exception as e:  # noqa: BLE001
        logger.exception("CS 지식 삭제 실패")
        raise HTTPException(status_code=500, detail=f"삭제 실패: {e}") from e
    return CSDeleteResponse(deleted=True, message="CS 지식 전체 삭제 완료")