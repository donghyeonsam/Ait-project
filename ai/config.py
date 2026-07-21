"""애플리케이션 설정 (.env 로부터 로드)"""
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    # ── GMS LLM ──
    gms_key: str = ""
    gms_base_url: str = "https://gms.ssafy.io/gmsapi/api.openai.com/v1"
    gms_model: str = "gpt-5.4-nano"
    gms_timeout: float = 60.0

    # ── Chroma DB ──
    chroma_persist_dir: str = "/app/chroma_data"
    chroma_collection: str = "user_documents"       # 개인 문서(이력서/자소서/깃허브)
    chroma_cs_collection: str = "cs_knowledge"       # CS 전역 지식

    # CS 지식 시드 파일 (git 에 포함, 컬렉션 비어있을 때 서버 기동 시 자동 임베딩)
    cs_seed_path: str = "data/cs_knowledge.json"

    # ── 임베딩 모델 ──
    embedding_model: str = "jhgan/ko-sroberta-multitask"

    # ── 면접 규칙 ──
    question_count: int = 10
    max_followup_per_question: int = 2
    rag_top_k: int = 5
    cs_top_k: int = 4  # CS 면접 시 CS 지식에서 가져올 개수

    # ── 서버 ──
    app_env: str = "development"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()