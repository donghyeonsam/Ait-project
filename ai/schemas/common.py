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
