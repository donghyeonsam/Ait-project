"""
AI 모의 면접 - FastAPI 엔트리포인트
- 이력서/자소서/깃허브 분석 데이터 임베딩 (Chroma)
- RAG 기반 면접 질문 생성 (GMS gpt-5.4-nano)
- 답변 기반 꼬리질문 생성
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from config import settings
from db.chroma import get_collection, get_cs_collection
from services.cs_embedding_service import seed_cs_knowledge_if_empty
from routers import health, embedding, interview, cs_knowledge

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 앱 기동 시 Chroma + 임베딩 모델 미리 로딩 (첫 요청 지연 방지)
    logger.info("서버 기동: 임베딩 모델 로딩 중...")
    get_collection()      # 개인 문서 컬렉션
    get_cs_collection()   # CS 지식 컬렉션
    # CS 지식이 비어있으면 시드 JSON 자동 임베딩 (git 공유용)
    seed_cs_knowledge_if_empty()
    logger.info("준비 완료 (model=%s, collections=%s, %s)",
                settings.embedding_model,
                settings.chroma_collection, settings.chroma_cs_collection)
    yield
    logger.info("서버 종료")


app = FastAPI(
    title="AI 모의 면접 API",
    description="RAG 기반 면접 질문/꼬리질문 생성 서비스",
    version="1.0.0",
    lifespan=lifespan,
)

app.include_router(health.router)
app.include_router(embedding.router)
app.include_router(interview.router)
app.include_router(cs_knowledge.router)