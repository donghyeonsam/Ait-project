"""
ai-evaluate - FastAPI 시작점

[기존 ai/ 서버와의 관계]
BE(Spring Boot)는 두 개의 독립된 AI 서버를 부른다.
  - ai/       (:8000) 질문 생성 / RAG / 꼬리질문   <- 이 서버와 무관, 손대지 않음
  - ai-evaluate/ (:8100) 답변의 표정·음성 분석        <- 이 파일

[왜 서버를 나눴나]
librosa/parselmouth/torch 는 무겁고 서로 충돌이 잦다. 기존 ai/ 서버에 합치면
질문 생성 기능 전체가 그 무게와 배포 위험을 같이 지게 되므로 완전히 분리했다.

[표정과 음성의 처리 방식이 다르다]
  표정: 브라우저(MediaPipe JS)가 얼굴 인식을 끝내고 숫자만 보낸다.
        서버는 그 숫자를 요약하고 작은 모델에 넣기만 하면 되어 수 밀리초로 끝난다.
        영상 파일이 서버로 올라오지 않고, MediaPipe/OpenCV 도 설치할 필요가 없다.
  음성: 목소리 떨림 같은 지표는 브라우저에서 계산할 방법이 없어 소리 파일을 받는다.
        2~3초가 걸리지만, BE 가 @Async 로 별도 스레드에서 부르므로 그 자리에서
        처리해 결과를 바로 돌려준다. 대기표를 또 발급하지 않는다.
        (BE 가 기다릴 수 없는 상황을 위해 대기열 방식도 남겨뒀다.
         docker compose --profile queue up -d)

[모델을 미리 읽어두지 않는 이유]
ai/main.py 는 서버가 켜질 때 임베딩 모델을 미리 읽어둔다(lifespan). 여기는 그러지
않는다. 우리 모델은 수십 KB 라 첫 요청 때 읽어도 체감되지 않고, 오히려 미리 읽으면
모델을 아직 학습하지 않은 상태에서 서버가 아예 안 켜지는 문제가 생긴다.
모델이 준비됐는지는 GET /health/model 로 확인할 수 있다.
"""
import logging

from fastapi import FastAPI

from api.routers import analysis, health
from config import settings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="AI 모의 면접 - 미디어 분석 API",
    description="답변 영상/오디오의 표정·음성 분석",
    version="0.3.0",
)

app.include_router(health.router)
app.include_router(analysis.router)

logger.info(
    "ai-evaluate 기동 (env=%s, 음성 동시실행=%d개, 최대 오디오=%dMB)",
    settings.app_env,
    settings.voice_concurrency,
    settings.max_audio_bytes // 1024 // 1024,
)
