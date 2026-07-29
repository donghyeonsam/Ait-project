"""
ai-evaluate 설정 (.env 로부터 로드)

기존 ai/config.py 와 동일한 pydantic-settings 패턴을 따른다 - 팀원이 두 서버를
번갈아 볼 때 설정을 읽는 방식이 같아야 인지 부담이 적기 때문이다.
"""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    # ── Celery / Redis ──
    # 호스트명 'redis' 는 docker-compose 의 서비스명이며 도커 내부 DNS 가 해석한다.
    # DB 번호를 0/1 로 나눠 큐 데이터와 결과 데이터를 논리적으로 분리한다.
    celery_broker_url: str = "redis://redis:6379/0"
    celery_result_backend: str = "redis://redis:6379/1"

    # ── 스토리지 ──
    # "local" : 공유 볼륨 (단일 VM + docker compose)
    # "s3"    : 오브젝트 스토리지 (ECS/k8s 등 컨테이너가 분산되는 환경)
    # 배포 형태가 아직 미정이므로 worker/storage.py 의 추상화를 통해 접근한다.
    storage_backend: str = "local"
    media_dir: str = "/app/media"

    # ── 표정 분석 ──
    # ⚠️ 아래 두 임계값은 경험적 기본값이다. 실제 촬영 데이터를 보고 반드시 튜닝할 것.
    # EAR(눈 개폐 비율)이 이 값 아래로 내려가는 순간을 '눈 감음'으로 판정한다.
    blink_ear_threshold: float = 0.21
    # 코끝이 화면 중앙에서 이 거리 이상 벗어난 프레임을 '시선 이탈'로 카운트한다.
    gaze_deviation_threshold: float = 0.15
    # 프론트가 한 번에 보낼 수 있는 프레임 수 상한 (과도한 페이로드 방어).
    # 5fps x 600초 = 3000. 일반적인 답변(1~2분)이면 300~600 프레임이다.
    max_face_frames: int = 3000

    face_model_path: str = "core/face/model/face_mlp.pt"
    face_scaler_path: str = "core/face/model/face_scaler.json"

    # ── 음성 분석 ──
    # librosa 계열 피처(MFCC/에너지/온셋)용 리샘플링 레이트.
    # teacher(wav2vec2)가 16kHz 기준이라 동일하게 맞춘다.
    voice_sample_rate: int = 16000

    # Praat 계열 피처(F0/jitter/shimmer/HNR)는 '원본 샘플레이트'를 그대로 쓴다.
    # 이유: jitter 는 주기 길이의 미세 변동(수십 us)을 재는데, 16kHz 는 1샘플이
    # 62.5us 라 측정 대상보다 눈금이 커서 정밀도가 부족하다. 원본(44.1kHz 등)이 정확하다.
    praat_pitch_floor: float = 75.0    # 탐색할 최저 F0 (Hz)
    praat_pitch_ceiling: float = 400.0  # 사람 말소리 F0 는 400Hz 를 거의 넘지 않는다

    voice_model_path: str = "core/voice/model/voice_mlp.pt"
    voice_scaler_path: str = "core/voice/model/voice_scaler.json"

    # ── 종합 점수(score, BE 응답 필드명) 산출 곡선 ──
    # "자신감 높을수록 좋다"(단조 증가)가 아니라 "적당히 긴장한 상태가 제일 좋다"
    # (여키스-도슨 법칙 스타일의 종형 곡선)로 바꾼 값이다. 정점 위치(voice_ideal_tension)
    # 와 퍼짐 정도(voice_tension_score_width) 둘 다 아직 잠정값이다.
    # ⚠️ training/voice/sanity_check_sample.py 로 뽑은 표본을 실제로 들어보고,
    #    "이 정도 긴장이 딱 적당하다" 싶은 tension_score 근처로 voice_ideal_tension 을
    #    조정할 것. 재학습 필요 없이 이 값만 바꾸면 바로 반영된다(core/voice/predictor.py 참고).
    voice_ideal_tension: float = 0.4
    # 정점에서 얼마나 멀어지면 점수가 급하게 떨어지는지. 작을수록 뾰족한 곡선(정점만
    # 후하게 주고 나머지는 박하게), 클수록 완만한 곡선(정점에서 좀 벗어나도 큰 감점 없음).
    # ⚠️ 2026-07-29 sanity check 결과 0.25 는 너무 가팔라서(tension=0.0 -> 2.8점,
    #    tension=1.0 -> 0.6점) teacher/student 가 "확실히 편안함/확실히 긴장"이라고
    #    강하게 동의한 샘플조차 지나치게 박하게 깎인다는 청취 피드백으로 0.35 로 완화.
    voice_tension_score_width: float = 0.35

    # 음성 분석을 '동시에 몇 개까지' 돌릴지 정하는 값.
    # 음성 분석은 CPU 를 많이 쓴다. 제한이 없으면 BE(Spring)의 @Async 스레드 수만큼
    # 요청이 한꺼번에 몰려 CPU 가 꽉 차고, 같은 서버에서 도는 화상면접(LiveKit)이
    # 끊기기 시작한다. 주차장 자리 개수라고 생각하면 된다 - 자리가 없으면 밖에서 기다린다.
    # ⚠️ 이 제한은 '프로세스 하나' 기준이다. uvicorn 을 --workers 2 로 띄우면
    #    실제 동시 실행은 2배가 된다. 워커는 1개로 두는 것을 권장한다.
    voice_concurrency: int = 2

    # 받아줄 소리 파일의 최대 크기(바이트).
    # 표정 쪽 max_face_frames 에 대응하는 방어 장치다. 제한이 없으면 실수로 영상
    # 파일을 통째로 보내거나 비정상적으로 큰 요청이 왔을 때 서버 메모리가 터진다.
    # 90초 오디오는 압축 형식이면 1MB 안팎, 무압축 wav 여도 10MB 이하다.
    max_audio_bytes: int = 30 * 1024 * 1024   # 30MB

    # 음성 분석 하나가 이 시간을 넘기면 포기한다(초).
    # 손상된 오디오 등으로 라이브러리가 멈췄을 때 요청이 영원히 매달리는 것을 막는다.
    # ⚠️ 한계: 파이썬은 이미 돌고 있는 스레드를 강제로 멈출 수 없다. 이 시간이 지나면
    #    호출한 쪽에는 504 를 돌려주지만, 그 분석 자체는 끝날 때까지 계속 돈다.
    #    그래서 아래 voice_concurrency 개수만큼의 전용 스레드만 쓰도록 묶어두어,
    #    멈춘 작업이 생겨도 CPU 사용량이 그 이상으로 늘어나지는 않게 했다.
    voice_timeout_sec: float = 120.0

    # ── 서버 ──
    app_env: str = "development"


@lru_cache
def get_settings() -> Settings:
    """.env 파싱은 비용이 있으므로 첫 호출 결과를 캐싱해 싱글톤처럼 쓴다."""
    return Settings()


settings = get_settings()
