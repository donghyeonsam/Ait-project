"""서버가 정상인지 확인하는 API 들."""
import logging
from pathlib import Path

from fastapi import APIRouter

from config import settings

logger = logging.getLogger(__name__)
router = APIRouter(tags=["health"])


@router.get("/health")
async def health():
    """서버가 살아있는지만 확인한다. 다른 건 아무것도 안 보고 바로 응답한다."""
    return {"status": "ok"}


@router.get("/health/model")
async def model_health():
    """
    학습된 모델 파일이 제자리에 있는지 확인한다.
    배포한 뒤 '모델 파일 커밋하는 걸 깜빡했다' 같은 실수를 빨리 발견하기 위한 용도.
    """
    return {
        "face_model": Path(settings.face_model_path).exists(),
        "voice_model": Path(settings.voice_model_path).exists(),
    }


@router.get("/health/worker")
async def worker_health():
    """
    대기열(Celery) 방식을 쓸 때만 의미가 있다.
    기본 구성에서는 Celery 를 안 쓰므로 no_worker 가 정상이다.
    """
    try:
        from worker.celery_app import celery_app
        # ping 은 살아있는 워커들에게 신호를 보내 응답을 모은다.
        # 워커가 죽었을 때 이 API 가 오래 매달리지 않도록 대기 시간을 짧게 잡는다.
        pong = celery_app.control.ping(timeout=1.0)
    except Exception as exc:
        return {"status": "disabled", "detail": str(exc)}
    return {"status": "ok" if pong else "no_worker", "workers": len(pong or [])}
