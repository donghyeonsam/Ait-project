"""
헬스체크 라우터

[전체 서비스 흐름에서의 위치] 면접 로직과는 무관하며, 컨테이너 오케스트레이션
(docker-compose/로드밸런서)이 "이 FastAPI 프로세스가 살아있는지"만 확인하는 용도다.
GMS 연동이나 Chroma 상태와는 무관하게 프로세스 자체의 응답 여부만 본다 — 그래서
DB나 외부 API를 호출하지 않고 즉시 응답한다(외부 의존성에 걸려 헬스체크 자체가
느려지거나 실패하는 것을 방지).
"""
from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/")
def health_check():
    """루트 경로 헬스체크 — 배포 환경에 따라 "/" 로 핑을 보내는 경우 대비."""
    return {"status": "ok"}


@router.get("/health")
def health():
    """표준 헬스체크 엔드포인트."""
    return {"status": "ok"}
