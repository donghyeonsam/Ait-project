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
    저장하고, services/rag_service.py 의 INTERVIEW_DOC_PREFERENCE 필터가 이 값으로
    "이 면접 유형에는 어떤 문서만 검색할지"를 결정한다.
    """
    RESUME = "resume"
    COVER_LETTER = "cover_letter"
    GITHUB = "github"


class InterviewType(str, Enum):
    """
    ai_interviews.interview_type.
    prompts/templates.py 의 INTERVIEW_TYPE_GUIDE 딕셔너리 키로 쓰여 면접 유형별 질문
    가이드를 결정하고, services/rag_service.py 의 INTERVIEW_DOC_PREFERENCE 로 RAG
    검색 범위를 결정한다 — 이 enum 값 하나가 질문 생성/RAG 검색 양쪽 분기의 기준이 된다.
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
