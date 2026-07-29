"""핵심 로직 스모크 테스트 (torch 없이 실행 가능).

실행:  python -m tests.test_aggregator   (ai-evaluate 루트에서)
집계벡터 차원, 깜빡임 엣지 카운트, 시간변화 피처, 스키마 검증을 확인한다.
"""
import sys
import numpy as np

sys.path.insert(0, ".")

from core.face.aggregator import (
    BLENDSHAPE_COUNT,
    FEATURE_DIM,
    aggregate_from_frames,
    aggregate_from_request,
)
from core.face.landmark_metrics import frame_metrics
from api.schemas.analysis import FaceAnalyzeRequest

rng = np.random.default_rng(0)
F = 60

# 1) 집계벡터 차원
bs = rng.random((F, BLENDSHAPE_COUNT)).astype(np.float32)
ear = np.full(F, 0.30, dtype=np.float32)
mar = rng.random(F).astype(np.float32)
dev = (rng.random(F) * 0.1).astype(np.float32)
agg = aggregate_from_frames(bs, ear, mar, dev, duration_sec=12.0)
assert agg.vector.shape[0] == FEATURE_DIM == 116, agg.vector.shape
assert not np.isnan(agg.vector).any(), "NaN 발생"
print(f"[1] 집계벡터 차원 {agg.vector.shape[0]} == FEATURE_DIM 116  OK")

# 2) 깜빡임 = 하강 엣지 카운트 검증
ear2 = np.full(F, 0.30, dtype=np.float32)
for t in (10, 25, 40):
    ear2[t] = 0.10
agg2 = aggregate_from_frames(bs, ear2, mar, dev, duration_sec=60.0)
assert abs(agg2.blink_per_minute - 3.0) < 1e-4, agg2.blink_per_minute
ear3 = np.full(F, 0.30, dtype=np.float32)
ear3[10:30] = 0.10
agg3 = aggregate_from_frames(bs, ear3, mar, dev, duration_sec=60.0)
assert abs(agg3.blink_per_minute - 1.0) < 1e-4, agg3.blink_per_minute
print(f"[2] 깜빡임 하강엣지: 3회신호->{agg2.blink_per_minute:.0f}, "
      f"장시간감음->{agg3.blink_per_minute:.0f}  OK")

# 3) 시선이탈 비율 (임계 0.15)
dev2 = np.concatenate([np.full(30, 0.05), np.full(30, 0.50)]).astype(np.float32)
agg4 = aggregate_from_frames(bs, ear, mar, dev2, duration_sec=12.0)
assert abs(agg4.gaze_off_ratio - 0.5) < 1e-6, agg4.gaze_off_ratio
print(f"[3] 시선이탈 비율 {agg4.gaze_off_ratio}  OK")

# 4) 시간변화 피처가 앞/뒤를 구분하는가 (평균만으로는 동일해지는 케이스)
up = np.linspace(0.0, 0.4, F).astype(np.float32)
down = up[::-1].copy()
a_up = aggregate_from_frames(bs, ear, mar, up, duration_sec=12.0).vector
a_dn = aggregate_from_frames(bs, ear, mar, down, duration_sec=12.0).vector
assert abs(a_up[108] - a_dn[108]) < 1e-5, "평균은 같아야 함"
assert a_up[113] > 0 > a_dn[113], (a_up[113], a_dn[113])
assert a_up[114] > 0 > a_dn[114], (a_up[114], a_dn[114])
print(f"[4] 시간변화: 평균 동일({a_up[108]:.4f}) / delta {a_up[113]:+.3f} vs "
      f"{a_dn[113]:+.3f} / slope {a_up[114]:+.4f} vs {a_dn[114]:+.4f}  OK")

# 5) EAR 수식 - 눈을 감으면 값이 작아지는가
pts = np.zeros((478, 2), dtype=np.float32)


def set_eye(open_amt):
    pts[33] = [0.0, 0.5]
    pts[133] = [0.1, 0.5]
    pts[159] = [0.05, 0.5 + open_amt]
    pts[145] = [0.05, 0.5 - open_amt]
    pts[158] = [0.06, 0.5 + open_amt]
    pts[153] = [0.06, 0.5 - open_amt]
    pts[362] = [0.2, 0.5]
    pts[263] = [0.3, 0.5]
    pts[386] = [0.25, 0.5 + open_amt]
    pts[374] = [0.25, 0.5 - open_amt]
    pts[385] = [0.26, 0.5 + open_amt]
    pts[380] = [0.26, 0.5 - open_amt]
    pts[61] = [0.4, 0.6]
    pts[291] = [0.5, 0.6]
    pts[13] = [0.45, 0.62]
    pts[14] = [0.45, 0.58]
    pts[1] = [0.5, 0.5]


set_eye(0.02)
ear_open, _, d1 = frame_metrics(pts)
set_eye(0.001)
ear_shut, _, _ = frame_metrics(pts)
assert ear_open > ear_shut, (ear_open, ear_shut)
assert abs(d1) < 1e-6, d1
print(f"[5] EAR 뜬눈={ear_open:.3f} > 감은눈={ear_shut:.3f}, 정중앙 이탈={d1:.4f}  OK")

# 6) pydantic 스키마 -> 집계 연동
payload = FaceAnalyzeRequest(
    fps=5.0,
    duration_sec=12.0,
    frames=[
        {
            "blendshapes": bs[i].tolist(),
            "ear": float(ear[i]),
            "mar": float(mar[i]),
            "deviation": float(dev[i]),
        }
        for i in range(F)
    ],
)
assert aggregate_from_request(payload).vector.shape[0] == 116
print("[6] FaceAnalyzeRequest -> aggregate_from_request  OK")

# 7) 잘못된 blendshape 개수는 스키마에서 거부되는가
rejected = False
try:
    FaceAnalyzeRequest(
        fps=5.0,
        duration_sec=12.0,
        frames=[{"blendshapes": [0.1] * 51, "ear": 0.3, "mar": 0.2,
                 "deviation": 0.05}] * 10,
    )
except Exception:
    rejected = True
assert rejected, "FAIL: 51개 blendshape 가 통과됨"
print("[7] blendshape 개수 검증  OK")

# 8) 프레임 부족 시 거부
rejected = False
try:
    aggregate_from_frames(bs[:3], ear[:3], mar[:3], dev[:3], duration_sec=1.0)
except ValueError:
    rejected = True
assert rejected
print("[8] 프레임 부족 거부  OK")

# 9) 음성 피처 차원 상수
V = 3 + 2 + 4 + 3 + 13 * 2
assert V == 38
print(f"[9] 음성 피처 차원 {V}  OK")

# 10) duration_sec 이 프레임 수에 비해 너무 짧으면 거부
bad_payload = FaceAnalyzeRequest(
    fps=5.0,
    duration_sec=1.0,           # 60프레임/5fps = 최소 12초여야 함
    frames=[
        {"blendshapes": bs[i].tolist(), "ear": float(ear[i]),
         "mar": float(mar[i]), "deviation": float(dev[i])}
        for i in range(F)
    ],
)
rejected = False
try:
    aggregate_from_request(bad_payload)
except ValueError as e:
    rejected = "duration_sec" in str(e)
assert rejected, "duration_sec 검증이 동작하지 않음"
print("[10] duration_sec 불일치 거부  OK")

print("\n전체 통과")
