"""
공통 enum / 타입 정의 (ERD 기준)

[전체 서비스 흐름에서의 역할] embedding/cs_knowledge/interview 세 스키마 모듈이
전부 이 파일의 enum 을 가져다 쓴다. BE의 MySQL ERD 컬럼 값(문자열)과 1:1로 맞춰뒀기
때문에, 여기 값을 바꾸면 BE와의 계약이 깨진다 — 값 추가/변경 시 반드시 BE와 동기화 필요.
"""
from enum import Enum


class DocType(str, Enum):
    """
    analyses.type 과 매핑 - 임베딩 문서의 출처.
    services/embedding_service.py 가 Chroma metadata 의 doc_type 필드에 이 값을 그대로
    저장하고, services/rag_service.py 의 DOC_TYPE_WEIGHTS(면접 유형별 이력서/자소서/
    GitHub 참고 비율 표)가 이 값을 키로 삼아 "이 면접 유형에는 어떤 문서를 얼마나
    검색할지"를 결정한다.
    """
    RESUME = "resume"
    COVER_LETTER = "cover_letter"
    GITHUB = "github"


class InterviewType(str, Enum):
    """
    ai_interviews.interview_type.
    prompts/templates.py 의 INTERVIEW_TYPE_GUIDE 딕셔너리 키로 쓰여 면접 유형별 질문
    가이드를 결정하고, services/rag_service.py 의 DOC_TYPE_WEIGHTS 로 이력서/자소서/
    GitHub 참고 비율을, CS 면접의 경우 CSCategory 로 CS 지식 검색 범위까지 결정한다
    — 이 enum 값 하나가 질문 생성/RAG 검색 전체 분기의 기준이 된다.
    """
    JOB = "job"            # 직무 면접
    CS = "cs"             # CS 면접
    TECH = "tech"          # 기술 면접
    PORTFOLIO = "portfolio"  # 포트폴리오 면접
    COMPREHENSIVE = "comprehensive"  # 종합 (전체 포괄)


class Difficulty(str, Enum):
    """
    면접 난이도. prompts/templates.py 의 DIFFICULTY_GUIDE 딕셔너리 키로 쓰여
    질문 생성 프롬프트에 "얼마나 깊이 파고들지"에 대한 지시문을 결정한다.
    """
    EASY = "easy"
    NORMAL = "normal"
    HARD = "hard"


# [BE 요청 형식 개편 - 신규] BE가 실제로 보내는 한글 wire 값("하"/"중"/"상") → 내부
# Difficulty enum 매핑. enum 자체의 값(EASY="easy" 등)은 그대로 영문으로 유지한다 —
# prompts/templates.py 의 DIFFICULTY_GUIDE 딕셔너리 키로 계속 쓰이기 때문에, enum 내부
# 표현을 wire 표현(BE가 보내는 문자열)과 분리해두면 나중에 BE가 한글 문구를 조금 바꿔도
# (예: "중" → "보통") 이 매핑 테이블 하나만 고치면 되고 나머지 코드는 건드릴 필요가 없다.
# schemas/interview.py 의 QuestionGenerateRequest._normalize_difficulty() 가 이 맵으로
# 값을 미리 변환한 뒤 pydantic enum 검증에 넘긴다.
# ⚠️ BE 확인 필요: "하"/"중"/"상" 3단계로 가정했다(BE 예시 요청에는 "중"만 등장).
# 실제 BE가 보내는 정확한 문자열 3종을 확인해서 필요하면 이 딕셔너리만 수정하면 된다.
DIFFICULTY_KOREAN_INPUT_MAP: dict[str, "Difficulty"] = {
    "하": Difficulty.EASY,
    "중": Difficulty.NORMAL,
    "상": Difficulty.HARD,
}


