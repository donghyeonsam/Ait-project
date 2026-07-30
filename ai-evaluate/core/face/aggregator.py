"""
프레임별 표정 벡터 -> 클립 단위 집계벡터.

[이전 버전과 무엇이 달라졌나]
예전에는 이 파일이 영상을 직접 디코딩하고 MediaPipe 를 돌렸다. 이제 그 작업은
브라우저(JS MediaPipe)가 담당하므로, 서버는 '프레임별 결과를 클립 하나로 요약하는'
집계만 수행한다. cv2/mediapipe import 가 전부 사라졌다.

[학습과 추론이 이 파일을 공유한다 - 가장 중요한 원칙]
  추론: api/routers/analysis.py  -> aggregate_from_frames()
  학습: training/face/build_dataset.py -> aggregate_from_frames()
'프레임 벡터를 어떻게 얻느냐'만 학습(파이썬 MediaPipe)/추론(JS MediaPipe)에서 갈리고,
'집계 방식'은 이 파일 하나로 완전히 동일하게 유지된다. 이 원칙이 깨지면 검증 성능은
좋은데 실서비스에서만 틀리는, 원인 추적이 극히 어려운 버그가 생긴다.

[출력 벡터 구성 - 총 116차원]
  [0:52]    blendshape 52개의 평균   - 답변 전체에서 각 얼굴 근육이 평균적으로 얼마나 활성됐나
  [52:104]  blendshape 52개의 표준편차 - 표정이 얼마나 변동했나(긴장 시 굳어 변동이 작아지는 경향)
  [104:106] EAR 평균/표준편차
  [106:108] MAR 평균/표준편차
  [108:110] 정면이탈 평균/표준편차
  [110]     분당 깜빡임 횟수
  [111]     시선이탈 프레임 비율
  [112]     EAR 후반-전반 차이   ┐ 평균만 쓰면 사라지는 '시간에 따른 변화'를
  [113]     이탈 후반-전반 차이  ├ 라벨링 방식을 바꾸지 않고 되살리는 피처.
  [114]     이탈 추세 기울기     ┘ (앞부분에 긴장했다 풀린 사람과 그 반대를 구분)
  [115]     답변 길이(초)        - 짧게 끝냄 = 할 말이 없었음. 그 자체로 신호다.

⚠️ 이 구성이나 순서를 바꾸면 기존 학습 모델은 전부 무효가 되므로 반드시 재학습할 것.
"""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from config import settings

# MediaPipe FaceLandmarker 가 반환하는 blendshape 개수(고정).
BLENDSHAPE_COUNT = 52

# 집계벡터의 총 차원. MLP 의 in_dim 과 반드시 일치해야 한다.
FEATURE_DIM = BLENDSHAPE_COUNT * 2 + 2 + 2 + 2 + 2 + 3 + 1  # = 116

# 집계에 최소한 필요한 프레임 수. 너무 적으면 통계가 의미를 갖지 못한다.
MIN_FRAMES = 5


@dataclass
class FaceAggregate:
    """집계 결과. vector 는 MLP 입력, extras 는 API 응답에 그대로 노출할 부가지표."""
    vector: np.ndarray
    blink_per_minute: float
    gaze_off_ratio: float
    analyzed_frames: int


