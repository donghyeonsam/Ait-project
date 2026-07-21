"""GMS LLM 프롬프트 템플릿"""
from schemas.common import InterviewType, Difficulty


INTERVIEW_TYPE_GUIDE: dict[InterviewType, str] = {
    InterviewType.JOB: (
        "직무 면접입니다. 지원자의 이력서/자기소개서에 기반해 직무 적합성, "
        "경험의 구체성, 문제 해결 경험, 지원 동기를 검증하는 질문을 만드세요."
    ),
    InterviewType.CS: (
        "CS(전산 기초) 면접입니다. 자료구조, 알고리즘, 운영체제, 네트워크, "
        "데이터베이스 등 컴퓨터 공학 기초 지식을 검증하는 질문을 만드세요."
    ),
    InterviewType.TECH: (
        "기술 면접입니다. 지원자의 GitHub 프로젝트와 기술 스택에 기반해 "
        "구현 방식, 기술 선택 이유, 트러블슈팅, 아키텍처 이해도를 검증하는 질문을 만드세요."
    ),
    InterviewType.PORTFOLIO: (
        "포트폴리오 면접입니다. 지원자의 프로젝트 결과물에 기반해 기여도, "
        "역할, 성과, 협업 과정, 의사결정 근거를 검증하는 질문을 만드세요."
    ),
    InterviewType.COMPREHENSIVE: (
        "종합 면접입니다. 직무 적합성, 기술 역량, CS 기초, 프로젝트 경험, 인성을 "
        "고루 아우르는 균형 잡힌 질문을 만드세요."
    ),
}

DIFFICULTY_GUIDE: dict[Difficulty, str] = {
    Difficulty.EASY: "난이도는 낮게 - 기본 개념과 경험을 확인하는 수준.",
    Difficulty.NORMAL: "난이도는 보통 - 실무 적용과 이유를 묻는 수준.",
    Difficulty.HARD: "난이도는 높게 - 심화 원리, 트레이드오프, 엣지케이스를 파고드는 수준.",
}


# ────────────────────────────
# 질문 생성
# ────────────────────────────
QUESTION_SYSTEM = (
    "당신은 한국 IT 기업의 숙련된 기술 면접관입니다. "
    "지원자의 실제 문서(이력서/자기소개서/GitHub)를 근거로 날카롭고 구체적인 "
    "면접 질문을 만듭니다. 반드시 지정한 JSON 형식으로만 응답하세요."
)


def build_question_prompt(
    *,
    interview_type: InterviewType,
    difficulty: Difficulty,
    company_name: str | None,
    position: str | None,
    question_count: int,
    context: str,
) -> str:
    type_guide = INTERVIEW_TYPE_GUIDE[interview_type]
    diff_guide = DIFFICULTY_GUIDE[difficulty]
    target = []
    if company_name:
        target.append(f"지원 기업: {company_name}")
    if position:
        target.append(f"지원 직무/포지션: {position}")
    target_str = "\n".join(target) if target else "(지정 없음)"

    return f"""다음 조건으로 면접 질문 {question_count}개를 생성하세요.

## 면접 유형
{type_guide}

## 난이도
{diff_guide}

## 지원 정보
{target_str}

## 지원자 문서 (RAG 검색 결과)
{context}

## 지시사항
- 위 문서에 실제로 등장하는 프로젝트/기술/경험을 근거로 질문을 만드세요.
- 문서에 없는 내용을 지어내지 마세요. 문서가 부족하면 면접 유형에 맞는 일반 질문으로 채우세요.
- 각 질문마다 모범 예상 답안(expected_answer)을 2~4문장으로 작성하세요.
- 질문은 서로 중복되지 않게 다양한 주제를 다루세요.

## 출력 형식 (JSON only)
{{
  "questions": [
    {{
      "order": 1,
      "question": "질문 내용",
      "expected_answer": "예상 모범 답안",
      "topic": "주제 태그(예: React, 운영체제, 협업)",
      "source": "근거 문서 출처(resume/cover_letter/github/general 중 하나)"
    }}
  ]
}}
정확히 {question_count}개의 질문을 생성하세요."""


# ────────────────────────────
# 꼬리질문
# ────────────────────────────
FOLLOWUP_SYSTEM = (
    "당신은 한국 IT 기업의 면접관입니다. 지원자의 답변을 듣고 더 깊이 검증할 "
    "가치가 있을 때만 꼬리질문을 던집니다. 반드시 지정한 JSON 형식으로만 응답하세요."
)


def build_followup_prompt(
    *,
    interview_type: InterviewType,
    parent_question: str,
    user_answer: str,
    context: str,
    remaining: int,
) -> str:
    return f"""면접관으로서 아래 답변에 꼬리질문이 필요한지 판단하고, 필요하면 생성하세요.

## 면접 유형
{INTERVIEW_TYPE_GUIDE[interview_type]}

## 직전 질문
{parent_question}

## 지원자 답변
{user_answer}

## 참고 문서 (지원자 관련)
{context}

## 판단 기준
- 답변이 모호하거나, 근거가 부족하거나, 더 파고들 기술적 깊이가 있으면 꼬리질문 필요(need_followup=true).
- 답변이 이미 충분히 구체적이고 완결적이면 불필요(need_followup=false).
- 남은 꼬리질문 가능 횟수: {remaining}회. (0이면 무조건 need_followup=false)

## 출력 형식 (JSON only)
{{
  "need_followup": true 또는 false,
  "reason": "판단 근거 한 문장",
  "question": "꼬리질문 (need_followup=false 이면 null)",
  "expected_answer": "꼬리질문의 예상 모범 답안 (need_followup=false 이면 null)"
}}"""
