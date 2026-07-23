"""GMS LLM 프롬프트 템플릿"""
from schemas.common import InterviewType, Difficulty, CSCategory, CS_CATEGORY_LABEL, InterviewerStyle


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

# [면접관 스타일 반영 기능 - 신규] DIFFICULTY_GUIDE와 동일한 "enum → 지시문" 테이블
# 기반 전략 패턴. difficulty가 질문의 "내용/깊이"를 결정하는 것과 달리, 이 가이드는
# 오직 질문의 "말투/어조"만 결정한다 — 이 구분을 build_question_prompt()의 프롬프트
# 섹션 설명에도 명시해, LLM이 스타일 지시를 rubric/주제 난이도까지 바꾸는 데
# 잘못 적용하지 않도록 한다.
INTERVIEWER_STYLE_GUIDE: dict[InterviewerStyle, str] = {
    InterviewerStyle.COMFORTABLE: (
        "면접관 말투는 편안하고 친근하게 - 지원자가 긴장하지 않고 편하게 이야기할 "
        "수 있도록 부드러운 존댓말과 격려하는 뉘앙스를 사용하세요. "
        "예: '~에 대해 편하게 말씀해주시겠어요?'"
    ),
    InterviewerStyle.REALISTIC: (
        "면접관 말투는 실제 면접장처럼 담백하고 표준적인 존댓말로 - 과도한 격려나 "
        "압박 없이 사실적이고 절제된 톤으로 질문하세요."
    ),
    InterviewerStyle.PRESSURE: (
        "면접관 말투는 날카롭고 압박감 있게 - 답변의 허점을 짚고 더 깊이 캐묻는 "
        "듯한 도전적인 뉘앙스를 사용하세요. 단, 무례하거나 인신공격성 표현은 "
        "금지하며 어디까지나 '질문의 날카로움'으로만 압박감을 표현하세요. "
        "예: '그 방식이 최선이었다고 확신하십니까? 다른 대안은 검토해보셨나요?'"
    ),
}


# ────────────────────────────
# 질문 생성
# ────────────────────────────
# [루브릭 아키텍처 전환] 시스템 프롬프트에 "루브릭(채점 기준) 설계자" 역할을 추가.
# 기존에는 질문 + 예상답안만 만들면 됐지만, 이제는 각 질문마다 "이 답변이 합격하려면
# 반드시 짚어야 할 핵심 포인트"까지 함께 설계해야 한다. 이 rubric은 이후 Phase 2(꼬리질문
# 서비스, 별도 작업)에서 실제 답변을 채점하는 기준으로 그대로 재사용된다.
QUESTION_SYSTEM = (
    "당신은 한국 IT 기업의 숙련된 기술 면접관 겸 채점 기준 설계자입니다. "
    "지원자의 실제 문서(이력서/자기소개서/GitHub)를 근거로 날카롭고 구체적인 "
    "면접 질문을 만들고, 각 질문마다 답변을 평가할 핵심 채점 기준(rubric)도 함께 설계합니다. "
    "반드시 지정한 JSON 형식으로만 응답하세요."
)


