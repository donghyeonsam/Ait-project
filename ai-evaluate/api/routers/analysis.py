"""
분석 요청을 받는 곳.

[표정과 음성이 다르게 동작한다]

  표정 (POST /analyses/face)
    프론트(브라우저)가 이미 무거운 계산을 다 끝내고 '숫자 묶음'만 보낸다.
    서버는 그 숫자를 평균 내고 작은 모델에 넣기만 하면 되어 수 밀리초면 끝난다.
    그래서 요청 한 번에 결과까지 바로 돌려준다.

  음성 (POST /analyses/voice)
    브라우저에서는 계산할 수 없는 지표(목소리 떨림 등)가 있어서 소리 파일 자체를
    서버로 보내야 한다. 분석에 2~3초가 걸린다.
    BE(Spring)가 @Async 로 이미 별도 스레드에서 호출하므로, 여기서 또 대기표를
    발급하지 않고 그 자리에서 처리해 결과를 바로 돌려준다.

  음성 (큐 방식, 선택 사항)
    POST /analyses/voice/queue + GET /analyses/voice/{task_id}
    BE 가 기다릴 수 없는 상황이면 이 방식을 쓴다. Celery/Redis 가 필요하다.
      docker compose --profile queue up -d
"""
from __future__ import annotations

import asyncio
import logging
import os
import tempfile
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi import status as http_status

from api.schemas.analysis import (
    FaceAnalyzeRequest,
    FaceResult,
    TaskStatus,
    VoiceAcceptedResponse,
    VoiceResult,
    VoiceResultResponse,
    responsestub, # 모델 학습 완료되면 삭제될 예정 41
)
from config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/analyses", tags=["analysis"])

# 받아줄 소리 파일 확장자.
# 브라우저 MediaRecorder 는 보통 .webm 을 만든다.
_ALLOWED_AUDIO_SUFFIX = {".wav", ".mp3", ".m4a", ".webm", ".ogg", ".flac", ".opus"}

# ── 동시 실행을 두 겹으로 제한한다 ──
#
# ① 세마포어 : "주차 자리 개수". 자리가 다 차면 다음 요청은 여기서 기다린다.
#    이게 없으면 Spring 의 @Async 스레드 수만큼 분석이 한꺼번에 돌아 CPU 가 꽉 차고,
#    같은 서버의 화상면접(LiveKit)이 끊긴다.
#
# ② 전용 스레드 묶음 : 실제로 일할 수 있는 스레드 개수를 못 박는다.
#    파이썬은 이미 돌고 있는 스레드를 강제로 멈출 수 없어서, 시간 초과가 나도
#    그 분석은 끝날 때까지 계속 돈다. 이때 세마포어 자리는 반납되므로 ①만 있으면
#    멈춘 작업 + 새 작업이 겹쳐 실제 동시 실행이 제한을 넘어설 수 있다.
#    스레드 개수 자체를 묶어두면 그런 상황에서도 CPU 사용량이 늘어나지 않는다.
#    (대신 멈춘 작업이 쌓이면 새 요청이 처리되지 못하고 대기하게 되는데,
#     이는 CPU 가 녹아 화상면접까지 죽는 것보다 낫다는 판단이다)
_voice_semaphore = asyncio.Semaphore(settings.voice_concurrency)
_voice_executor = ThreadPoolExecutor(
    max_workers=settings.voice_concurrency,
    thread_name_prefix="voice-analysis",
)


# ══════════════════════════ 표정 ══════════════════════════