class InterviewerStyle(str, Enum):
    """
    [면접관 스타일 반영 기능 - 신규] 면접관 스타일. 프론트 GUI에서 사용자가 고르는
    3가지 옵션(편안하게/실전처럼/압박형) 중 하나. 질문 "내용"(rubric, 주제, 난이도)에는
    영향을 주지 않고, 질문의 말투/어조에만 반영된다 — 그 목적을 위해
    schemas/interview.py 의 QuestionGenerateRequest.interviewer_style 필드로 전달되고,
    prompts/templates.py 의 INTERVIEWER_STYLE_GUIDE 딕셔너리 키로 쓰여 LLM에게 어조
    지시문을 준다.
    ⚠️ BE 계약 주의: 이 enum 은 아직 BE(Spring)/ERD 에 대응 컬럼이 없는 신규 필드다.
    다른 enum과 동일하게 여기 적힌 문자열 값을 BE가 그대로 보내야 하므로,
    실제 반영 전 BE 팀과 정확한 문자열 스펙을 동기화해야 한다.
    """
    COMFORTABLE = "comfortable"  # 편안하게
    REALISTIC = "realistic"      # 실전처럼 (기본값)
    PRESSURE = "pressure"        # 압박형


# [BE 요청 형식 개편 - 신규] BE가 실제로 보내는 한글 wire 값 → 내부 InterviewerStyle enum
# 매핑. BE 신규 요청에서는 필드명 자체도 interviewer_style → ai_attitude_style로 바뀌었지만
# (schemas/interview.py 참고), 값의 내부 표현(enum)까지 바꿀 필요는 없으므로 기존 enum을
# 그대로 재사용하고 이 매핑 테이블로 wire 표현만 흡수한다.
# ⚠️ BE 확인 필요: "압박면접"만 실제 BE 예시 요청에서 확인된 값이다. 나머지 2개
# ("편안한 면접", "실전 면접")는 다른 필드(cs_categories 등)의 명명 패턴을 참고한 추정값이다.
# BE가 실제로 보내는 정확한 3개 문자열을 확인해서 이 딕셔너리를 반드시 수정할 것.
INTERVIEWER_STYLE_KOREAN_INPUT_MAP: dict[str, "InterviewerStyle"] = {
    "편안한 면접": InterviewerStyle.COMFORTABLE,
    "실전 면접": InterviewerStyle.REALISTIC,
    "압박면접": InterviewerStyle.PRESSURE,
}


class CSCategory(str, Enum):
    """
    [CS 카테고리 제한 기능 - 신규] CS 면접(InterviewType.CS)에서 사용자가 프론트 GUI에서
    고르는 9가지 CS 지식 카테고리. schemas/interview.py 의 QuestionGenerateRequest.cs_category
    필드 값으로 전달되며, 이 값 하나로 질문 생성 범위 전체가 "선택한 카테고리 내부"로
    제한된다 (services/rag_service.py 의 CS_CATEGORY_RAW_MAP → retrieve_cs_knowledge()의
    category 필터, services/question_service.py 의 카테고리별 랜덤 폴백 로직,
    prompts/templates.py 의 build_question_prompt() cs_category 섹션에서 전부 이 값을 기준으로 분기).

    ⚠️ BE 계약 주의: 이 enum 은 아직 BE(Spring)/ERD 에 대응 컬럼이 없는 신규 필드다.
    다른 enum(InterviewType 등)과 동일하게 여기 적힌 문자열 값을 BE가 그대로 보내야 하므로,
    실제 반영 전 BE 팀과 정확한 문자열 스펙을 동기화해야 한다.
    """
    DATA_STRUCTURE_ALGORITHM = "data_structure_algorithm"  # 자료구조 / 알고리즘
    OPERATING_SYSTEM = "operating_system"                    # 운영체제
    NETWORK = "network"                                       # 네트워크
    WEB = "web"                                                # WEB
    DATABASE = "database"                                      # 데이터베이스
    SECURITY = "security"                                      # 보안
    SOFTWARE_ENGINEERING = "software_engineering"              # 소프트웨어 공학
    AI = "ai"                                                   # AI
    LANGUAGE_FRAMEWORK = "language_framework"                  # 언어 및 프레임워크