def build_question_prompt(
    *,
    interview_type: InterviewType,
    difficulty: Difficulty,
    interviewer_style: InterviewerStyle,
    company_name: str | None,
    position: str | None,
    question_count: int,
    rubric_min_count: int,
    rubric_max_count: int,
    context: str,
    career: str | None = None,
    skills: list[str] | None = None,
    cs_categories: list[CSCategory] | None = None,
) -> str:
    type_guide = INTERVIEW_TYPE_GUIDE[interview_type]
    diff_guide = DIFFICULTY_GUIDE[difficulty]
    style_guide = INTERVIEWER_STYLE_GUIDE[interviewer_style]
    target = []
    if company_name:
        target.append(f"지원 기업: {company_name}")
    if position:
        target.append(f"지원 직무/포지션: {position}")
    # [경력/보유 스킬 반영 - 신규] BE가 전달한 지원자 프로필 정보를 프롬프트에 노출해,
    # RAG 컨텍스트가 부족한 경우에도 LLM이 지원자 연차/기술 스택을 감안해 질문 난이도와
    # 소재를 조정할 수 있게 한다.
    if career:
        target.append(f"경력: {career}")
    if skills:
        target.append(f"보유 기술 스킬: {', '.join(skills)}")
    target_str = "\n".join(target) if target else "(지정 없음)"

    # [CS 카테고리 제한 기능 - 신규 / BE 요청 형식 개편 - 다중 선택 대응] cs_categories 가
    # 있으면 "반드시 이 범위 내에서만 질문하라"는 지시를 별도 섹션으로 명시한다.
    # RAG 컨텍스트(CS 지식 검색 결과)가 이미 해당 카테고리(들)로 필터링돼 있지만,
    # 컨텍스트가 부족하거나 비어 있는 경우에도(예: 시드 데이터가 없는 카테고리) LLM이
    # 카테고리 범위를 벗어나지 않도록 하는 이중 안전장치다. 카테고리가 여러 개(최대 3개)
    # 주어질 수 있으므로, 한쪽에만 질문이 몰리지 않도록 "골고루 다루라"는 지시를 추가했다.
    cs_category_section = ""
    if cs_categories:
        labels = ", ".join(CS_CATEGORY_LABEL[c] for c in cs_categories)
        cs_category_section = f"""
## CS 카테고리 (반드시 이 범위 내에서만 질문)
{labels}
- 위 카테고리들에 속하지 않는 다른 CS 주제로 질문을 만들지 마세요.
- 여러 카테고리가 주어졌으니, 가능하면 서로 다른 카테고리를 골고루 다루세요(하나의
  카테고리에만 질문이 몰리지 않도록 하세요).
"""

    # [루브릭 아키텍처 전환] rubric_min_count~rubric_max_count(config.py, 기본 2~3개)를
    # 프롬프트에 그대로 노출해 LLM이 질문마다 몇 개의 채점 기준을 만들어야 하는지 명확히 알게 한다.
    return f"""다음 조건으로 면접 질문 {question_count}개를 생성하세요.

## 면접 유형
{type_guide}

## 난이도
{diff_guide}

## 면접관 스타일
{style_guide}
(위 스타일은 질문의 "말투/어조"에만 적용하세요 — 질문의 내용/주제/rubric/난이도는
위 "면접 유형"/"난이도" 지침을 그대로 따르고, 이 스타일 지시로 바꾸지 마세요.)

## 지원 정보
{target_str}
{cs_category_section}
## 지원자 문서 (RAG 검색 결과)
{context}

## 지시사항
- 위 문서에 실제로 등장하는 프로젝트/기술/경험을 근거로 질문을 만드세요.
- 문서에 없는 내용을 지어내지 마세요. 문서가 부족하면 면접 유형에 맞는 일반 질문으로 채우세요.
- 각 질문마다 rubric(채점 기준)을 {rubric_min_count}~{rubric_max_count}개 작성하세요.
  - rubric의 각 항목은 "지원자 답변에 반드시 포함되어야 할 핵심 포인트"를 짧은 한 문장으로 표현하세요.
    (예: "구체적인 트러블슈팅 과정을 설명했는가", "성능 개선 수치나 근거를 제시했는가")
  - rubric 항목끼리는 서로 다른 관점(기술적 깊이/근거/의사결정 이유 등)을 다루도록 하세요.
  - 이 rubric은 나중에 실제 답변을 채점하고 부족한 부분만 겨냥한 꼬리질문을 생성하는 데 쓰이므로,
    "예/아니오로 판정 가능할 만큼" 구체적으로 작성하세요.
- 질문은 서로 중복되지 않게 다양한 주제를 다루세요.
- 모범 예상 답안(expected_answer)은 생성하지 마세요. 답변에 대한 AI 보완 답안은 사용자가
  실제로 답변을 제출한 뒤 별도로 생성됩니다(질문 생성 시점에는 아직 답이 존재하지 않음).

## 출력 형식 (JSON only)
{{
  "questions": [
    {{
      "order": 1,
      "question": "질문 내용",
      "rubric": ["채점 기준 1", "채점 기준 2", "채점 기준 3"],
      "topic": "주제 태그(예: React, 운영체제, 협업)",
      "source": "근거 문서 출처(resume/cover_letter/github/general 중 하나)"
    }}
  ]
}}
정확히 {question_count}개의 질문을 생성하고, 질문마다 rubric을 {rubric_min_count}~{rubric_max_count}개씩 포함하세요."""


