"""
AI 모의 면접 - FastAPI 엔트리포인트

[전체 서비스 흐름]
이 파일은 uvicorn 이 띄우는 ASGI 앱의 시작점이며, 아래 순서로 BE(Spring Boot)와
상호작용하는 4개 라우터를 등록한다.

  1) 이력서/자소서/GitHub 분석 완료 → routers/embedding.py
     → services/embedding_service.py 가 청킹 후 Chroma(user_documents 컬렉션)에 저장
  2) (최초 1회, 서버 기동 시) CS 지식 시드 데이터 → services/cs_embedding_service.py
     → Chroma(cs_knowledge 컬렉션)에 저장. routers/cs_knowledge.py 는 이 데이터를
     BE/운영자가 수동으로 재구축할 때 쓰는 관리용 엔드포인트.
  3) 면접 시작 → routers/interview.py `/questions`
     → services/rag_service.py 로 1)에서 저장한 문서를 검색(RAG) →
       services/question_service.py 가 GMS LLM 으로 질문 5개 + rubric(채점 기준) 생성
  4) 사용자가 답변 제출 → routers/interview.py `/followup` (동기, rubric 채점 + 꼬리질문)
     답변 분석/보완/평가는 Spring Boot(BE)가 담당한다(2026-07-31,
     docs/AI_개발일지_0731.md 참고).

즉 이 서비스는 "①문서를 미리 벡터DB에 넣어두고 → ②면접 중 그 문서를 검색 근거로
삼아 LLM 을 호출"하는 RAG 파이프라인이며, main.py 는 그 파이프라인이 쓸 Chroma
컬렉션과 CS 지식 시드를 서버 기동 시점에 미리 준비해두는 역할을 한다.
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
    """
    FastAPI lifespan 훅 - 서버 프로세스가 살아있는 동안 딱 한 번 실행되는 준비 구간.

    [왜 여기서 미리 로딩하는가]
    Chroma 클라이언트와 SentenceTransformer 임베딩 모델(jhgan/ko-sroberta-multitask)은
    최초 생성 시 모델 파일 로딩 비용이 크다(수 초 단위). 이걸 첫 API 요청이 들어올 때
    지연시켜(lazy) 로딩하면 그 요청을 보낸 BE/사용자가 불필요하게 오래 기다리게 되므로,
    서버가 트래픽을 받기 전인 lifespan 단계에서 미리 로딩해 첫 요청부터 빠르게 응답하도록 한다.
    """
    logger.info("서버 기동: 임베딩 모델 로딩 중...")
    get_collection()      # 개인 문서 컬렉션(user_documents) - RAG 검색 대상
    get_cs_collection()   # CS 지식 컬렉션(cs_knowledge) - CS/종합 면접 시 검색 대상

    # CS 지식은 모든 사용자가 공유하는 전역 데이터라, 팀원이 다시 클론해도 매번 수동으로
    # 임베딩할 필요 없이 git에 커밋된 시드 JSON(data/cs_knowledge.json)으로 자동 채운다.
    # 컬렉션에 이미 데이터가 있으면(=한 번이라도 임베딩된 적 있으면) 재실행을 건너뛴다.
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

# 라우터 등록 - 각 라우터의 책임 범위는 위 "전체 서비스 흐름" 주석 참고.
app.include_router(health.router)      # 헬스체크 (인프라/로드밸런서용)
app.include_router(embedding.router)   # 개인 문서 임베딩 저장/삭제
app.include_router(interview.router)   # 질문 생성 / 꼬리질문 채점
app.include_router(cs_knowledge.router)  # CS 지식 임베딩 관리(전량 재구축용)