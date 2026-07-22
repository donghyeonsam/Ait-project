"""면접 라우터 - 질문 생성 / 꼬리질문 생성"""
import logging

from fastapi import APIRouter, HTTPException

from core.gms_client import GMSError
from schemas.interview import (
    QuestionGenerateRequest,
    QuestionGenerateResponse,
    FollowupRequest,
    FollowupResponse,
)
from services.question_service import generate_questions
from services.followup_service import generate_followup

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/interviews", tags=["interviews"])


@router.post("/questions", response_model=QuestionGenerateResponse)
async def create_questions(req: QuestionGenerateRequest):
    """
    면접 시작 시 질문 생성 (RAG + GMS LLM).
    Spring Boot 가 ai_interviews 세션 생성 후 호출.
    """
    try:
        return await generate_questions(req)
    except GMSError as e:
        logger.error("질문 생성 GMS 오류: %s", e)
        raise HTTPException(status_code=502, detail=f"LLM 질문 생성 실패: {e}") from e
    except Exception as e:  # noqa: BLE001
        logger.exception("질문 생성 실패")
        raise HTTPException(status_code=500, detail=f"질문 생성 실패: {e}") from e


@router.post("/followup", response_model=FollowupResponse)
async def create_followup(req: FollowupRequest):
    """
    사용자 답변 기반 꼬리질문 생성 (질문당 최대 2회).
    Spring Boot 가 답변 저장 후 호출.
    """
    try:
        return await generate_followup(req)
    except GMSError as e:
        logger.error("꼬리질문 GMS 오류: %s", e)
        raise HTTPException(status_code=502, detail=f"LLM 꼬리질문 실패: {e}") from e
    except Exception as e:  # noqa: BLE001
        logger.exception("꼬리질문 생성 실패")
        raise HTTPException(status_code=500, detail=f"꼬리질문 생성 실패: {e}") from e
