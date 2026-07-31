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
    # 모범 답안) 필드를 완전히 제거했다. ai_interview_questions.ai_answer 컬럼(답변
    # 분석/보완/평가)은 Spring Boot(BE)가 담당한다 — FastAPI는 더 이상 이 값을
    # 생성하지 않는다(2026-07-31, docs/AI_개발일지_0731.md 참고).
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
    depth: int = Field(0, description="이 질문의 초기 꼬리질문 횟수 (생성 시점엔 항상 0)")


class QuestionGenerateResponse(BaseModel):
    ai_interview_id: int
    interview_type: InterviewType
    questions: list[GeneratedQuestion]
    rag_used: bool = Field(..., description="RAG 컨텍스트가 실제로 검색되었는지")


# ────────────────────────────
# 꼬리질문 생성 (답변 수신 시)
# ────────────────────────────
# [꼬리질문 narrowing 전환 - 2026-07-26]
# 기존에는 매 턴 rubric 전체를 백지 상태에서 재채점했다. FastAPI는 stateless라
# "이전 턴에 어떤 rubric이 이미 통과됐는지"를 서버가 스스로 알 방법이 없고, BE도
# 통과 항목을 걸러내지 않고 요청을 그대로 패스스루했기 때문에, 같은 rubric이
# 턴마다 pass/fail을 오가는 진동이 발생했다(예: "나이" rubric을 통과시킨 다음 턴에
# "성별"만 채점하려다 "나이" rubric이 이번엔 언급이 없다는 이유로 도로 fail 처리되는
# 식 — 무한 반복). 기존 코드의 "BE는 통과 못한 rubric만 추려서 넘겨주는 것을
# 전제로 한다"는 주석은 실제로는 아무도 구현하지 않은 문서상의 가정이었다.
#
# 해결 방식은 "통과한 rubric 항목을 응답에서 아예 제거해 내려준다"이다. 다음 턴
# 요청에는 미통과 항목만 실려 오므로, 이미 통과한 항목은 재채점 대상으로 물리적으로
# 존재하지 않는다 — 통과 상태를 뒤집을 코드 경로 자체가 없어지므로 진동이 구조적으로
# 불가능해진다. 상태는 여전히 요청/응답 payload가 왕복시키므로 FastAPI의 stateless
# 원칙은 그대로 유지되고, rubric 타입도 list[str] 그대로라 다른 파트의 DTO 타입
# 변경을 유발하지 않는다.
#
# "rubric 항목에 통과 플래그를 심은 객체 배열"로 바꾸는 대안도 검토했으나 기각했다
# (다른 파트의 DTO 타입 변경이 필요하고, "한 번 pass한 항목은 다시 fail로 안 바뀐다"는
# 단조성을 병합 코드로 지켜야 해서 narrowing보다 취약함). 경위는
# docs/AI_작업일지_0726.md 참고.
class FollowupQuestionInfo(BaseModel):
    """꼬리질문 요청에 실려 오는 '직전에 사용자가 답한 질문' 정보.

    GeneratedQuestion과 필드 구성이 동일하다 — 호출측은 이전 턴 응답의
    next_question을 가공 없이 그대로 이 자리에 되돌려 보내면 된다. rubric의 의미가
    "이 질문의 전체 채점 기준"에서 "아직 통과하지 못한 채점 기준"으로 재정의된 점이
    GeneratedQuestion.rubric과의 유일한 차이다.
    """

    order: int = Field(..., description="질문 순서 (부모 질문과 동일한 값을 유지)")
    question: str = Field(..., description="직전 질문(기본 질문 또는 꼬리질문) 원문")
    # [꼬리질문 narrowing 전환] min_length 제약을 두지 않는다. 빈 배열은 "이미 이
    # 질문의 모든 기준을 통과했다"는 정상 상태이므로, 호출측이 방어적으로(rubric이
    # 빈 채로) 호출해도 422로 막히지 않고 즉시 is_pass=true로 응답해야 한다
    # (services/followup_service.py 1단계).
    rubric: list[str] = Field(
        default_factory=list,
        description="아직 통과하지 못한 채점 기준만 (빈 배열이면 이 질문은 이미 전부 통과)",
    )
    topic: str | None = Field(None, description="질문 주제 태그 (부모 승계)")
    source: str | None = Field(None, description="근거가 된 문서 출처 (부모 승계)")
    depth: int = Field(0, ge=0, description="지금까지 이 질문에 나간 꼬리질문 횟수")


