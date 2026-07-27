"""
분석 문서(구조화 임베딩 포맷) 내부 파싱 모델

[이 파일이 FastAPI 요청/응답 스키마가 "아닌" 이유]
BE가 이력서/자소서/GitHub 분석 시 별도의 "분석 LLM"을 한 번 더 돌려서, 이미 의미
단위로 청킹되고 메타데이터(역량/면접 질문 주제/키워드/불확실한 점 등)가 붙은
구조화된 JSON을 만들어 우리에게 넘긴다. 하지만 이 JSON은 FastAPI가 자동으로 검증해
주는 "요청 바디"가 아니라, `schemas.embedding.EmbeddingItem.content`라는 str 필드
안에 문자열 그대로 실려 온다(분석 LLM의 출력 자체가 텍스트이기 때문). 그래서 여기
정의된 모델들은 `EmbeddingItem.content`를 `json.loads()`로 파싱한 *이후*, 그 결과를
서비스 레이어(`services/embedding_service.py`) 내부에서 다루기 편하게 하려는 용도일
뿐이며, FastAPI 라우터 계층의 요청 검증에는 전혀 관여하지 않는다.

[왜 필드 타입을 이렇게 느슨하게 뒀는가]
BE로부터 받은 정식 스펙 문서와 실제 GitHub 분석 샘플 데이터를 대조해보니 100%
일치하지 않았다:
  - 스펙 문서는 "technologies.evidence/problems_and_solutions.evidence/
    results.evidence는 사용하지 않는다"고 명시했지만, 실제 GitHub 샘플에는
    이 evidence 필드들이 실제로 들어있었다.
  - 스펙 문서 "공통 enum" 목록에 없는 값(competency VERSION_CONTROL/CLEAN_CODE,
    question_type CODE_QUALITY, chunk_type COMMIT_HISTORY 등)이 실제 GitHub
    샘플에는 이미 쓰이고 있었다. GitHub 쪽 enum은 아직 확정되지 않았고 계속
    늘어날 예정이라는 뜻이다.
  - GitHub는 이력서/자소서와 달리 아직 정식 스펙 문서 자체가 없고, 실제 응답 샘플
    1건만 확보한 상태다. `document_summary`가 있는지, 있다면 이력서/자소서와
    같은 구조인지조차 확인하지 못했다.
따라서 `chunk_type`/`competencies`/`question_type` 같은 "enum처럼 보이는" 값들을
Python Enum으로 강하게 고정하면, 문서화되지 않은 새 값이 올 때마다(특히 GitHub)
pydantic 검증 실패로 임베딩 요청 전체가 튕겨나가는 사고가 난다 — 이 프로젝트가
BE 요청 형식 변경 대응 과정에서 이미 여러 번 겪은 것과 같은 종류의 문제이므로,
이런 필드는 전부 `str`/`list[str]`/`dict[str, Any]`로 느슨하게 받는다. 문서 유형별로
내부 구조가 크게 다르고 GitHub는 스펙조차 미확정인 `details`도 같은 이유로 통짜
`dict[str, Any]`로 받는다(엄격한 pydantic 모델을 문서 유형마다 따로 만들면 GitHub
쪽에서 계속 깨질 위험이 큼).

[GitHub만 details 안의 필드명이 다름 — 주의]
이력서/자소서 `details`는 `source_item_type`이라는 키를 쓰지만, GitHub `details`는
`source_type`이라는 다른 키 이름을 쓴다. 이번 작업에서는 `details`를 통째로 opaque한
JSON blob으로 저장/복원만 하므로(개별 필드를 꺼내 쓰지 않음) 코드상 문제가 되지는
않지만, 나중에 `details` 내부 필드를 직접 파싱하는 코드를 추가할 사람을 위해
남겨두는 주의사항이다.

[extra="ignore"인 이유]
`EmbeddingDocumentChunk`/`AnalysisDocument`에 정의되지 않은 필드가 실제 데이터에
섞여 있어도(위에서 설명한 스펙-실데이터 불일치처럼) 파싱 자체가 깨지면 안 되므로,
알 수 없는 필드는 조용히 무시하고 정의된 필드만 골라 쓴다.
"""
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator


