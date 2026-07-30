"""
[중요] 파이썬 MediaPipe 와 JS MediaPipe 의 출력이 일치하는지 검증한다.

[왜 필요한가]
학습 데이터는 파이썬 MediaPipe 로, 실제 추론 입력은 브라우저 JS MediaPipe 로 만들어진다.
같은 모델 파일(face_landmarker.task)을 쓰므로 출력이 거의 같아야 정상이지만,
델리게이트(CPU/GPU), 이미지 전처리 리사이즈 방식, 버전 차이로 미세하게 어긋날 수 있다.
이걸 확인하지 않고 넘어가면 "검증 성능은 좋은데 실서비스만 이상하다"가 되고,
원인 추적이 극도로 어려워진다. 프로젝트 초기에 딱 한 번은 반드시 돌려볼 것.

[사용법]
 1) 샘플 영상 1~2개를 준비한다 (예: sample.mp4)
 2) 파이썬으로 프레임 추출:
      python -m training.face.extract_frames --clips samples --out out_py
 3) 같은 영상을 브라우저에서 재생하며 JS 로 추출한 결과를 JSON 으로 저장한다
    (frontend-sample/face-capture.js 의 downloadDebugJson() 참고)
 4) 비교:
      python -m training.face.verify_parity --py out_py/sample.json --js sample_js.json
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np


def load(path: str) -> dict:
    return json.loads(Path(path).read_text(encoding="utf-8"))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--py", required=True, help="파이썬 추출 JSON")
    parser.add_argument("--js", required=True, help="JS 추출 JSON")
    parser.add_argument("--tol", type=float, default=0.05,
                        help="허용 오차(blendshape 스코어 절대차)")
    args = parser.parse_args()

    a, b = load(args.py), load(args.js)
    fa, fb = a["frames"], b["frames"]

    print(f"프레임 수: python={len(fa)}, js={len(fb)}")
    if abs(len(fa) - len(fb)) > max(3, 0.1 * max(len(fa), len(fb))):
        print("⚠️ 프레임 수 차이가 큽니다. 샘플링 fps 설정이 양쪽에서 다른지 확인하세요.")

    # 프레임 단위로 정확히 정렬되지 않을 수 있으므로(시작 시점/샘플링 오차),
    # 개별 프레임 비교 대신 '클립 전체 통계'를 비교한다. 실제로 모델에 들어가는 것도
    # 집계값이므로 이 비교가 더 실질적이다.
    n = min(len(fa), len(fb))
    if n == 0:
        raise SystemExit("비교할 프레임이 없습니다.")

    bs_a = np.array([f["blendshapes"] for f in fa], dtype=np.float32)
    bs_b = np.array([f["blendshapes"] for f in fb], dtype=np.float32)

    if bs_a.shape[1] != bs_b.shape[1]:
        raise SystemExit(
            f"blendshape 개수가 다릅니다: python={bs_a.shape[1]}, js={bs_b.shape[1]}")

    diff_mean = np.abs(bs_a.mean(axis=0) - bs_b.mean(axis=0))
    print(f"\nblendshape 평균 차이: max={diff_mean.max():.4f}, "
          f"mean={diff_mean.mean():.4f}")

    worst = np.argsort(-diff_mean)[:5]
    print("차이가 큰 blendshape 인덱스 top5:")
    for i in worst:
        print(f"  idx {i:2d}: python={bs_a[:, i].mean():.4f} "
              f"js={bs_b[:, i].mean():.4f} diff={diff_mean[i]:.4f}")

    for key in ("ear", "mar", "deviation"):
        va = np.array([f[key] for f in fa], dtype=np.float32).mean()
        vb = np.array([f[key] for f in fb], dtype=np.float32).mean()
        print(f"{key:10s} python={va:.4f} js={vb:.4f} diff={abs(va - vb):.4f}")

    if diff_mean.max() > args.tol:
        print(
            f"\n❌ 허용 오차({args.tol})를 초과했습니다."
            "\n   점검 항목: (1) 양쪽이 같은 face_landmarker.task 파일을 쓰는가"
            "\n             (2) blendshape 배열 순서를 JS 에서 정렬하지 않았는가"
            "\n             (3) JS 의 EAR/MAR 랜드마크 인덱스가"
            " core/face/landmark_metrics.py 와 같은가"
        )
    else:
        print(f"\n✅ 허용 오차({args.tol}) 이내입니다. 학습/추론 입력이 정합합니다.")


if __name__ == "__main__":
    main()