def aggregate_from_frames(
    blendshapes: np.ndarray,   # (F, 52) 프레임별 blendshape 스코어
    ear: np.ndarray,           # (F,)   눈 개폐 비율
    mar: np.ndarray,           # (F,)   입 개폐 비율
    deviation: np.ndarray,     # (F,)   코끝의 화면중앙 이탈 거리
    *,
    duration_sec: float,       # 답변 전체 길이(초)
) -> FaceAggregate:
    """프레임별 값들을 클립 하나의 고정 길이 벡터로 요약한다."""
    n = len(ear)
    if n < MIN_FRAMES:
        raise ValueError(f"프레임이 너무 적습니다({n}개, 최소 {MIN_FRAMES}개 필요)")
    if blendshapes.shape != (n, BLENDSHAPE_COUNT):
        raise ValueError(
            f"blendshapes 형태가 잘못됐습니다: {blendshapes.shape}, "
            f"기대값 ({n}, {BLENDSHAPE_COUNT})"
        )
    if not (len(mar) == len(deviation) == n):
        raise ValueError("ear/mar/deviation 의 길이가 서로 다릅니다")
    if duration_sec <= 0:
        raise ValueError(f"duration_sec 이 올바르지 않습니다: {duration_sec}")

    # axis=0 : '프레임 축을 따라' 집계 -> 결과가 52차원으로 남는다.
    # 클립마다 프레임 수가 다른데 MLP 입력은 고정 길이여야 하므로 이 축약이 필수다.
    bs_mean = blendshapes.mean(axis=0)
    bs_std = blendshapes.std(axis=0)

    # ── 깜빡임: EAR 의 '하강 엣지'만 센다 ──
    # (이전 프레임은 열림 AND 현재 프레임은 감김) 인 지점의 개수.
    # 단순히 '감긴 프레임 수'를 세면 3초간 눈을 감고 있던 것과 여러 번 깜빡인 것이
    # 구분되지 않는다.
    th = settings.blink_ear_threshold
    blink_count = int(np.sum((ear[:-1] >= th) & (ear[1:] < th)))

    # 프레임 수가 아니라 '실제 경과 시간'으로 나눈다.
    # 프론트 기기 성능에 따라 fps 가 달라지므로(저사양 기기에서 2fps 로 떨어지는 등),
    # 이 보정이 없으면 느린 기기 사용자의 깜빡임 수치가 부당하게 낮게 나온다.
    blink_per_min = blink_count / duration_sec * 60.0

    gaze_off_ratio = float(np.mean(deviation > settings.gaze_deviation_threshold))

    # ── 시간 변화 피처 ──
    # 클립을 3등분해 앞/뒤 구간의 차이를 본다. 평균만 쓰면 "처음엔 떨었지만 안정됐다"와
    # "처음엔 괜찮다가 후반에 무너졌다"가 완전히 같은 벡터가 되어버린다.
    third = max(1, n // 3)
    ear_delta = float(ear[-third:].mean() - ear[:third].mean())
    dev_delta = float(deviation[-third:].mean() - deviation[:third].mean())
    # 1차 다항 회귀의 기울기. 양수면 후반으로 갈수록 이탈이 증가한다는 뜻.
    dev_slope = float(np.polyfit(np.arange(n), deviation, 1)[0])

    vector = np.concatenate([
        bs_mean,                                    # 52
        bs_std,                                     # 52
        [float(ear.mean()), float(ear.std())],      # 2
        [float(mar.mean()), float(mar.std())],      # 2
        [float(deviation.mean()), float(deviation.std())],  # 2
        [blink_per_min, gaze_off_ratio],            # 2
        [ear_delta, dev_delta, dev_slope],          # 3
        [float(duration_sec)],                      # 1
    ]).astype(np.float32)

    # 방어적 검증: 조립 실수를 조용히 넘기지 않고 즉시 드러낸다.
    if vector.shape[0] != FEATURE_DIM:
        raise RuntimeError(
            f"집계벡터 차원 불일치: {vector.shape[0]} != {FEATURE_DIM}. "
            "aggregate_from_frames 의 조립 순서를 확인하세요."
        )

    return FaceAggregate(
        vector=vector,
        blink_per_minute=float(blink_per_min),
        gaze_off_ratio=gaze_off_ratio,
        analyzed_frames=n,
    )


def aggregate_from_request(payload) -> FaceAggregate:
    """
    api/schemas/analysis.py 의 FaceAnalyzeRequest -> 집계 결과.

    프론트가 프레임별 값을 그대로 보내고 서버가 집계하는 이유:
    집계 방식(평균/표준편차/시간변화 피처)은 학습 코드와 반드시 일치해야 하는
    부분이다. 프론트가 미리 집계해서 보내면 집계 방식을 바꿀 때마다 프론트를
    재배포해야 하지만, 서버가 쥐고 있으면 모델 재학습과 함께 한쪽만 고치면 된다.
    """
    frames = payload.frames

    # ── duration_sec 이 믿을 만한 값인지 확인한다 ──
    # duration_sec 은 브라우저가 보낸 값이고, 아래에서 '분당 깜빡임' 을 계산할 때
    # 나눗셈에 쓰인다. 프론트에 버그가 있어 450프레임인데 1초라고 보내면
    # 깜빡임이 수천 회로 계산되어 모델에 들어간다. 에러는 안 나고 점수만 이상해지므로
    # 오히려 더 위험하다.
    #
    # 프레임 수와 fps 로 최소 몇 초는 걸렸어야 하는지 계산해 비교한다.
    # (얼굴이 안 잡힌 프레임은 프론트가 버리므로 실제 시간은 이보다 길 수 있다.
    #  그래서 '너무 짧은 경우' 만 잡고, 긴 쪽은 스키마의 상한(1800초)에 맡긴다)
    min_expected_sec = (len(frames) / payload.fps) * 0.5
    if payload.duration_sec < min_expected_sec:
        raise ValueError(
            f"duration_sec({payload.duration_sec:.1f}초)이 프레임 수로 계산한 "
            f"최소 길이({min_expected_sec:.1f}초)보다 짧습니다. "
            f"프론트의 fps({payload.fps})/duration 계산을 확인해주세요."
        )

    blendshapes = np.array([f.blendshapes for f in frames], dtype=np.float32)
    ear = np.array([f.ear for f in frames], dtype=np.float32)
    mar = np.array([f.mar for f in frames], dtype=np.float32)
    deviation = np.array([f.deviation for f in frames], dtype=np.float32)

    return aggregate_from_frames(
        blendshapes, ear, mar, deviation, duration_sec=payload.duration_sec
    )
