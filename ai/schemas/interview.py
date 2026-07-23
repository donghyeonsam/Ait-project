"""면접 질문/꼬리질문 관련 요청·응답 스키마"""
from pydantic import BaseModel, Field, field_validator, model_validator

from schemas.common import (
    InterviewType,
    Difficulty,
    CSCategory,
    InterviewerStyle,
    DIFFICULTY_KOREAN_INPUT_MAP,
    INTERVIEWER_STYLE_KOREAN_INPUT_MAP,
    CS_CATEGORY_KOREAN_INPUT_MAP,
)


# ────────────────────────────
# 질문 생성 (면접 시작 시)
# ────────────────────────────
# [BE 요청 형식 개편 - 2026-07-23] BE가 이 요청을 보내는 방식이 대대적으로 바뀌었다.
# 필드명은 전부 snake_case(camelCase 변환/alias 불필요, pydantic 필드명과 그대로 1:1
# 매칭)로 오지만, 값 쪽이 두 가지로 바뀌었다:
#   1) enum 성격의 필드(interview_type/difficulty/ai_attitude_style/cs_categories)가
#      대문자("CS") 또는 한글 라벨("중", "압박면접", "자료구조")로 온다. 내부 enum 값은
#      기존 영문 그대로 유지하고(다른 코드 전반이 이미 그 값을 전제로 하고 있으므로),
#      "BE wire 값 → 내부 enum" 매핑을 field_validator(mode="before")에서 수행한다.
#   2) 이 면접에서 참고할 특정 문서(resume_id/cover_letter_id/github_repo_id)와, 다중
#      선택으로 바뀐 CS 카테고리(cs_categories) 등 필드 구조 자체가 바뀐 부분도 있다.
class QuestionGenerateRequest(BaseModel):
    user_id: int = Field(..., description="users.id")
    ai_interview_id: int = Field(..., description="ai_interviews.id (BE에서 세션 생성 후 전달)")
    interview_type: InterviewType
    difficulty: Difficulty = Difficulty.NORMAL
    # [BE 요청 형식 개편] 기존 interviewer_style → ai_attitude_style로 필드명 자체가
    # 바뀌었다(Breaking Change). BE가 "aiAttitudeStyle"이 아니라 snake_case
    # "ai_attitude_style"로 그대로 보내므로 별도 alias 설정 없이 필드명을 wire 이름과
    # 동일하게 맞췄다. 값 타입(InterviewerStyle enum)과 이 값을 쓰는 내부 로직
    # (prompts/templates.py의 INTERVIEWER_STYLE_GUIDE 등)은 기존 그대로 재사용한다 —
    # 바뀐 것은 "이 필드를 어떤 이름/wire 값으로 받는가"뿐이다.
    ai_attitude_style: InterviewerStyle = Field(
        InterviewerStyle.REALISTIC,
        description="면접관 태도/스타일 (편안한 면접/실전 면접/압박면접). 미지정 시 REALISTIC 기본값.",
    )
    # 직무/기술/포폴/종합 면접에서 사용자가 폼으로 입력한 값
    company_name: str | None = Field(None, description="지원 기업")
    position: str | None = Field(None, description="지원 직무/포지션")
    # [경력/보유 스킬 반영 - 신규] BE가 사용자 프로필에서 가져와 전달하는 값.
    # services/question_service.py 의 RAG 검색 쿼리 구성과 prompts/templates.py 의
    # 프롬프트 "지원 정보" 섹션에 함께 반영되어, "경력 3년차 백엔드, Spring/JPA 보유"
    # 같은 맥락을 질문 생성 시 참고할 수 있게 한다.
    career: str | None = Field(None, description="지원자 경력 (예: '신입', '3년차' 등)")
    skills: list[str] | None = Field(None, description="지원자 보유 기술 스킬 목록")
    question_count: int | None = Field(
        # [루브릭 아키텍처 전환] 기본 질문 수를 10 → 5로 축소.
        # 대신 질문마다 rubric(채점 기준)을 함께 받아, 면접 중 답변 품질에 따라
        # 부족한 부분만 동적 꼬리질문으로 파고드는 방식(Phase 2, 별도 작업)으로 깊이를 보완한다.
        None, description="생성할 질문 수 (미지정 시 서버 기본값 5)"
    )

    # [BE 요청 형식 개편 - 신규] 이 면접에서 참고할 "특정" 문서 id. 사용자가 이력서/
    # 자소서/GitHub 레포를 여러 개 등록해뒀을 수 있으므로, "이 사용자의 전체 문서"가
    # 아니라 "이 면접에 지정된 이 문서"로 RAG 검색 범위를 좁히기 위한 필드.
    # services/rag_service.py 의 retrieve_context() 가 이 값들을 doc_type별 target_id
    # 필터로 사용한다. 셋 다 선택 필드(문서 종류에 따라 없을 수 있음 - 예: 아직 GitHub
    # 연동 안 한 사용자).
    resume_id: int | None = Field(None, description="이 면접에서 참고할 이력서 analyses.target_id")
    cover_letter_id: int | None = Field(None, description="이 면접에서 참고할 자소서 analyses.target_id")
    github_repo_id: int | None = Field(None, description="이 면접에서 참고할 GitHub 레포 analyses.target_id")

    # [BE 요청 형식 개편 - 신규] 다중 선택 CS 카테고리(최대 3개). 기존 단일 선택
    # cs_category 필드를 완전히 대체한다(Breaking Change — 이 필드를 참조하던 기존 BE
    # 연동 코드가 있다면 전부 고쳐야 함). interview_type이 cs일 때만 최소 1개 필요하고,
    # 그 외 유형이면 BE가 빈 배열([])로 보내는 것을 그대로 허용한다(그 경우 검증 안 함).
    cs_categories: list[CSCategory] = Field(default_factory=list, max_length=3)

    # ── 입력값 정규화 (before validator) ──
    # BE가 보내는 원시 문자열(대문자 영문/한글)을 우리 내부 enum으로 변환한다.
    # mode="before"라 pydantic이 enum으로 강제 변환을 시도하기 "전에" 먼저 개입해서
    # "CS" -> "cs", "중" -> Difficulty.NORMAL, "압박면접" -> InterviewerStyle.PRESSURE,
    # "네트워크" -> CSCategory.NETWORK 식으로 바꿔준다.

    @field_validator("interview_type", mode="before")
    @classmethod
    def _normalize_interview_type(cls, v):
        """BE가 "CS"처럼 대문자로 보내도 매칭되도록 소문자로 정규화.
        이미 InterviewType enum 인스턴스면 그대로 통과."""
        if isinstance(v, str):
            return v.lower()
        return v

    @field_validator("difficulty", mode="before")
    @classmethod
    def _normalize_difficulty(cls, v):
        """한글 라벨("하"/"중"/"상")을 내부 Difficulty enum으로 변환.
        매핑에 없는 값(예: 이미 영문 "normal"로 온 경우, 내부 테스트용)은 그대로 통과시켜
        pydantic 기본 enum 검증에 맡긴다."""
        if isinstance(v, str) and v in DIFFICULTY_KOREAN_INPUT_MAP:
            return DIFFICULTY_KOREAN_INPUT_MAP[v]
        return v

    @field_validator("ai_attitude_style", mode="before")
    @classmethod
    def _normalize_ai_attitude_style(cls, v):
        """한글 라벨("압박면접" 등)을 내부 InterviewerStyle enum으로 변환."""
        if isinstance(v, str) and v in INTERVIEWER_STYLE_KOREAN_INPUT_MAP:
            return INTERVIEWER_STYLE_KOREAN_INPUT_MAP[v]
        return v

    @field_validator("cs_categories", mode="before")
    @classmethod
    def _normalize_cs_categories(cls, v):
        """한글 라벨 리스트(["자료구조","네트워크","운영체제"])를 CSCategory enum 리스트로 변환.
        매핑에 없는 값이 섞여 있으면 즉시 명확한 에러를 내서 BE가 오탈자를 바로 알아채게 한다
        (조용히 무시하면 "카테고리 필터가 의도보다 좁게 걸리는" 디버깅하기 어려운 버그로 이어짐)."""
        if not isinstance(v, list):
            return v
        result = []
        for item in v:
            if isinstance(item, str) and item in CS_CATEGORY_KOREAN_INPUT_MAP:
                result.append(CS_CATEGORY_KOREAN_INPUT_MAP[item])
            else:
                result.append(item)  # 매핑에 없으면 그대로 둬서 pydantic이 enum 검증 에러를 내게 함
        return result

    @model_validator(mode="after")
    def _validate_cs_category(self) -> "QuestionGenerateRequest":
        """
        CS 면접인데 cs_categories 가 비어있으면 요청 자체를 거부한다(422).
        [CS 카테고리 제한 기능] "선택한 카테고리 내에서만 질문을 만든다"는 요구사항은
        cs_categories 없이는 애초에 성립할 수 없으므로, 서비스 로직까지 가기 전에
        스키마 단계에서 막아 BE가 누락을 바로 알아챌 수 있게 한다.
        (최대 3개 제한은 Field(max_length=3)가 이미 강제하므로 여기선 "최소 1개" 조건만 확인한다.)
        """
        if self.interview_type == InterviewType.CS and not self.cs_categories:
            raise ValueError("interview_type이 'cs'인 경우 cs_categories는 최소 1개 필요합니다.")
        return self


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
    # [BE 요청 형식 개편 - 2026-07-23, 세션 전체로 확장] QuestionGenerateRequest 와
    # 동일한 필드. 질문 생성(/questions) 시 BE가 지정한 문서와 "같은 값"을 이 요청에도
    # 함께 실어 보내야 한다 — AI 서비스는 세션 상태를 저장하지 않는 stateless 구조라,
    # 면접 시작 시 한 번 지정했다고 해서 이후 요청에서 자동으로 기억하지 못한다.
    # 값이 있으면 services/rag_service.py 의 retrieve_context() 가 "이 사용자의 해당
    # 문서 전체"가 아니라 "이 특정 문서"로 RAG 검색 범위를 좁힌다(질문 생성 때와 동일한
    # 문서를 계속 참고해야 면접 전체에서 근거가 일관되게 유지된다). 선택 필드이며 없으면
    # 기존처럼 user_id(+doc_type) 전체에서 검색한다(하위 호환).
    resume_id: int | None = Field(None, description="이 면접에서 참고할 이력서 analyses.target_id")
    cover_letter_id: int | None = Field(None, description="이 면접에서 참고할 자소서 analyses.target_id")
    github_repo_id: int | None = Field(None, description="이 면접에서 참고할 GitHub 레포 analyses.target_id")
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
    # [BE 요청 형식 개편 - 2026-07-23, 세션 전체로 확장] FollowupRequest 와 동일한 이유로
    # 추가. 질문 생성(/questions)·꼬리질문(/followup)과 같은 값을 그대로 넘겨받아,
    # 답변 보완 시의 RAG 검색도 이번 면접에서 지정한 문서로 일관되게 좁힌다.
    resume_id: int | None = Field(None, description="이 면접에서 참고할 이력서 analyses.target_id")
    cover_letter_id: int | None = Field(None, description="이 면접에서 참고할 자소서 analyses.target_id")
    github_repo_id: int | None = Field(None, description="이 면접에서 참고할 GitHub 레포 analyses.target_id")


class AnswerSupplementResponse(BaseModel):
    ai_interview_id: int
    question: str
    ai_answer: str = Field(
        ..., description="사용자 답변을 보완한 AI 답변 (ai_interview_questions.ai_answer 저장용)"
    )
