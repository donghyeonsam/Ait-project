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

    [루브릭 아키텍처 전환 - Phase 1]
    기존에는 질문 10개만 반환했지만, 이제는 질문 5개(기본값) + 질문마다 rubric
    (채점 기준 2~3개, GeneratedQuestion.rubric)을 함께 반환한다.
    BE는 이 rubric을 질문과 묶어 세션 상태(Redis 등)에 저장해두었다가,
    Phase 2(/followup)에서 사용자 답변과 함께 넘겨주는 것을 전제로 한다.
    [루브릭 아키텍처 재설계] expected_answer(사전 예상 답안) 필드는 더 이상
    반환하지 않는다. 답변 분석/보완/평가는 Spring Boot(BE)가 담당한다
    (2026-07-31, docs/AI_개발일지_0731.md 참고).
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
    사용자 답변 기반 rubric narrowing + 동적 꼬리질문 생성.
    Spring Boot 가 답변 저장 후 호출.

    [꼬리질문 narrowing 전환 - 2026-07-26, Breaking Change]
    요청/응답 형식이 flat 구조에서 중첩 객체 구조로 바뀌었다(schemas/interview.py의
    FollowupRequest/FollowupResponse 주변 주석 참고).

    - 요청의 req.question.rubric은 "이 질문에 대해 아직 통과하지 못한 채점 기준"이다.
      호출측은 직전 턴 응답의 next_question을 가공 없이 그대로 이번 요청의 question에
      되돌려 보내야 한다 — rubric을 임의로 추가/복원하면 통과한 기준이 되살아나
      진동(같은 rubric이 pass/fail을 반복하는 문제)이 재발한다.
    - is_pass=true  → BE는 다음 기본 질문으로 진행.
    - is_pass=false → next_question 을 다음 차례로 제시.
    - is_pass=true는 "모든 rubric을 통과함"과 "꼬리질문 횟수 상한(depth) 도달로 강제
      종료함" 두 경우를 모두 포함한다. 이 둘을 구분해야 한다면(예: 리포트 표시) 요청에
      실려온 question.depth 값으로 판단해야 한다 — 응답 자체에는 별도 플래그가 없다.
    """
    try:
        return await generate_followup(req)
    except GMSError as e:
        logger.error("꼬리질문 GMS 오류: %s", e)
        raise HTTPException(status_code=502, detail=f"LLM 꼬리질문 실패: {e}") from e
    except Exception as e:  # noqa: BLE001
        logger.exception("꼬리질문 생성 실패")
        raise HTTPException(status_code=500, detail=f"꼬리질문 생성 실패: {e}") from e
