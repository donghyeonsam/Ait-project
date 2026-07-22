"""임베딩 관련 요청/응답 스키마"""
from pydantic import BaseModel, Field

from schemas.common import DocType


class EmbeddingItem(BaseModel):
    """임베딩할 개별 문서 (analyses 테이블 1행에 대응)"""
    doc_type: DocType = Field(..., description="문서 출처: resume/cover_letter/github")
    target_id: int = Field(..., description="원본 테이블 PK (analyses.target_id)")
    content: str = Field(..., description="분석 결과 텍스트 (analyses.content)")
    # 선택 메타 - GitHub repo 이름, 자소서 회사명 등 검색 품질 향상용
    title: str | None = Field(None, description="문서 제목/레포명/회사명 등")


class EmbedRequest(BaseModel):
    """
    사용자 분석 데이터 임베딩 요청.
    Spring Boot 가 이력서/자소서/깃허브 분석(analyses) 저장 후 호출.
    """
    user_id: int = Field(..., description="users.id")
    items: list[EmbeddingItem] = Field(..., min_length=1)
    replace: bool = Field(
        True,
        description="True 이면 해당 user_id 의 기존 임베딩 삭제 후 재삽입 (중복 방지)",
    )


class EmbedResponse(BaseModel):
    user_id: int
    embedded_count: int
    chunk_count: int = Field(..., description="분할된 청크 총 개수")
    message: str = "임베딩 완료"


class DeleteEmbeddingResponse(BaseModel):
    user_id: int
    deleted: bool
    message: str
