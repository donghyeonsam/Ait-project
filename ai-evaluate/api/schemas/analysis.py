"""
ai-evaluate API 요청/응답 스키마.

[BE 와의 계약 - 표정과 음성이 다르다]
  표정: 프론트가 이미 무거운 추출을 끝내고 벡터만 보내므로 서버 작업은 수 밀리초.
        큐를 태울 이유가 없어 POST 한 번으로 결과까지 즉시 반환한다(200).
  음성: 서버에서 librosa/Praat 연산이 필요해 수 초가 걸린다. 접수(202)와 결과조회를
        분리하고 BE 가 task_id 로 폴링한다.
"""
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field

# MediaPipe FaceLandmarker 의 blendshape 개수(고정).
BLENDSHAPE_COUNT = 52


class TaskStatus(str, Enum):
    """
    Celery 내부 상태(PENDING/STARTED/SUCCESS/FAILURE)를 그대로 노출하지 않고
    우리 도메인 용어로 감싼다 - 나중에 큐를 교체해도 BE 코드는 바뀌지 않는다.
    """
    PENDING = "pending"      # 큐에서 대기 중
    RUNNING = "running"      # worker 가 처리 중
    SUCCEEDED = "succeeded"
    FAILED = "failed"


# ─────────────────────────── 표정 ───────────────────────────

class FaceFrame(BaseModel):
    """
    프론트(MediaPipe JS)가 프레임 1장에서 뽑아 보내는 값.

    ⚠️ blendshapes 의 '순서'가 매우 중요하다. MediaPipe 가 반환하는 categories 배열의
       순서(index 순)를 그대로 유지해야 한다. 이름순 정렬 등으로 순서가 바뀌면 학습된
       모델과 축이 어긋나는데, 에러 없이 값만 틀리게 나와 발견이 매우 어렵다.
    """
    blendshapes: list[float] = Field(
        ..., min_length=BLENDSHAPE_COUNT, max_length=BLENDSHAPE_COUNT,
        description="MediaPipe blendshape 52개 스코어 (0~1), index 순서 유지",
    )
    ear: float = Field(..., ge=0.0, le=2.0, description="눈 개폐 비율 (프론트 계산)")
    mar: float = Field(..., ge=0.0, le=5.0, description="입 개폐 비율 (프론트 계산)")
    deviation: float = Field(
        ..., ge=0.0, le=2.0, description="코끝의 화면중앙 이탈 거리 (정규화 좌표계)")


class FaceAnalyzeRequest(BaseModel):
    """
    답변 클립 1개 분량의 프레임 벡터 묶음.

    페이로드 크기 감각: 90초 x 5fps = 450 프레임 x 55 float
      -> 원시 100KB 남짓, JSON 텍스트로는 300KB 안팎.
    영상을 통째로 올리는 것(수십 MB)에 비하면 무시할 수준이다.
    """
    fps: float = Field(..., gt=0.0, le=60.0, description="프론트가 실제 샘플링한 fps")
    duration_sec: float = Field(
        ..., gt=0.0, le=1800.0, description="답변 전체 길이(초)")
    frames: list[FaceFrame] = Field(..., min_length=5)


class FaceResult(BaseModel):
    """
    표정 MLP 출력.

    [teacher 확정] EMO-AffectNet(ResNet50 백본 + LSTM, Neutral/Happiness/Sadness/
    Surprise/Fear/Disgust/Anger 7클래스)을 오프라인 teacher 로 삼아 distillation 한다
    - training/face/make_pseudo_labels.py 참고. 서빙에 올라가는 건 여전히 이 경량
    MLP 뿐이고 EMO-AffectNet 자체는 학습 스크립트에서만 쓰인다.
    confidence_score 는 tension_score 의 보수(1 - tension_score)로 정의되어 있어
    둘 다 노출하는 이유는 BE 가 매번 1-x 계산을 하지 않도록 편의상 제공하는 것뿐이다.
    """
    tension_score: float = Field(..., ge=0.0, le=1.0, description="긴장도 (0=침착, 1=긴장)")
    confidence_score: float = Field(..., ge=0.0, le=1.0, description="자신감 (1 - tension_score)")
    # 아래 셋은 MLP 출력이 아니라 규칙기반 계산값이다.
    # 사용자에게 "왜 이 점수인지" 근거를 보여줄 때 쓴다.
    blink_per_minute: float
    gaze_off_ratio: float = Field(..., ge=0.0, le=1.0)
    analyzed_frames: int


class FaceAnalyzeResponse(BaseModel):
    """표정은 동기 처리라 요청 한 번에 결과가 바로 담겨 돌아온다."""
    status: TaskStatus = TaskStatus.SUCCEEDED
    face: FaceResult


# ─────────────────────────── 음성 ───────────────────────────

class VoiceAcceptedResponse(BaseModel):
    """음성 분석 접수 직후 응답. 결과는 아직 없고 조회용 task_id 만 준다."""
    task_id: str = Field(..., description="결과 조회에 사용할 작업 ID")
    status: TaskStatus = TaskStatus.PENDING


class VoiceResult(BaseModel):
    """
    [teacher 확정] jungjongho/wav2vec2-xlsr-korean-speech-emotion-recognition2
    (한국어 6클래스: 기쁨/당황/분노/불안/슬픔/중립)을 오프라인 teacher 로 삼아
    distillation 한다 - training/voice/make_pseudo_labels.py 의 TENSION_WEIGHTS 로
    6클래스 확률을 confidence/tension 스칼라로 재조합한 값을 학습 타깃으로 쓴다.
    이전 버전(audeering, arousal/valence/dominance 3축 영어 teacher)에서 교체되었다 -
    한국어 데이터로 학습된 teacher 라는 점, 그리고 표정 쪽(FaceResult)과 같은
    confidence/tension 축으로 통일해 BE 가 두 모달리티를 동일한 스키마로 다루게 하려는
    목적이다. audeering 을 보조 teacher 로 앙상블하고 싶다면
    make_pseudo_labels.py --teacher audeering 결과와 평균 내어 쓰면 된다(이 스키마
    자체를 다시 3축으로 되돌릴 필요는 없다).
    """
    confidence_score: float = Field(..., ge=0.0, le=1.0, description="자신감 (1 - tension_score)")
    tension_score: float = Field(..., ge=0.0, le=1.0, description="긴장도 (0=침착, 1=긴장)")
    speech_rate: float = Field(..., description="발화 속도 (온셋 개수/초, 음절 근사)")
    pause_ratio: float = Field(..., ge=0.0, le=1.0, description="전체 중 무음 비율")


class VoiceResultResponse(BaseModel):
    """폴링 응답. status 에 따라 voice 가 None 일 수 있다."""
    task_id: str
    status: TaskStatus
    voice: Optional[VoiceResult] = None
    error: Optional[str] = Field(None, description="status=failed 일 때 실패 사유")
