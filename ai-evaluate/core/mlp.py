"""
표정/음성 MLP 공용 아키텍처.

[왜 core/ 에 두는가]
이 클래스는 학습(training/)과 추론(api/, worker/) 양쪽에서 필요하다. training/ 은
도커 이미지에서 제외되므로, 학습 쪽에 두면 서버가 모델을 복원할 수 없다.
따라서 이미지에 포함되는 core/ 에 두고 training/ 이 이것을 import 한다.

[모델이 별개인 것과 클래스를 공유하는 것은 다른 얘기]
표정 MLP 와 음성 MLP 는 완전히 독립된 모델이다(각자 자기 모달리티만 입력받아
따로 학습하고 따로 추론한다). 다만 그 '구조'는 똑같은 형태의 다층 퍼셉트론이라
입력/출력 차원만 인자로 받아 하나의 클래스로 처리한다.
"""
from __future__ import annotations

from typing import Iterable

import torch
import torch.nn as nn


class MLP(nn.Module):
    def __init__(
        self,
        in_dim: int,
        hidden_dims: Iterable[int] = (64, 32),
        out_dim: int = 1,
        dropout: float = 0.3,
    ):
        """
        in_dim      : 입력 피처 차원 (표정 116 / 음성 38)
        hidden_dims : 은닉층 크기.
                      ⚠️ (64, 32)는 확정값이 아니다. 클립이 100개 미만이면 (32, 16)
                      정도로 줄여야 과적합을 피할 수 있다. 검증 성능을 보고 조정할 것.
        out_dim     : 출력 차원 (표정 회귀 1 / 음성 confidence·tension 2)
        dropout     : 학습 중 뉴런을 무작위로 끄는 비율. 데이터가 적을 때 필수적인
                      과적합 방지 장치라 0.3 으로 다소 높게 잡았다.
        """
        super().__init__()

        layers: list[nn.Module] = []
        prev = in_dim
        for h in hidden_dims:
            # Linear -> BatchNorm -> ReLU -> Dropout 순서는 관례적으로 가장 안정적이다.
            # BatchNorm 을 ReLU 앞에 두면 평균 0 근처로 정규화된 값이 ReLU 에 들어가
            # 뉴런의 절반 정도가 활성화되는 균형이 잡힌다.
            layers.append(nn.Linear(prev, h))
            # ⚠️ BatchNorm1d 는 배치 크기가 1이면 표준편차를 못 구해 에러가 난다.
            #    학습 시 batch_size >= 8, drop_last=True 로 방어한다(training/trainer.py).
            layers.append(nn.BatchNorm1d(h))
            # 비선형이 없으면 Linear 를 아무리 쌓아도 하나의 Linear 로 축약되어
            # 층을 쌓는 의미가 사라진다.
            layers.append(nn.ReLU())
            layers.append(nn.Dropout(dropout))
            prev = h

        # 출력층에는 활성함수를 붙이지 않고 raw 값을 반환한다.
        # 활성함수는 손실함수 쪽에서 처리하는 편이 수치적으로 안정적이다
        # (예: BCEWithLogitsLoss 는 sigmoid 를 내부에서 안정적으로 계산한다).
        layers.append(nn.Linear(prev, out_dim))

        self.net = nn.Sequential(*layers)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """x: (batch, in_dim) -> (batch, out_dim)"""
        return self.net(x)


def load_checkpoint(model_path: str):
    """
    저장된 체크포인트에서 MLP 를 복원한다.

    아키텍처 정보(in_dim/hidden_dims/out_dim)를 체크포인트에 함께 저장해두었기
    때문에, 나중에 은닉층 크기를 바꿔 재학습해도 추론 코드는 수정할 필요가 없다.
    """
    # weights_only=True : 체크포인트에서 텐서만 읽고 임의 객체 역직렬화를 막는다(보안).
    ckpt = torch.load(model_path, map_location="cpu", weights_only=True)
    model = MLP(
        in_dim=ckpt["in_dim"],
        hidden_dims=ckpt["hidden_dims"],
        out_dim=ckpt["out_dim"],
    )
    model.load_state_dict(ckpt["state_dict"])
    # eval() 필수: dropout 을 끄고 batchnorm 을 추론 모드로 전환한다.
    # 빠뜨리면 같은 입력에 매번 다른 결과가 나온다(dropout 이 무작위로 뉴런을 끄므로).
    model.eval()
    return model, ckpt
