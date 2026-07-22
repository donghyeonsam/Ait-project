"""공통 enum / 타입 정의 (ERD 기준)"""
from enum import Enum


class DocType(str, Enum):
    """analyses.type 과 매핑 - 임베딩 문서의 출처"""
    RESUME = "resume"
    COVER_LETTER = "cover_letter"
    GITHUB = "github"


class InterviewType(str, Enum):
    """ai_interviews.interview_type"""
    JOB = "job"            # 직무 면접
    CS = "cs"             # CS 면접
    TECH = "tech"          # 기술 면접
    PORTFOLIO = "portfolio"  # 포트폴리오 면접
    COMPREHENSIVE = "comprehensive"  # 종합 (전체 포괄)


class Difficulty(str, Enum):
    EASY = "easy"
    NORMAL = "normal"
    HARD = "hard"
