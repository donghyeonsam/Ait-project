"""CS 전역 지식 임베딩 관련 스키마 (category / concept / content)"""
from pydantic import BaseModel, Field


class CSKnowledgeItem(BaseModel):
    """CS 지식 한 조각 (gyoogle 개념 하나에 대응)"""
    category: str = Field(..., description="대분류 (예: 운영체제, 네트워크, 데이터베이스)")
    concept: str = Field(..., description="개념명 (예: 프로세스와 스레드, TCP 3-way handshake)")
    content: str = Field(..., description="개념 설명 본문 (실제 임베딩 대상)")


class CSEmbedRequest(BaseModel):
    """CS 지식 임베딩 요청. gyoogle 레포를 category/concept/content 로 가공해 배치 전송."""
    items: list[CSKnowledgeItem] = Field(..., min_length=1)
    replace: bool = Field(
        False,
        description="True 이면 CS 지식 컬렉션 전체를 비우고 새로 삽입 (전량 재구축 시)",
    )


class CSEmbedResponse(BaseModel):
    embedded_count: int = Field(..., description="저장된 개념 수")
    chunk_count: int = Field(..., description="분할된 청크 총 개수")
    total_in_collection: int = Field(..., description="현재 CS 지식 컬렉션의 전체 청크 수")
    message: str = "CS 지식 임베딩 완료"


class CSDeleteResponse(BaseModel):
    deleted: bool
    message: str