@router.post("/face", response_model=FaceResult)
async def analyze_face(payload: FaceAnalyzeRequest):
    if True: # 모델 학습 완료되면 삭제될 예정 76 ~ 77
        return responsestub(score=8) 
    """
    표정 분석. 프론트가 보낸 프레임별 숫자 묶음을 받아 점수를 바로 돌려준다.

    영상 파일은 서버로 올라오지 않는다. 얼굴 인식은 브라우저에서 이미 끝났고,
    여기로 오는 건 그 결과 숫자뿐이다.

    [응답] {"score": 7.3} - 음성(/analyses/voice)과 완전히 같은 형태라 BE 는 두
    모달리티를 같은 DTO 로 받을 수 있다.
    """
    # 무거운 라이브러리(torch 등)는 서버가 켜질 때가 아니라
    # 첫 요청이 들어올 때 불러온다. 그래야 서버 기동이 빠르다.
    from core.face.aggregator import aggregate_from_request
    from core.face.predictor import predict_face

    if len(payload.frames) > settings.max_face_frames:
        raise HTTPException(
            status_code=http_status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=(f"프레임이 너무 많습니다({len(payload.frames)}개). "
                    f"최대 {settings.max_face_frames}개까지 허용됩니다."),
        )

    try:
        agg = aggregate_from_request(payload)
        result = predict_face(agg)
    except ValueError as e:
        # 프레임이 너무 적거나 숫자 개수가 안 맞는 등 '보낸 값이 잘못된' 경우
        raise HTTPException(status_code=http_status.HTTP_400_BAD_REQUEST,
                            detail=str(e)) from e
    except FileNotFoundError as e:
        # 아직 모델을 학습하지 않아 서버가 준비되지 않은 경우
        raise HTTPException(status_code=http_status.HTTP_503_SERVICE_UNAVAILABLE,
                            detail=str(e)) from e
    except Exception as e:
        # 예상 못 한 오류. 원인을 찾을 수 있도록 자세한 내용을 로그에 남긴다.
        logger.exception("[face] 분석 실패")
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="표정 분석 중 오류가 발생했습니다") from e

    return FaceResult(**result)


# ══════════════════════════ 음성 (기본: 그 자리에서 처리) ══════════════════════════

def _analyze_audio_bytes(data: bytes, suffix: str) -> dict:
    """
    소리 데이터(바이트) 하나를 분석해 점수를 낸다.

    [왜 바이트를 잠깐 파일로 저장하나]
    바이트는 파일 '내용물'이라 파일과 완전히 같은 데이터다. 분석 결과도 똑같다.
    다만 우리가 쓰는 분석 도구들이 "파일이 어디 있는지 위치를 알려줘" 라고 요구한다.
      - Praat(목소리 떨림 계산) : 파일 경로를 받는다
      - ffmpeg(webm 같은 형식을 여는 도구) : 파일 경로를 받는다
    그래서 잠깐 저장했다가 분석이 끝나면 지운다.
    저장에 걸리는 시간은 눈 깜빡할 새보다 짧아서(수 밀리초) 신경 쓸 수준이 아니다
    (분석 자체는 2~3초 걸린다).

    이 함수는 시간이 오래 걸리는 '느린 작업'이라, 호출하는 쪽에서 별도 스레드로 돌린다.
    """
    from core.voice.feature_extractor import extract_voice_features
    from core.voice.predictor import predict_voice

    # delete=False 로 만들고 아래에서 직접 지운다.
    # (자동 삭제로 두면 파일을 닫는 순간 사라져서 다음 줄에서 열 수 없다)
    #
    # 파일 경로를 먼저 확보하고 그 즉시 try 로 감싼다.
    # 쓰는 도중에 실패해도(디스크 꽉 참 등) finally 가 실행되어 파일이 남지 않는다.
    fd, tmp_path = tempfile.mkstemp(suffix=suffix)
    try:
        with os.fdopen(fd, "wb") as f:
            f.write(data)

        feature, extras = extract_voice_features(tmp_path)
        result = predict_voice(feature)
        # 발화 속도, 무음 비율은 모델을 거치지 않고 계산된 값이다.
        # 사용자에게 "왜 이 점수인지" 근거로 보여줄 때 쓴다.
        result.update(extras)
        return result
    finally:
        # 성공하든 실패하든 임시 파일은 반드시 지운다. 안 지우면 디스크가 찬다.
        Path(tmp_path).unlink(missing_ok=True)


