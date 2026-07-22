"""면접 질문/꼬리질문 관련 요청·응답 스키마"""
from pydantic import BaseModel, Field

from schemas.common import InterviewType, Difficulty


# ────────────────────────────
# 질문 생성 (면접 시작 시)
# ────────────────────────────
class QuestionGenerateRequest(BaseModel):
    user_id: int = Field(..., description="users.id")
    ai_interview_id: int = Field(..., description="ai_interviews.id (BE에서 세션 생성 후 전달)")
    interview_type: InterviewType
    difficulty: Difficulty = Difficulty.NORMAL
    # 직무/기술/포폴/종합 면접에서 사용자가 폼으로 입력한 값
    company_name: str | None = Field(None, description="지원 기업")
    position: str | None = Field(None, description="지원 직무/포지션")
    question_count: int | None = Field(
        None, description="생성할 질문 수 (미지정 시 서버 기본값 10)"
    )


class GeneratedQuestion(BaseModel):
    order: int = Field(..., description="질문 순서 (1부터)")
    question: str
    expected_answer: str = Field(..., description="예상 모범 답안 (ai_interview_questions.ai_answer)")
    topic: str | None = Field(None, description="질문 주제 태그")
    source: str | None = Field(None, description="근거가 된 문서 출처 (resume/github 등)")


class QuestionGenerateResponse(BaseModel):
    ai_interview_id: int
    interview_type: InterviewType
    questions: list[GeneratedQuestion]
    rag_used: bool = Field(..., description="RAG 컨텍스트가 실제로 검색되었는지")


# ────────────────────────────
# 꼬리질문 생성 (답변 수신 시)
# ────────────────────────────
class FollowupRequest(BaseModel):
    user_id: int
    ai_interview_id: int
    parent_question: str = Field(..., description="직전(기존) 질문")
    user_answer: str = Field(..., description="사용자 답변 (STT 텍스트)")
    interview_type: InterviewType
    followup_depth: int = Field(
        0,
        ge=0,
        description="현재까지 이 질문에 나간 꼬리질문 횟수 (0이면 아직 없음)",
    )


class FollowupResponse(BaseModel):
    ai_interview_id: int
    need_followup: bool = Field(..., description="꼬리질문 생성 필요 여부")
    reason: str | None = Field(None, description="판단 근거 (로깅/디버깅용)")
    question: str | None = Field(None, description="생성된 꼬리질문")
    expected_answer: str | None = Field(None, description="꼬리질문 예상 답안")
    followup_depth: int = Field(..., description="이번 응답 반영 후 누적 꼬리질문 횟수")
