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
        # [루브릭 아키텍처 전환] 기본 질문 수를 10 → 5로 축소.
        # 대신 질문마다 rubric(채점 기준)을 함께 받아, 면접 중 답변 품질에 따라
        # 부족한 부분만 동적 꼬리질문으로 파고드는 방식(Phase 2, 별도 작업)으로 깊이를 보완한다.
        None, description="생성할 질문 수 (미지정 시 서버 기본값 5)"
    )


class GeneratedQuestion(BaseModel):
    order: int = Field(..., description="질문 순서 (1부터)")
    question: str
    # [루브릭 아키텍처 재설계] 기존 expected_answer(질문 생성 시점에 미리 써두는 범용
    # 모범 답안) 필드를 완전히 제거했다. ai_interview_questions.ai_answer 컬럼은 더 이상
    # "질문 생성 시 미리 만든 답"이 아니라 "사용자가 실제로 답변을 제출한 뒤, 그 답변을
    # AI가 보완한 결과"를 저장하는 용도로 재정의되었다. 즉 답이 존재하기 전에는 값이
    # 없고, 사용자가 답변해야만(그리고 그 답변을 근거로) 채워진다.
    # → 실제 생성 시점/방식은 schemas.interview.AnswerSupplementRequest/Response,
    #   services/answer_service.py 참고 (사용자 답변 제출 후 BE가 비동기로 호출).
    #
    # [루브릭 아키텍처 전환] 이 질문에 대한 답변이 "합격"으로 인정되려면 반드시
    # 언급/충족해야 하는 핵심 채점 기준 목록(2~3개, config.rubric_min_count~max_count).
    # services/followup_service.py(Phase 2)에서 사용자 답변과 이 rubric을 함께 LLM에 넘겨
    # 항목별 pass/fail을 판정하고, 실패한 기준을 겨냥한 꼬리질문을 생성하는 데 쓰인다.
    # BE는 이 리스트를 질문과 함께 세션 상태(Redis 등)에 저장해두면 된다.
    rubric: list[str] = Field(
        default_factory=list,
        description="답변이 충족해야 할 핵심 채점 기준 목록 (질문당 2~3개)",
    )
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
# [루브릭 아키텍처 전환 - Phase 2]
# 기존에는 "꼬리질문이 필요한가?"를 LLM이 애매하게(need_followup bool) 판단했지만,
# 이제는 Phase 1에서 질문과 함께 만들어둔 rubric(채점 기준)을 기준으로 답변을 항목별로
# 채점하고, 통과하지 못한 기준이 있을 때만 그 부분을 겨냥한 꼬리질문을 생성한다.
# 따라서 "따로 종료 여부를 LLM에게 물어보는" 방식에서 "rubric 통과 여부로 자연스럽게
# 종료를 판단하는" 방식으로 바뀐다. need_followup 플래그는 all_passed 의 반대 개념으로
# 대체되었다.
class RubricResult(BaseModel):
    """rubric(채점 기준) 항목 1개에 대한 채점 결과."""

    criterion: str = Field(..., description="채점 기준 원문 (GeneratedQuestion.rubric 의 항목)")
    passed: bool | None = Field(
        ...,
        description=(
            "답변이 이 기준을 충족했는지 여부. "
            "None 은 '채점하지 않음'을 의미하며, 꼬리질문 횟수 상한 도달로 "
            "LLM 호출 자체를 생략(capped=True)한 경우에만 발생한다."
        ),
    )
    reason: str | None = Field(None, description="판정 근거 한 문장 (로깅/디버깅용)")


class FollowupRequest(BaseModel):
    user_id: int
    ai_interview_id: int
    parent_question: str = Field(..., description="직전(기존) 질문")
    # [루브릭 아키텍처 전환] Phase 1 에서 생성해 BE가 세션 상태(Redis 등)에 저장해둔
    # 해당 질문의 rubric 을 그대로 되돌려받아 채점 기준으로 사용한다.
    # 꼬리질문에 대한 재꼬리질문인 경우, BE 는 "아직 통과하지 못한 rubric 항목"만
    # 추려서 넘겨주는 것을 전제로 한다 (이미 통과한 기준을 다시 채점할 필요는 없음).
    rubric: list[str] = Field(..., min_length=1, description="채점 대상 rubric 목록")
    user_answer: str = Field(..., description="사용자 답변 (STT 텍스트)")
    interview_type: InterviewType
    # [루브릭 아키텍처 전환] 채점 로직 자체는 더 이상 이 값에 의존하지 않지만,
    # rubric이 계속 통과되지 않아 꼬리질문이 무한정 이어지는 것을 막기 위한
    # 안전장치(상한 체크)로만 사용한다. 주 종료 조건은 all_passed 이다.
    followup_depth: int = Field(
        0,
        ge=0,
        description="현재까지 이 질문에 나간 꼬리질문 횟수 (안전장치용 상한 체크 전용)",
    )