def _check_suffix(filename: str | None) -> str:
    """파일 이름에서 확장자를 꺼내고, 지원하는 형식인지 확인한다."""
    suffix = Path(filename or "").suffix.lower()
    if suffix not in _ALLOWED_AUDIO_SUFFIX:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=(f"지원하지 않는 확장자입니다: {suffix or '(없음)'}. "
                    f"허용: {', '.join(sorted(_ALLOWED_AUDIO_SUFFIX))}"),
        )
    return suffix


@router.post("/voice", response_model=VoiceResult)
async def analyze_voice(
    file: UploadFile = File(...),
    request_id: str | None = Form(
        None, description="로그 추적용 식별자(선택). 예: 면접ID-질문번호"),
):
    """
    음성 분석. 소리 파일(또는 바이트)을 받아 점수를 바로 돌려준다.

    [BE(Spring) 연동 방법]
      @Async 가 붙은 메서드에서 이 API 를 호출하고, 응답을 그대로 Redis 에 저장하면 된다.
      Spring 쪽이 이미 별도 스레드에서 돌고 있으므로 2~3초 기다려도 사용자 요청을
      막지 않는다. 자세한 예시는 docs/SPRING_INTEGRATION.md 참고.

    ⚠️ BE 쪽 HTTP 클라이언트의 read timeout 을 넉넉히(최소 30초) 잡아야 한다.
       기본값이 짧으면 분석이 끝나기 전에 BE 가 먼저 끊어버린다.

    ⚠️ 파일 이름(filename)을 꼭 같이 보내야 한다. 서버가 그 확장자를 보고
       "이건 webm 이니까 이렇게 열어야겠다" 를 판단하기 때문이다.

    request_id 는 선택 항목이다. 여러 요청이 동시에 들어올 때 로그에서 어느 요청인지
    구분하려면 넣어주는 게 좋다(예: "42-3" = 면접 42번의 3번째 질문).
    """
    rid = request_id or "-"
    suffix = _check_suffix(file.filename)

    data = await file.read()
    if not data:
        raise HTTPException(status_code=http_status.HTTP_400_BAD_REQUEST,
                            detail="빈 파일입니다")

    # 크기 제한. 실수로 영상 파일을 통째로 보내는 경우 등으로부터 서버 메모리를 지킨다.
    if len(data) > settings.max_audio_bytes:
        raise HTTPException(
            status_code=http_status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=(f"파일이 너무 큽니다({len(data) / 1024 / 1024:.1f}MB). "
                    f"최대 {settings.max_audio_bytes / 1024 / 1024:.0f}MB 까지 "
                    "허용됩니다."),
        )

    logger.info("[voice][%s] 접수 (%s, %.1fKB)", rid, suffix, len(data) / 1024)

    # 여기서 '자리'를 하나 잡는다. 자리가 다 찼으면 빌 때까지 기다린다.
    async with _voice_semaphore:
        # '접수' 와 '시작' 을 나눠 찍는다. 자리가 없어 대기 중인 요청까지 전부
        # "시작" 으로 보이면 실제로 몇 개가 돌고 있는지 로그로 알 수 없다.
        logger.info("[voice][%s] 분석 시작", rid)
        loop = asyncio.get_running_loop()
        try:
            # 전용 스레드 묶음에 일을 넘긴다. 느린 작업을 여기서 직접 돌리면
            # 2~3초 동안 서버 전체가 멈춰 헬스체크조차 응답하지 못한다.
            future = loop.run_in_executor(
                _voice_executor, _analyze_audio_bytes, data, suffix)
            result = await asyncio.wait_for(
                future, timeout=settings.voice_timeout_sec)
        except asyncio.TimeoutError:
            # ⚠️ 여기서 응답은 돌려주지만 그 분석 자체는 백그라운드에서 계속 돈다.
            #    파이썬이 스레드를 강제로 멈출 수 없기 때문이다. 위 _voice_executor
            #    주석 참고. 이 로그가 반복해서 찍히면 원인을 조사해야 한다.
            logger.error("[voice][%s] 시간 초과 (%.0f초) - 해당 작업은 백그라운드에서 "
                         "계속 실행됩니다", rid, settings.voice_timeout_sec)
            raise HTTPException(
                status_code=http_status.HTTP_504_GATEWAY_TIMEOUT,
                detail="음성 분석 시간이 초과되었습니다") from None
        except ValueError as e:
            # 오디오가 너무 짧거나 형식이 깨진 경우
            raise HTTPException(status_code=http_status.HTTP_400_BAD_REQUEST,
                                detail=str(e)) from e
        except FileNotFoundError as e:
            # 아직 모델을 학습하지 않은 경우
            raise HTTPException(
                status_code=http_status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=str(e)) from e
        except Exception as e:
            # 소리 파일이 깨졌거나 형식이 안 맞아 라이브러리가 읽지 못한 경우가 대부분이다.
            # 원인 추적을 위해 자세한 내용은 로그에 남기고, 응답에는 간단한 메시지만 준다.
            logger.exception("[voice][%s] 분석 실패", rid)
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail="오디오를 읽거나 분석할 수 없습니다. 파일 형식과 확장자를 확인해주세요."
            ) from e

    logger.info("[voice][%s] 분석 완료", rid)
    return VoiceResult(**result)