class FollowupRequest(BaseModel):
    user_id: int
    # [꼬리질문 narrowing 전환] 응답에서는 제거하지만 요청에서는 선택 필드로 남겨둔다.
    # 로그에 세션 식별자가 안 남으면 장애 추적이 불가능해지기 때문 — 요청에서만 받아
    # 로깅에 쓰고 채점 로직에는 관여시키지 않는다.
    ai_interview_id: int | None = Field(None, description="로깅 전용. 응답에는 포함되지 않는다")
    interview_type: InterviewType
    # [BE 요청 형식 개편 - 2026-07-23, 세션 전체로 확장] 질문 생성(/questions) 시 BE가
    # 지정한 문서와 "같은 값"을 이 요청에도 함께 실어 보내야 한다 — AI 서비스는 세션
    # 상태를 저장하지 않는 stateless 구조라, 면접 시작 시 한 번 지정했다고 해서 이후
    # 요청에서 자동으로 기억하지 못한다. 값이 있으면 services/rag_service.py 의
    # retrieve_context() 가 "이 특정 문서"로 RAG 검색 범위를 좁힌다. 선택 필드이며
    # 없으면 기존처럼 user_id(+doc_type) 전체에서 검색한다(하위 호환).
    resume_id: int | None = Field(None, description="이 면접에서 참고할 이력서 analyses.target_id")
    cover_letter_id: int | None = Field(None, description="이 면접에서 참고할 자소서 analyses.target_id")
    github_repo_id: int | None = Field(None, description="이 면접에서 참고할 GitHub 레포 analyses.target_id")
    # [꼬리질문 narrowing 전환 - Breaking Change] 기존 flat 구조(parent_question/
    # rubric/depth를 최상위 필드로 직접 받던 방식)를 중첩 객체로 바꿨다. 호출측이
    # "이전 턴 응답의 next_question을 그대로 여기에 되돌려 보낸다"는 계약을 스키마
    # 형태로도 드러내기 위함 — 필드를 개별로 조립해서 보내면 rubric을 복원/추가하는
    # 실수가 섞여 들어가기 쉽다.
    question: FollowupQuestionInfo = Field(..., description="직전에 사용자가 답한 질문")
    # [꼬리질문 narrowing 전환 - Breaking Change] 기존 user_answer → answer로 필드명
    # 변경(2절 요청 형식 참고).
    answer: str = Field(..., description="사용자 답변 (STT 텍스트)")


class FollowupNextQuestion(BaseModel):
    """꼬리질문 응답의 다음 질문. GeneratedQuestion과 동일한 필드 구성이어야 한다 —
    소비하는 쪽(BE/FE)이 두 객체를 같은 타입으로 다룰 수 있어야 하기 때문이다."""

    order: int
    question: str
    rubric: list[str] = Field(default_factory=list, description="아직 통과하지 못한 항목만")
    topic: str | None = None
    source: str | None = None
    depth: int


class FollowupResponse(BaseModel):
    # [꼬리질문 narrowing 전환 - Breaking Change] 기존 rubric_results/all_passed/
    # capped/ai_interview_id 필드를 전부 제거하고 is_pass/next_question 둘로
    # 단순화했다. rubric_results(항목별 pass/fail)는 narrowing 방식에서 "미통과
    # 항목만 다음 rubric으로 내려주는" 구조로 대체되어 별도 채점 결과 리스트가
    # 필요 없어졌고, capped는 is_pass=true에 흡수됐다(아래 참고).
    is_pass: bool = Field(
        ...,
        description=(
            "true면 BE는 다음 기본 질문으로 진행. 단 depth 상한 도달로 강제 종료된 "
            "경우도 true로 내려온다 — '모든 rubric 통과'와 '상한 도달로 강제 종료' "
            "두 의미를 이 필드 하나가 공유하므로, 구분이 필요하면 호출측이 "
            "question.depth 값으로 판단해야 한다."
        ),
    )
    next_question: FollowupNextQuestion | None = Field(
        None, description="꼬리질문. is_pass=false일 때만 값이 있다"
    )
