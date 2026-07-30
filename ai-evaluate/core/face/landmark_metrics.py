"""
MediaPipe 랜드마크 -> EAR / MAR / 정면이탈 계산.

[이 파일이 존재하는 이유 - 파이썬과 JS 가 같은 계산을 해야 한다]
추론 시에는 브라우저(JS)가, 학습 데이터를 만들 때는 파이썬이 이 값을 계산한다.
두 구현이 조금이라도 다르면 학습과 추론의 입력이 어긋난다. 파이썬 쪽 '정답 정의'를
이 파일 하나로 고정하고, frontend-sample/face-capture.js 가 이것을 그대로 옮긴다.
수식이나 인덱스를 바꿀 때는 반드시 양쪽을 함께 고치고,
training/face/verify_parity.py 로 두 결과가 일치하는지 확인할 것.

[랜드마크 인덱스는 MediaPipe 478점 모델의 고정값이다]
"""
from __future__ import annotations

import numpy as np

# EAR(Eye Aspect Ratio) 계산용 6점: [좌끝, 우끝, 상1, 하1, 상2, 하2]
LEFT_EYE = [33, 133, 159, 145, 158, 153]
RIGHT_EYE = [362, 263, 386, 374, 385, 380]
# MAR(Mouth Aspect Ratio) 계산용 4점: [좌입꼬리, 우입꼬리, 윗입술중앙, 아랫입술중앙]
MOUTH = [61, 291, 13, 14]
# 코끝 - 머리 방향(정면 이탈) 추정 기준점
NOSE_TIP = 1

# 화면 중앙. 정규화 좌표계(0~1)에서 (0.5, 0.5).
_CENTER = np.array([0.5, 0.5], dtype=np.float32)


def aspect_ratio(pts: np.ndarray, idx: list[int]) -> float:
    """
    눈/입의 '열린 정도'.

    수직거리 평균 / 수평거리.
    수평거리로 나누는 이유: 얼굴이 카메라에 가까워지면 모든 거리가 함께 커지는데,
    비율로 만들면 그 스케일 차이가 상쇄되어 카메라 거리와 무관한 지표가 된다.
    """
    horizontal = float(np.linalg.norm(pts[idx[0]] - pts[idx[1]]))
    if horizontal < 1e-6:  # 0 나누기 방지
        return 0.0
    vertical = float(np.linalg.norm(pts[idx[2]] - pts[idx[3]]))
    if len(idx) >= 6:      # 눈은 수직 측정점이 2쌍이라 평균을 낸다
        vertical = (vertical + float(np.linalg.norm(pts[idx[4]] - pts[idx[5]]))) / 2.0
    return vertical / horizontal


def frame_metrics(landmarks_xy: np.ndarray) -> tuple[float, float, float]:
    """
    landmarks_xy: (478, 2) 정규화 좌표 배열 -> (ear, mar, deviation)

    z(깊이) 좌표는 쓰지 않는다. MediaPipe 의 z 는 상대적 추정치라 노이즈가 크고
    카메라/거리에 따라 스케일이 불안정하다.
    """
    ear = (aspect_ratio(landmarks_xy, LEFT_EYE)
           + aspect_ratio(landmarks_xy, RIGHT_EYE)) / 2.0
    mar = aspect_ratio(landmarks_xy, MOUTH)

    # 정면 이탈 근사: 코끝이 화면 중앙에서 얼마나 벗어났는지.
    # ⚠️ 엄밀한 시선추적(gaze)이 아니라 '머리 방향 + 프레이밍' 근사치다.
    #    사용자가 카메라 앞에 치우쳐 앉기만 해도 값이 커진다. 정확한 시선이 필요하면
    #    홍채 랜드마크(468~477)를 쓰도록 확장해야 한다.
    deviation = float(np.linalg.norm(landmarks_xy[NOSE_TIP] - _CENTER))

    return float(ear), float(mar), deviation