# ══════════════════════════ 음성 (선택: 대기표 방식) ══════════════════════════
# 아래 두 API 는 Celery + Redis 가 켜져 있을 때만 동작한다.
#   docker compose --profile queue up -d
# BE 가 2~3초를 기다릴 수 없는 상황에서만 쓰면 된다. 기본 구성에서는 필요 없다.

_CELERY_STATE_MAP = {
    "PENDING": TaskStatus.PENDING,     # 아직 차례가 안 옴
    "RECEIVED": TaskStatus.PENDING,
    "STARTED": TaskStatus.RUNNING,     # 처리 중
    "RETRY": TaskStatus.RUNNING,
    "SUCCESS": TaskStatus.SUCCEEDED,
    "FAILURE": TaskStatus.FAILED,
}


@router.post(
    "/voice/queue",
    response_model=VoiceAcceptedResponse,
    status_code=http_status.HTTP_202_ACCEPTED,
)
async def request_voice_analysis_queued(file: UploadFile = File(...)):
    """
    음성 분석을 대기열에 넣고 번호표(task_id)만 돌려준다.
    결과는 아래 GET 으로 따로 물어봐야 한다.

    202 라는 응답 코드는 '완료'가 아니라 '접수됨'을 뜻한다.
    """
    from worker.celery_app import celery_app
    from worker.storage import storage

    suffix = _check_suffix(file.filename)
    key = storage.save(file.file, suffix, "voice")

    # 작업 함수를 직접 불러오지 않고 '이름'으로 대기열에 넣는다.
    # 이렇게 해야 이 서버가 무거운 분석 라이브러리를 메모리에 올리지 않는다.
    async_result = celery_app.send_task("worker.tasks.analyze_voice", args=[key])
    return VoiceAcceptedResponse(task_id=async_result.id)


@router.get("/voice/{task_id}", response_model=VoiceResultResponse)
async def get_voice_result(task_id: str):
    """
    번호표로 진행 상황과 결과를 확인한다.

    ⚠️ 없는 번호표를 물어봐도 에러가 아니라 '대기 중'으로 나온다.
       Celery 가 '아직 시작 안 한 작업'과 '존재하지 않는 작업'을 구분하지 못하기 때문이다.
    """
    from worker.celery_app import celery_app

    async_result = celery_app.AsyncResult(task_id)
    status = _CELERY_STATE_MAP.get(async_result.state, TaskStatus.PENDING)

    if status is TaskStatus.FAILED:
        return VoiceResultResponse(task_id=task_id, status=status,
                                   error=str(async_result.result))
    if status is not TaskStatus.SUCCEEDED:
        return VoiceResultResponse(task_id=task_id, status=status)

    data = async_result.result or {}
    try:
        return VoiceResultResponse(task_id=task_id, status=status,
                                   voice=VoiceResult(**data))
    except Exception as e:
        logger.error("음성 결과 형식 오류 task_id=%s: %s", task_id, e)
        return VoiceResultResponse(task_id=task_id, status=TaskStatus.FAILED,
                                   error="결과 형식 오류")
