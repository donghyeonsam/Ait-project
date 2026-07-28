"""
표정/음성 공용 학습 루프.

[담긴 설계 결정]
  - 80/20 train/val 분할
  - early stopping : 데이터가 적을 때 epoch 를 많이 돌리면 반드시 과적합하므로 필수
  - 정규화 파라미터(mean/std)를 '학습 데이터만으로' 계산해 저장 -> 추론에서 재사용
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset

from core.mlp import MLP


def train_mlp(
    X: np.ndarray,
    y: np.ndarray,
    *,
    hidden_dims=(64, 32),
    out_dim: int = 1,
    loss_name: str = "mse",   # "mse"(회귀) 또는 "bce"(0~1 확률/이진)
    epochs: int = 300,
    batch_size: int = 16,
    lr: float = 1e-3,
    patience: int = 30,
    val_ratio: float = 0.2,
    seed: int = 42,
    groups: np.ndarray | None = None,
    model_out: str = "model.pt",
    scaler_out: str = "scaler.json",
) -> float:
    """
    X: (N, D) 피처, y: (N,) 또는 (N, out_dim) 라벨
    groups: (N,) 각 샘플의 그룹 ID(예: 촬영한 사람 ID). 주면 그룹 단위로 분할한다.
    반환: 최고 검증 손실
    """
    # 재현성. 같은 시드로 돌리면 같은 결과가 나와야 실험 비교가 가능하다.
    torch.manual_seed(seed)
    rng = np.random.default_rng(seed)

    N = X.shape[0]
    if N < 10:
        raise ValueError(f"샘플이 너무 적습니다({N}개). 최소 수십 개는 필요합니다.")

    # ── 1) train/val 분할 ──
    if groups is not None:
        # ⚠️ 매우 중요: 같은 사람의 클립이 train 과 val 에 섞이면 모델이 '긴장도'가 아니라
        #    '이 사람의 얼굴'을 외워버려 검증 성능이 실제보다 좋게 나온다(data leakage).
        #    사람 단위로 나누면 "처음 보는 사람에게도 통하는가"를 제대로 측정할 수 있다.
        uniq = np.unique(groups)
        if len(uniq) < 2:
            print("[warn] 그룹이 1개뿐이라 그룹 분할이 무의미합니다. 무작위 분할로 대체합니다.")
            groups = None
        else:
            shuffled = rng.permutation(uniq)
            n_val_g = max(1, int(round(len(uniq) * val_ratio)))
            val_groups = set(shuffled[:n_val_g].tolist())
            mask = np.array([g in val_groups for g in groups])
            val_idx = np.where(mask)[0]
            train_idx = np.where(~mask)[0]
            print(f"그룹 분할: 검증 그룹 {sorted(val_groups)} "
                  f"(train {len(train_idx)} / val {len(val_idx)})")

    if groups is None:
        idx = rng.permutation(N)
        n_val = max(1, int(N * val_ratio))
        val_idx, train_idx = idx[:n_val], idx[n_val:]

    if len(train_idx) < batch_size:
        batch_size = max(2, len(train_idx) // 2)
        print(f"[warn] 데이터가 적어 batch_size 를 {batch_size} 로 낮춥니다.")

    X_train, X_val = X[train_idx], X[val_idx]
    y_train, y_val = y[train_idx], y[val_idx]

    # ── 2) 정규화 ──
    # mean/std 를 '학습셋만으로' 계산하는 것이 핵심이다. 검증셋까지 포함해 계산하면
    # 검증셋 정보가 학습에 새어들어(leakage) 성능이 실제보다 좋아 보인다.
    mean = X_train.mean(axis=0)
    std = np.maximum(X_train.std(axis=0), 1e-6)  # 상수 피처(std=0) 0나누기 방지

    X_train = (X_train - mean) / std
    X_val = (X_val - mean) / std

    # ── 3) DataLoader ──
    y_train_t = torch.from_numpy(y_train).float().reshape(len(y_train), -1)
    y_val_t = torch.from_numpy(y_val).float().reshape(len(y_val), -1)
    train_ds = TensorDataset(torch.from_numpy(X_train).float(), y_train_t)
    # drop_last=True : BatchNorm 은 배치 크기 1이면 표준편차를 못 구해 에러가 난다.
    # 마지막 자투리 배치가 1개일 가능성을 원천 차단한다.
    train_loader = DataLoader(train_ds, batch_size=batch_size,
                              shuffle=True, drop_last=True)
    X_val_t = torch.from_numpy(X_val).float()

    # ── 4) 모델/손실/옵티마이저 ──
    model = MLP(in_dim=X.shape[1], hidden_dims=hidden_dims, out_dim=out_dim)
    criterion = nn.MSELoss() if loss_name == "mse" else nn.BCEWithLogitsLoss()
    # Adam: 파라미터별로 학습률을 자동 조절. 소규모 데이터에 무난한 기본 선택.
    # weight_decay: 가중치를 작게 유지하는 L2 정규화 -> 과적합 억제.
    optimizer = torch.optim.Adam(model.parameters(), lr=lr, weight_decay=1e-4)

    best_val = float("inf")
    best_state = None
    bad_epochs = 0

    for epoch in range(1, epochs + 1):
        model.train()  # dropout/batchnorm 을 학습 모드로
        train_loss = 0.0
        for xb, yb in train_loader:
            # 파이토치는 gradient 를 '누적'하도록 설계되어 있어, 명시적으로 비우지 않으면
            # 배치마다 gradient 가 쌓여 학습이 엉뚱하게 흘러간다. 최다 실수 지점.
            optimizer.zero_grad()
            pred = model(xb)              # 순전파
            loss = criterion(pred, yb)
            loss.backward()               # 역전파 - 파라미터별 gradient 계산
            optimizer.step()              # gradient 방향으로 파라미터 갱신
            train_loss += loss.item() * len(xb)
        train_loss /= max(len(train_ds), 1)

        model.eval()
        with torch.no_grad():
            val_loss = criterion(model(X_val_t), y_val_t).item()

        if epoch % 20 == 0:
            print(f"epoch {epoch:3d} | train {train_loss:.4f} | val {val_loss:.4f}")

        # ── early stopping ──
        if val_loss < best_val - 1e-5:
            best_val = val_loss
            # ⚠️ clone 필수. state_dict() 는 텐서 '참조'를 반환하므로, 복사하지 않으면
            #    이후 optimizer.step() 이 그 텐서를 직접 수정해 '최적 시점'이 아니라
            #    마지막 시점의 가중치가 저장된다(early stopping 이 조용히 무력화됨).
            best_state = {k: v.detach().clone() for k, v in model.state_dict().items()}
            bad_epochs = 0
        else:
            bad_epochs += 1
            if bad_epochs >= patience:
                print(f"early stopping at epoch {epoch} (best val={best_val:.4f})")
                break

    # ── 5) 저장 ──
    # 아키텍처 정보를 함께 저장해 추론 코드가 하드코딩 없이 모델을 복원할 수 있게 한다.
    # loss_name 도 저장한다 - predictor 가 sigmoid 적용 여부를 자동 판단하는 데 쓴다.
    Path(model_out).parent.mkdir(parents=True, exist_ok=True)
    torch.save({
        "state_dict": best_state,
        "in_dim": int(X.shape[1]),
        "hidden_dims": list(hidden_dims),
        "out_dim": int(out_dim),
        "loss_name": loss_name,
    }, model_out)

    Path(scaler_out).parent.mkdir(parents=True, exist_ok=True)
    Path(scaler_out).write_text(
        json.dumps({"mean": mean.tolist(), "std": std.tolist()}, ensure_ascii=False),
        encoding="utf-8",
    )
    print(f"\n저장 완료: {model_out} / {scaler_out} (best val loss={best_val:.4f})")
    return best_val