# ────────────────────────────
# 꼬리질문 (Phase 2 - 루브릭 채점 + One-Call 동적 생성)
# ────────────────────────────
# [루브릭 아키텍처 전환] 기존에는 "꼬리질문이 필요한가?"만 애매하게 판단했지만,
# 이제는 LLM 1회 호출로 (1) rubric 각 항목을 답변이 실제로 충족했는지 채점하고,
# (2) 통과하지 못한 항목이 있으면 그 부분만 정확히 겨냥한 꼬리질문까지 함께 생성한다.
# 역할이 "판단자"에서 "채점관 + 채점 결과에 근거한 질문 설계자"로 확장됨에 따라
# 시스템 프롬프트 문구도 갱신했다.
FOLLOWUP_SYSTEM = (
    "당신은 한국 IT 기업의 면접관입니다. 사전에 정해진 채점 기준(rubric)에 따라 "
    "지원자의 답변을 항목별로 냉정하게 채점하고, 통과하지 못한 항목이 있다면 "
    "그 부분만 정확히 겨냥한 꼬리질문을 던집니다. 이미 답변에서 다룬 내용을 "
    "다시 묻지 않습니다. 반드시 지정한 JSON 형식으로만 응답하세요."
)


def build_followup_prompt(
    *,
    interview_type: InterviewType,
    parent_question: str,
    rubric: list[str],
    user_answer: str,
    context: str,
) -> str:
    # [루브릭 아키텍처 전환] rubric 목록을 번호를 매겨 프롬프트에 그대로 노출.
    # LLM이 rubric_results 를 만들 때 이 번호/문구를 그대로 criterion 값으로
    # 되돌려주도록 지시해, 파싱 단계(services/followup_service.py)에서
    # "입력 rubric 개수 == 출력 rubric_results 개수"를 검증할 수 있게 한다.
    rubric_lines = "\n".join(f"{i}. {c}" for i, c in enumerate(rubric, start=1))

    return f"""면접관으로서 아래 지원자 답변을 rubric 기준으로 채점하고,
통과하지 못한 기준이 있으면 그 부분을 겨냥한 꼬리질문을 생성하세요.

## 면접 유형
{INTERVIEW_TYPE_GUIDE[interview_type]}

## 직전 질문
{parent_question}

## 채점 기준 (rubric)
{rubric_lines}

## 지원자 답변
{user_answer}

## 참고 문서 (지원자 관련)
{context}

## 채점 및 꼬리질문 지시사항
- rubric 항목 각각에 대해 답변이 실제로 그 내용을 충족했는지 passed(true/false)로 판정하세요.
  - 답변에 명시적으로 언급되지 않았거나, 언급했지만 근거/구체성이 부족하면 passed=false.
  - criterion 값은 위 rubric 문구를 그대로 사용하세요(번호는 제외).
- 하나라도 passed=false 인 항목이 있으면 all_passed=false 로 설정하고,
  통과하지 못한 항목 중 가장 중요한 것 1개를 겨냥한 꼬리질문(followup_question)을 생성하세요.
  - 이미 답변에서 다룬 내용을 반복해서 묻지 마세요.
  - 통과하지 못한 항목이 여러 개여도 꼬리질문은 1개만 생성하세요(가장 핵심적인 것 우선).
- 모든 항목이 passed=true 이면 all_passed=true 로 설정하고 followup_question 은 null 로 두세요.

## 출력 형식 (JSON only)
{{
  "rubric_results": [
    {{"criterion": "rubric 문구 그대로", "passed": true 또는 false, "reason": "판정 근거 한 문장"}}
  ],
  "all_passed": true 또는 false,
  "followup_question": "꼬리질문 (all_passed=true 이면 null)"
}}
rubric_results 는 반드시 입력된 rubric과 동일한 개수({len(rubric)}개)로 반환하세요.
꼬리질문의 예상 모범 답안(expected_answer)은 생성하지 마세요 — 사용자가 이 꼬리질문에
실제로 답변을 제출한 뒤 AI 보완 답안이 별도로 생성됩니다."""