class EmbeddingDocumentChunk(BaseModel):
    """
    `embedding_documents[]`의 항목 1개 = Chroma에 저장할 문서(청크) 1개.
    `embedding_text`만 실제 임베딩(벡터화) 대상이고, 나머지는 전부 메타데이터로
    Chroma에 평탄화해 저장한다(services/embedding_service.py 참고).
    """

    model_config = ConfigDict(extra="ignore")

    chunk_id: str = Field(..., description="BE가 부여한 청크 고유 id (문서 내에서 유일)")
    parent_id: str | None = None
    experience_id: str | None = None
    # enum처럼 보이지만 GitHub 쪽 값이 아직 미확정/계속 추가될 예정이라 str로 느슨하게 받는다.
    chunk_type: str = ""
    title: str | None = None
    summary: str | None = None
    competencies: list[str] = Field(default_factory=list)
    # [{"topic": ..., "reason": ..., "question_type": ...}, ...] — question_type도
    # 같은 이유로 dict 내부에서 str 그대로 둔다(별도 모델화하지 않음).
    question_topics: list[dict[str, Any]] = Field(default_factory=list)
    uncertainties: list[str] = Field(default_factory=list)
    keywords: list[str] = Field(default_factory=list)
    embedding_text: str = ""
    # 문서 유형(이력서/자소서/GitHub)마다 내부 구조가 다르고 GitHub는 스펙조차
    # 미확정이므로 통짜 dict로 받는다 — 저장 시 json.dumps(), 사용 시 json.loads()로
    # 복원한다(services/embedding_service.py 의 _build_chunk_metadata() 참고).
    details: dict[str, Any] = Field(default_factory=dict)

    @field_validator("competencies", "uncertainties", "keywords", mode="before")
    @classmethod
    def _coerce_str_list(cls, v: Any) -> list[str]:
        """실제 데이터가 None이거나 리스트가 아니어도(스펙-실데이터 불일치 대비)
        예외를 내지 않고 빈 리스트로 방어한다."""
        return v if isinstance(v, list) else []

    @field_validator("question_topics", mode="before")
    @classmethod
    def _coerce_dict_list(cls, v: Any) -> list[Any]:
        return v if isinstance(v, list) else []

    @field_validator("details", mode="before")
    @classmethod
    def _coerce_dict(cls, v: Any) -> dict:
        return v if isinstance(v, dict) else {}


class AnalysisDocument(BaseModel):
    """
    `EmbeddingItem.content`를 json.loads() 한 최상위 구조.
    `document_summary`/`cross_document_insights`는 이번 작업 범위에서 검색 가능한
    Chroma 문서로 만들지 않는다(RAG에서 어떻게 활용할지 아직 결정되지 않음) — 구조
    검증 겸 향후 확장 대비로 파싱만 해두고, 사용하지 않는다는 점을 명확히 하기 위해
    타입을 `Any`로 두고 `.get()` 등 방어적 접근만 허용한다(엄격한 dict 구조를
    강제하면 GitHub처럼 이 필드가 아예 없거나 다른 구조인 경우 파싱 자체가 실패할
    수 있음).
    """

    model_config = ConfigDict(extra="ignore")

    schema_version: str | None = None
    document_type: str | None = None
    document_summary: Any | None = None
    # 개별 청크는 여기서 바로 EmbeddingDocumentChunk로 엄격 검증하지 않는다 — 청크
    # 하나가 스펙과 안 맞아 검증에 실패해도 문서 전체(다른 청크들)까지 함께 버려지면
    # 안 되므로, 원시 dict 그대로 받아두고 services/embedding_service.py 가 청크
    # 단위로 하나씩 검증해 실패한 것만 건너뛴다.
    embedding_documents: list[dict[str, Any]] = Field(default_factory=list)
    cross_document_insights: Any | None = None


class AnalysisDocumentError(Exception):
    """
    구조화 분석 문서 포맷이 "명백히" 손상된 경우에만 발생시키는 예외
    (예: `embedding_documents` 키는 있는데 그 값이 리스트가 아님).

    이 프로젝트는 애매한 파싱 실패를 과도한 검증으로 막는 것을 경계해왔으므로,
    `content`가 새 구조화 포맷인지 애매하면(JSON 파싱 자체가 실패하거나
    `embedding_documents` 키가 아예 없으면) 조용히 기존 평문 청킹 경로로
    fallback한다 — 이 예외는 오직 "새 포맷인 것은 확실한데 구조 자체가 깨진" 경우에만
    쓰여, routers/embedding.py 가 이를 400(클라이언트 요청 오류)으로 명확히 알릴 수
    있게 한다.
    """
