"""면접 라우터 - 질문 생성 / 꼬리질문 생성 / 답변 보완"""
import logging

from fastapi import APIRouter, HTTPException

from core.gms_client import GMSError
from schemas.interview import (
    QuestionGenerateRequest,
    QuestionGenerateResponse,
    FollowupRequest,
    FollowupResponse,
    AnswerSupplementRequest,
    AnswerSupplementResponse,
)
from services.question_service import generate_questions
from services.followup_service import generate_followup
from services.answer_service import generate_answer_supplement

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
    반환하지 않는다 — 사용자가 실제로 답변을 제출한 뒤 /answers/supplement 로
    보완 답변(ai_answer)을 별도로 생성한다.
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


@router.post("/answers/supplement", response_model=AnswerSupplementResponse)
async def create_answer_supplement(req: AnswerSupplementRequest):
    """
    사용자 답변을 보완한 AI 답변(ai_answer) 생성.
    Spring Boot 가 사용자 답변을 DB에 저장한 직후, 면접 진행을 막지 않는
    백그라운드 작업으로 비동기 호출하는 것을 전제로 한다.

    [루브릭 아키텍처 재설계 - 신규]
    기존 계획(Phase 3)은 면접 종료 후 전체 대화 기록을 한 번에 처리하는 방식이었지만,
    이번 재설계로 "답변 하나가 제출될 때마다 그때그때 보완하는" 방식으로 바뀌었다.
    req.rubric_results 에 Phase 2(/followup) 채점 결과를 함께 실어 보내면, 어떤
    기준을 놓쳤는지 재채점 없이 바로 알려줄 수 있어 보완 품질이 좋아진다(선택 사항 —
    없으면 rubric 목록만, 그마저 없으면 일반 기준으로 보완).
    생성된 ai_answer 는 ai_interview_questions.ai_answer 컬럼에 저장되어, 면접
    최종 완료 화면에서 (질문, 사용자 답변, ai_answer) 목록으로 노출하는 데 쓰인다.
    "면접 전체에 대한 총평/피드백" 생성은 별도 엔드포인트(아직 미구현,
    docs/AI_작업일지_0722.md 2절 참고) 이 담당한다.
    """
    try:
        return await generate_answer_supplement(req)
    except GMSError as e:
        logger.error("답변 보완 GMS 오류: %s", e)
        raise HTTPException(status_code=502, detail=f"LLM 답변 보완 실패: {e}") from e
    except Exception as e:  # noqa: BLE001
        logger.exception("답변 보완 실패")
        raise HTTPException(status_code=500, detail=f"답변 보완 실패: {e}") from e