# CS 카테고리 → 프롬프트에 노출할 한국어 라벨.
# prompts/templates.py 의 build_question_prompt() 가 "## CS 카테고리" 섹션을 만들 때,
# services/rag_service.py 가 CS 지식 부족 시 랜덤 검색 쿼리를 만들 때 사용한다.
CS_CATEGORY_LABEL: dict[CSCategory, str] = {
    CSCategory.DATA_STRUCTURE_ALGORITHM: "자료구조/알고리즘",
    CSCategory.OPERATING_SYSTEM: "운영체제",
    CSCategory.NETWORK: "네트워크",
    CSCategory.WEB: "WEB",
    CSCategory.DATABASE: "데이터베이스",
    CSCategory.SECURITY: "보안",
    CSCategory.SOFTWARE_ENGINEERING: "소프트웨어 공학",
    CSCategory.AI: "AI",
    CSCategory.LANGUAGE_FRAMEWORK: "언어 및 프레임워크",
}


# [BE 요청 형식 개편 - 신규] BE가 실제로 보내는 한글 wire 값(cs_categories 배열의 각 원소)
# → 내부 CSCategory enum 매핑. CS_CATEGORY_LABEL(우리가 프롬프트에 "노출"할 때 쓰는 라벨)과는
# 반대 방향의 매핑이며, 표기가 서로 다를 수 있어(BE 예시는 "자료구조", 기존 라벨은
# "자료구조/알고리즘") 두 표기를 모두 인식하도록 동의어를 함께 등록해둔다.
# schemas/interview.py 의 QuestionGenerateRequest._normalize_cs_categories() 가 이 맵으로
# 리스트의 각 항목을 미리 변환한 뒤 pydantic enum 검증에 넘긴다.
# ⚠️ BE 확인 필요: BE 예시 요청에는 "자료구조"/"네트워크"/"운영체제" 3개만 등장했다.
# 기존 CS_CATEGORY_LABEL의 "자료구조/알고리즘"과 표기가 달라 두 표기 모두 인식하게 해뒀다.
# 나머지 6개 카테고리(WEB/데이터베이스/보안/소프트웨어 공학/AI/언어 및 프레임워크)도 BE가
# 실제로 보낼 정확한 한글 문자열을 확인해서 이 표를 보강해야 한다(아래 값은 미확인 추정).
CS_CATEGORY_KOREAN_INPUT_MAP: dict[str, "CSCategory"] = {
    "자료구조": CSCategory.DATA_STRUCTURE_ALGORITHM,
    "자료구조/알고리즘": CSCategory.DATA_STRUCTURE_ALGORITHM,
    "알고리즘": CSCategory.DATA_STRUCTURE_ALGORITHM,
    "운영체제": CSCategory.OPERATING_SYSTEM,
    "네트워크": CSCategory.NETWORK,
    "WEB": CSCategory.WEB,
    "웹": CSCategory.WEB,
    "데이터베이스": CSCategory.DATABASE,
    "보안": CSCategory.SECURITY,
    "소프트웨어 공학": CSCategory.SOFTWARE_ENGINEERING,
    "AI": CSCategory.AI,
    "언어 및 프레임워크": CSCategory.LANGUAGE_FRAMEWORK,
}


# [면접관 스타일 반영 기능 - 신규] 면접관 스타일 → 프롬프트 설명용 한국어 라벨.
# CS_CATEGORY_LABEL과 동일한 패턴 — prompts/templates.py 가 직접 이 dict를 쓰진 않고
# INTERVIEWER_STYLE_GUIDE(스타일별 어조 지시문 전체 문장)를 별도로 두지만, 로깅/문서화
# 등에서 사람이 읽기 좋은 라벨이 필요할 때를 대비해 다른 enum과 동일한 구조로 유지한다.
INTERVIEWER_STYLE_LABEL: dict[InterviewerStyle, str] = {
    InterviewerStyle.COMFORTABLE: "편안하게",
    InterviewerStyle.REALISTIC: "실전처럼",
    InterviewerStyle.PRESSURE: "압박형",
}
