"""
CS 전역 지식 라우터 - gyoogle 등 CS 지식을 Chroma에 저장/삭제

[전체 서비스 흐름에서의 위치] 서버 기동 시 main.py 가 자동으로 시드 데이터를 채우기
때문에(services/cs_embedding_service.py 의 seed_cs_knowledge_if_empty()), 평상시
운영 중에는 이 라우터를 호출할 일이 거의 없다. CS 지식 원본(gyoogle 레포 등)이
갱신되어 "전량 재구축"이 필요할 때만 운영자/BE가 수동으로 호출하는 관리용 API다.
"""
import logging

from fastapi import APIRouter, HTTPException

from schemas.cs_knowledge import CSEmbedRequest, CSEmbedResponse, CSDeleteResponse
from services.cs_embedding_service import embed_cs_knowledge, clear_cs_knowledge

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/cs-knowledge", tags=["cs-knowledge"])


@router.post("", response_model=CSEmbedResponse)
def create_cs_knowledge(req: CSEmbedRequest):
    """
    CS 지식 임베딩 (전역, user_id 없음). replace=true 이면 기존 전체 비우고 재삽입.
    개인 문서 임베딩(routers/embedding.py)과 달리 user_id 파라미터가 없는 이유는
    CS 지식이 모든 사용자가 공유하는 전역 데이터이기 때문(schemas/cs_knowledge.py 참고).
    """
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
    """
    CS 지식 컬렉션 전체 삭제 (전량 재구축 전에 사용).
    개인 문서 삭제(DELETE /embeddings/{user_id})와 달리 user_id 파라미터가 없다 —
    CS 지식은 전역 데이터라 "누구의 데이터"가 아니라 컬렉션 전체 단위로만 다룬다.
    """
    try:
        clear_cs_knowledge()
    except Exception as e:  # noqa: BLE001
        logger.exception("CS 지식 삭제 실패")
        raise HTTPException(status_code=500, detail=f"삭제 실패: {e}") from e
    return CSDeleteResponse(deleted=True, message="CS 지식 전체 삭제 완료")