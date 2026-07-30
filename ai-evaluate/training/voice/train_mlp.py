"""
[음성 학습 3단계] distillation 학습 -> core/voice/model/ 저장

실행:
  python -m training.voice.train_mlp \
      --data data/processed/voice_dataset.npz --group-split

[여기서 일어나는 일이 distillation 이다]
  입력 = librosa/Praat 로 뽑은 38차원 경량 피처 (student 가 볼 수 있는 정보)
  타깃 = teacher(jungjongho, 기본값) 가 낸 2차원 출력(confidence, tension)
"가벼운 정보만 보고 무거운 모델의 답을 맞추도록" 학습시키는 것이며,
학습이 끝나면 teacher 는 더 이상 필요하지 않다(서빙 서버에 올리지 않는다).

⚠️ --teacher 는 build_dataset.py 를 만들 때 쓴 것과 반드시 같아야 한다(out_dim/축이
   다르면 core/voice/predictor.py 의 2축 언패킹과 어긋난다). 서빙 코드는 현재
   jungjongho(confidence/tension, out_dim=2) 를 전제로 고정돼 있으므로, audeering
   으로 학습한 체크포인트를 그대로 서빙에 올리면 core/voice/predictor.py 의
   out_dim 검증에서 바로 막힌다 - audeering 은 보조/비교용으로만 쓸 것.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
import torch

from core.mlp import load_checkpoint
from training.trainer import train_mlp

MODEL_OUT = "core/voice/model/voice_mlp.pt"
SCALER_OUT = "core/voice/model/voice_scaler.json"

# training/voice/build_dataset.py 의 TEACHER_COLUMNS 와 반드시 일치해야 한다.
TEACHER_AXES = {
    "jungjongho": ["confidence", "tension"],
    "audeering": ["arousal", "valence", "dominance"],
}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", required=True)
    parser.add_argument("--teacher", choices=list(TEACHER_AXES), default="jungjongho",
                        help="build_dataset.py 를 만들 때 쓴 --teacher 와 동일하게")
    parser.add_argument("--hidden", default="64,32")
    parser.add_argument("--epochs", type=int, default=400)
    parser.add_argument("--group-split", action="store_true",
                        help="같은 원본 클립에서 나온 윈도우를 train/val 에 섞지 않는다")
    args = parser.parse_args()

    axes = TEACHER_AXES[args.teacher]

    d = np.load(args.data, allow_pickle=True)
    X, y = d["X"], d["y"]
    print(f"데이터: X={X.shape}, y={y.shape}, teacher={args.teacher}, axes={axes}")

    if y.shape[1] != len(axes):
        raise SystemExit(
            f"--data 의 y 차원({y.shape[1]})이 --teacher {args.teacher}"
            f"가 기대하는 축 개수({len(axes)})와 다릅니다. build_dataset.py 를 "
            f"같은 --teacher 값으로 다시 돌렸는지 확인하세요."
        )

    groups = d["groups"] if (args.group_split and "groups" in d) else None
    hidden = tuple(int(h) for h in args.hidden.split(","))

    best_val = train_mlp(
        X, y,
        hidden_dims=hidden,
        out_dim=len(axes),
        loss_name="mse",     # teacher 출력이 0~1 연속값이므로 회귀. 분류가 아니다.
        epochs=args.epochs,
        groups=groups,
        model_out=MODEL_OUT,
        scaler_out=SCALER_OUT,
    )

    # ── 축별 상관계수 확인 ──
    # MSE 하나만 보면 '전체 평균값만 예측하는 게으른 모델'도 손실이 낮게 나올 수 있다.
    # 상관계수는 '값의 변화 방향을 따라가는지'를 보므로 그런 모델을 걸러낸다.
    model, _ = load_checkpoint(MODEL_OUT)
    scaler = json.loads(Path(SCALER_OUT).read_text(encoding="utf-8"))
    mean = np.array(scaler["mean"], dtype=np.float32)
    std = np.array(scaler["std"], dtype=np.float32)

    with torch.no_grad():
        pred = model(torch.from_numpy((X - mean) / std).float()).numpy()

    print("\n── teacher 출력과의 상관계수 (전체 데이터 기준) ──")
    for i, name in enumerate(axes):
        # corrcoef 는 상관행렬을 반환하므로 [0,1] 원소가 두 변수 간 상관계수다.
        r = np.corrcoef(pred[:, i], y[:, i])[0, 1]
        print(f"  {name:10s} r={r:.3f}")

    print(f"\nbest val loss = {best_val:.4f}")
    print(
        "\n[해석 가이드]"
        "\n  r >= 0.6 : 경량 피처만으로 teacher 를 꽤 잘 근사했다고 볼 수 있다."
        "\n  r <  0.3 : 지금 피처로는 그 축을 설명할 수 없다는 뜻이다. 피처를 보강하거나"
        "\n             그 축은 서비스에 노출하지 않는 판단이 필요하다."
        "\n\n  jungjongho 의 confidence/tension 은 6클래스 확률을 휴리스틱 가중치로"
        "\n  재조합한 값이라(make_pseudo_labels.py 의 TENSION_WEIGHTS), teacher 라벨"
        "\n  자체의 신뢰도가 audeering 만큼 검증되어 있지 않다. r 이 낮게 나오면 피처"
        "\n  탓이 아니라 가중치 설계 탓일 수 있으니 sanity check 로 먼저 teacher 라벨"
        "\n  자체를 의심할 것.\n\n  또한 jitter/shimmer 가 '면접 긴장도'와 실제로 상관이"
        " 있는지는 아직 검증되지"
        "\n  않았다(그 지표들은 주로 성대 질환 진단 맥락에서 검증된 것이다). 상관이 낮으면"
        "\n  미련 없이 빼고 MFCC/피치 변동 쪽에 무게를 두는 것이 낫다."
    )


if __name__ == "__main__":
    main()
