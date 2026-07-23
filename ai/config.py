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
    gms_model: str = "gpt-5.4-mini"
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
    # [루브릭 아키텍처 전환] 기존에는 질문 10개를 한 번에 생성해 전체 면접 흐름을 미리 확정했으나,
    # 새 아키텍처는 "질문 5개 + 질문당 루브릭"만 미리 세팅해두고, 실제 꼬리질문은 답변을 채점하며
    # 실시간으로 동적 생성한다(Phase 2, 이번 커밋 범위 아님). 그래서 기본 질문 수를 5개로 축소한다.
    question_count: int = 5
    max_followup_per_question: int = 2
    # 질문 1개당 생성할 채점 기준(rubric) 개수 범위. LLM에게 "최소~최대 몇 개" 형태로 지시하고,
    # question_service 에서 응답을 이 범위로 검증/트리밍하는 데 사용한다.
    rubric_min_count: int = 2
    rubric_max_count: int = 3
    rag_top_k: int = 5
    cs_top_k: int = 4  # CS 면접 시 CS 지식에서 가져올 개수
    # [CS 카테고리 제한 기능 - 신규] CS 면접에서 "사용자가 고른 CS 카테고리"와 "지원자
    # 개인 문서(이력서/자소서/GitHub)"의 관련도를 판단하는 코사인 거리 임계값.
    # services/rag_service.py 의 retrieve_context() 결과 중 최상위 문서의 distance 가
    # 이 값보다 크면(=유사도가 낮으면) "개인 문서가 이 카테고리와 무관하다"고 보고
    # services/question_service.py 가 개인 문서 컨텍스트를 버린 뒤, 해당 카테고리
    # CS 지식에서 랜덤으로 뽑아 질문을 생성하도록 폴백한다.
    # (Chroma는 hnsw:space=cosine 설정이라 distance = 1 - cosine_similarity, 0에 가까울수록
    #  유사. 0.45는 "느슨하게라도 관련은 있다" 수준의 경험적 기본값 — 실제 서비스 운영하며
    #  데이터를 보고 튜닝 필요.)
    cs_relevance_distance_threshold: float = 0.45

    # ── 서버 ──
    app_env: str = "development"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()