# ────────────────────────────
# 답변 보완 (사용자 답변 제출 후 비동기 처리 - 신규)
# ────────────────────────────
# [루브릭 아키텍처 재설계] 기존 "질문 생성 시 미리 예상 답안을 써두는" 방식을 버리고,
# "사용자가 실제로 답변을 제출한 뒤, 그 답변을 근거로 AI가 보완한 답변을 만드는" 방식으로
# 바꿨다. 지원자가 이미 잘 답한 내용은 그대로 살리고, rubric 상 놓친 포인트만 자연스럽게
# 보강하는 것이 핵심 — "새로 쓴 모범 답안"이 아니라 "지원자 답변의 보완본"이어야 한다.
ANSWER_SUPPLEMENT_SYSTEM = (
    "당신은 한국 IT 기업의 시니어 면접관 코치입니다. 지원자가 실제로 제출한 답변을 "
    "최대한 존중하고 그 표현과 논리를 살리되, 채점 기준에서 놓친 부분이나 근거가 "
    "부족한 부분만 자연스럽게 보완하여 하나의 완성된 답변으로 다시 작성합니다. "
    "지원자가 하지 않은 경험을 지어내지 않고, 일반적으로 타당한 방향으로만 보완합니다. "
    "반드시 지정한 JSON 형식으로만 응답하세요."
)


def build_answer_supplement_prompt(
    *,
    interview_type: InterviewType,
    question: str,
    rubric: list[str],
    rubric_results: list[dict] | None,
    user_answer: str,
    context: str,
) -> str:
    # [루브릭 아키텍처 재설계] rubric_results(Phase 2에서 이미 채점된 결과)가 있으면
    # "어떤 기준을 통과했고 어떤 기준을 놓쳤는지"를 그대로 알려줘서, LLM이 재채점할
    # 필요 없이 놓친 부분만 정확히 겨냥해 보완하도록 한다. 없으면 rubric 목록만 참고
    # 자료로 제공하고, 그마저도 없으면 일반적인 답변 품질 기준으로 보완하게 한다.
    if rubric_results:
        lines = []
        for r in rubric_results:
            status = "충족" if r.get("passed") else "미충족"
            reason = f" ({r['reason']})" if r.get("reason") else ""
            lines.append(f"- {r.get('criterion', '')}: {status}{reason}")
        rubric_section = "## 채점 결과 (이미 판정됨 - 미충족 항목 위주로 보완하세요)\n" + "\n".join(lines)
    elif rubric:
        rubric_section = "## 채점 기준 (참고)\n" + "\n".join(f"- {c}" for c in rubric)
    else:
        rubric_section = "## 채점 기준\n(제공되지 않음 — 일반적인 답변 품질 기준으로 보완하세요.)"

    return f"""아래 지원자 답변을 채점 기준에 맞춰 자연스럽게 보완하세요.

## 면접 유형
{INTERVIEW_TYPE_GUIDE[interview_type]}

## 질문
{question}

{rubric_section}

## 지원자 답변 (원문)
{user_answer}

## 참고 문서 (지원자 관련)
{context}

## 보완 지시사항
- 지원자 답변의 좋은 부분(정확한 내용, 본인의 표현)은 그대로 유지하세요.
- 미충족 채점 기준이 있다면 그 부분에 해당하는 내용을 자연스럽게 추가/보강하세요.
- 완전히 새로운 답변을 쓰지 말고, 어디까지나 "지원자 답변을 다듬고 보완한 결과"여야 합니다.
- 지원자가 언급하지 않은 구체적 경험(수치, 프로젝트명 등)을 지어내지 마세요.
  보강이 필요하면 "일반적으로는 ~하는 방식으로 접근할 수 있습니다" 같은 형태로 서술하세요.
- 3~6문장 정도의 자연스러운 하나의 답변으로 작성하세요.

## 출력 형식 (JSON only)
{{
  "ai_answer": "보완된 답변 전체"
}}"""
