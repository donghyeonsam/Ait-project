"""
집계벡터 -> 학습된 표정 MLP -> 예측값.

[모델은 한 번만 읽는다]
모델 파일을 매 요청마다 읽으면 느리므로, 처음 한 번만 읽어 파일 바깥 변수에 담아둔다.
MLP 자체는 수십 KB 라 메모리 부담이 없다.
(torch 런타임이 200~300MB 정도를 쓰는데, 이는 표정 추론을 api 안에서 바로 처리하기로
 한 설계의 대가다. 16GB 서버에서는 감당 가능한 수준이다.)
"""
from __future__ import annotations

import json
import logging
import threading
from pathlib import Path

import numpy as np
import torch

from config import settings
from core.face.aggregator import FEATURE_DIM, FaceAggregate
from core.mlp import load_checkpoint

logger = logging.getLogger(__name__)

_model = None
_ckpt = None
_mean: np.ndarray | None = None
_std: np.ndarray | None = None

# 여러 요청이 같은 순간에 들어와도 모델을 한 번만 읽게 하는 자물쇠.
# 표정은 지금 한 스레드에서만 돌지만, 나중에 별도 스레드로 옮길 가능성에 대비해
# 음성 쪽과 같은 구조로 맞춰둔다.
_load_lock = threading.Lock()


def _load() -> None:
    """모델과 보정값을 읽어 메모리에 올린다. 이미 올라와 있으면 아무것도 안 한다."""
    global _model, _ckpt, _mean, _std

    # 대부분의 요청은 여기서 바로 끝난다(자물쇠를 건드리지도 않아 빠르다).
    if _model is not None:
        return

    with _load_lock:
        # 자물쇠를 기다리는 사이에 다른 요청이 이미 다 읽었을 수 있으므로 한 번 더 확인한다.
        if _model is not None:
            return

        ckpt_path = Path(settings.face_model_path)
        if not ckpt_path.exists():
            raise FileNotFoundError(
                f"학습된 표정 모델이 없습니다: {ckpt_path}\n"
                "training/face/train_mlp.py 를 먼저 실행해 모델을 만들어주세요."
            )

        model, ckpt = load_checkpoint(str(ckpt_path))

        if ckpt["in_dim"] != FEATURE_DIM:
            # 집계 방식을 바꾼 뒤 재학습을 잊었을 때 여기서 바로 잡힌다.
            raise RuntimeError(
                f"모델 입력 개수({ckpt['in_dim']})와 현재 집계벡터 개수({FEATURE_DIM})가 "
                "다릅니다. aggregator.py 를 고쳤다면 반드시 재학습해야 합니다."
            )

        scaler_path = Path(settings.face_scaler_path)
        if not scaler_path.exists():
            raise FileNotFoundError(f"보정값 파일이 없습니다: {scaler_path}")
        scaler = json.loads(scaler_path.read_text(encoding="utf-8"))

        # ⚠️ 채우는 순서가 중요하다.
        # _model 이 '로딩 완료' 신호등 역할을 하므로 맨 마지막에 채워야 한다.
        # 먼저 채우면, 다른 요청이 "다 됐네" 하고 들어왔는데 _mean 은 아직 비어 있는
        # 상태가 되어 에러가 난다.
        _mean = np.array(scaler["mean"], dtype=np.float32)
        _std = np.array(scaler["std"], dtype=np.float32)
        _ckpt = ckpt
        _model = model

        logger.info("표정 모델 로드 완료 (입력 %d개, 학습방식 %s)",
                    ckpt["in_dim"], ckpt["loss_name"])


def predict_face(agg: FaceAggregate) -> dict:
    """집계 결과 -> {"tension_score": 점수, 부가지표...}"""
    _load()

    # 학습할 때 계산해둔 평균/퍼짐으로 값을 보정한다.
    # ⚠️ 반드시 '학습 때의' 값을 써야 한다. 지금 들어온 데이터로 다시 계산하면
    #    데이터가 하나뿐이라 전부 0이 되어 완전히 다른 값이 모델에 들어간다.
    x = (agg.vector - _mean) / np.maximum(_std, 1e-6)

    # 모델은 여러 개를 한꺼번에 받도록 되어 있어서, 하나뿐인 우리 데이터에
    # 껍데기를 하나 씌운다. (116,) -> (1, 116)
    tensor = torch.from_numpy(x).float().unsqueeze(0)

    # no_grad(): 학습용 준비 작업을 생략해 메모리와 속도가 좋아진다.
    # (모델을 추론 모드로 바꾸는 eval() 은 load_checkpoint 안에서 이미 했다.
    #  둘은 서로 다른 것이고 추론에는 둘 다 필요하다)
    with torch.no_grad():
        out = _model(tensor)

    # 학습할 때 쓴 방식에 따라 마무리 처리가 달라진다.
    # 사람이 기억해서 맞추면 반드시 틀리므로, 모델 파일에 저장해둔 값으로 자동 분기한다.
    if _ckpt["loss_name"] == "bce":
        score = float(torch.sigmoid(out).squeeze().item())
    else:
        score = float(np.clip(out.squeeze().item(), 0.0, 1.0))

    return {
        "tension_score": score,
        # FaceResult 스키마에 confidence_score 가 추가되면서(음성 쪽과 축을
        # 통일하기 위해) 여기서도 보수(1-score)를 함께 내려준다.
        "confidence_score": float(np.clip(1.0 - score, 0.0, 1.0)),
        "blink_per_minute": agg.blink_per_minute,
        "gaze_off_ratio": agg.gaze_off_ratio,
        "analyzed_frames": agg.analyzed_frames,
    }