class FollowupResponse(BaseModel):
    ai_interview_id: int
    # [루브릭 아키텍처 전환] rubric 항목별 채점 결과. capped=True 인 경우
    # (아래 참고) 실제 채점을 하지 않으므로 빈 리스트로 반환된다.
    rubric_results: list[RubricResult] = Field(default_factory=list)
    all_passed: bool = Field(
        ...,
        description="rubric 항목이 모두 통과됐는지 (true 면 BE는 다음 기본 질문으로 진행)",
    )
    followup_question: str | None = Field(
        None, description="통과 못한 rubric을 겨냥한 꼬리질문 (all_passed=true 면 null)"
    )
    # [루브릭 아키텍처 재설계] 기존 expected_answer(꼬리질문의 예상 모범 답안 — 아직
    # 사용자가 답하지도 않은 시점에 미리 만들어두는 값) 필드를 제거했다. GeneratedQuestion
    # 과 동일한 이유: "질문에 대한 사전 예상 답안"이라는 개념 자체를 없애고, 사용자가
    # 이 꼬리질문에 실제로 답변을 제출한 뒤 AnswerSupplementRequest/Response
    # (services/answer_service.py)로 그 답변을 보완한 ai_answer를 생성하는 흐름으로 통일했다.
    followup_depth: int = Field(..., description="이번 응답 반영 후 누적 꼬리질문 횟수")
    capped: bool = Field(
        False,
        description=(
            "꼬리질문 횟수 상한(config.max_followup_per_question)에 도달해 "
            "실제 rubric 채점 없이 강제로 종료 처리했는지 여부. "
            "true 인 경우 all_passed=true 이지만 이는 '진짜 통과'가 아니라 "
            "'더 이상 파고들지 않기로 함'을 의미하므로, 리포트 등에서 구분해 다뤄야 한다."
        ),
    )


# ────────────────────────────
# 답변 보완 (사용자 답변 제출 후 비동기 처리)
# ────────────────────────────
# [루브릭 아키텍처 재설계 - 신규]
# 기존 계획(Phase 3, remaining_work.md)은 "면접이 끝난 뒤 전체 대화 기록을 한 번에
# 처리해 모범 답안을 만드는" 방식이었다. 이번 재설계로 이를 "사용자가 답변을 제출할
# 때마다(기본 질문/꼬리질문 구분 없이) BE가 그때그때 비동기로 호출해, 그 답변 하나를
# 보완한 ai_answer를 즉시 생성"하는 방식으로 바꿨다.
#   - 호출 시점: BE가 사용자 답변을 DB에 저장한 직후, 백그라운드 작업으로 비동기 호출.
#     (동기적으로 사용자를 기다리게 하지 않음 — 면접 진행 자체는 Phase 2 /followup 결과로
#     즉시 이어지고, ai_answer는 나중에 채워짐)
#   - 최종 면접 완료 화면에서 (질문, 사용자 답변, ai_answer) 목록과 함께
#     "면접 전체에 대한 총평/피드백"을 보여주는 데 사용될 데이터.
#     전체 총평/피드백 생성은 별도(면접 종료 시점 1회 호출, 아직 미구현 — remaining_work.md 참고).
class AnswerSupplementRequest(BaseModel):
    user_id: int
    ai_interview_id: int
    question: str = Field(..., description="사용자가 답변한 질문 원문 (기본 질문 또는 꼬리질문)")
    rubric: list[str] = Field(
        default_factory=list,
        description="이 질문의 채점 기준 (있으면 보완 시 반영, 없으면 일반적인 답변 품질 기준으로 보완)",
    )
    rubric_results: list[RubricResult] | None = Field(
        None,
        description=(
            "Phase 2(/followup)에서 이미 채점한 결과가 있으면 그대로 전달. "
            "재채점 없이 '어떤 기준을 놓쳤는지'를 바로 알 수 있어 보완 품질이 좋아진다. "
            "없으면(예: 첫 기본 질문 답변 직후 아직 채점 전이라면) null."
        ),
    )
    user_answer: str = Field(..., description="사용자 답변 (STT 텍스트)")
    interview_type: InterviewType


class AnswerSupplementResponse(BaseModel):
    ai_interview_id: int
    question: str
    ai_answer: str = Field(
        ..., description="사용자 답변을 보완한 AI 답변 (ai_interview_questions.ai_answer 저장용)"
    )
