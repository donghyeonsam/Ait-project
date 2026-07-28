"""
[표정 학습 2단계] npz -> 학습 -> core/face/model/ 에 산출물 저장

실행:
  python -m training.face.train_mlp --data data/processed/face_dataset.npz
  python -m training.face.train_mlp --data ... --hidden 32,16   # 데이터가 적을 때
"""
from __future__ import annotations

import argparse

import numpy as np

from training.trainer import train_mlp


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", required=True)
    parser.add_argument("--hidden", default="64,32",
                        help="은닉층 크기 (예: 64,32 / 데이터 적으면 32,16)")
    parser.add_argument("--epochs", type=int, default=300)
    parser.add_argument("--group-split", action="store_true",
                        help="train/val 을 사람(person_id) 단위로 분할 (권장)")
    args = parser.parse_args()

    d = np.load(args.data, allow_pickle=True)
    X, y = d["X"], d["y"]
    print(f"데이터: X={X.shape}, y={y.shape}, "
          f"라벨 범위=[{y.min():.2f}, {y.max():.2f}]")

    groups = d["persons"] if (args.group_split and "persons" in d) else None
    hidden = tuple(int(h) for h in args.hidden.split(","))

    train_mlp(
        X, y,
        hidden_dims=hidden,
        out_dim=1,
        # 라벨이 0~1 연속 점수라는 잠정 스펙을 따라 회귀(MSE)로 학습한다.
        # ⚠️ 타깃을 카테고리(예: 5단계)로 확정하면 out_dim 을 클래스 수로 바꾸고
        #    손실을 CrossEntropyLoss 로 교체해야 하며, core/face/predictor.py 의
        #    후처리도 함께 고쳐야 한다. 학습과 추론은 반드시 짝으로 수정할 것.
        loss_name="mse",
        epochs=args.epochs,
        groups=groups,
        model_out="core/face/model/face_mlp.pt",
        scaler_out="core/face/model/face_scaler.json",
    )

    print(
        "\n다음 단계: 검증 손실만 보지 말고 예측값과 사람 라벨의 상관계수도 확인하세요."
        "\n  라벨 평균만 예측하는 '게으른 모델'도 MSE 는 낮게 나올 수 있습니다."
    )


if __name__ == "__main__":
    main()
