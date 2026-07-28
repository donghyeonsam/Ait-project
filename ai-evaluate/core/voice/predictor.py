"""
피처벡터 -> 학습된 음성 MLP -> confidence(자신감) / tension(긴장도).

[teacher 확정 이후 출력이 바뀌었다]
이전엔 audeering(영어 arousal/valence/dominance 3축)을 teacher 로 썼으나,
jungjongho(한국어 6클래스 감정 분류)로 교체하면서 출력도 표정 쪽(FaceResult)과
동일한 confidence/tension 2축으로 통일했다. 자세한 배경은
training/voice/make_pseudo_labels.py 상단 주석 참고.

[여러 스레드에서 동시에 불린다]
음성 분석은 여러 요청이 각자 다른 스레드에서 돌아간다. 그래서 모델을 읽는 부분에
자물쇠를 걸어 한 번만 읽히도록 했다.
"""
from __future__ import annotations

import json
import logging
import threading
from pathlib import Path

import numpy as np
import torch

from config import settings
from core.mlp import load_checkpoint
from core.voice.feature_extractor import FEATURE_DIM

logger = logging.getLogger(__name__)

_model = None
_ckpt = None
_mean: np.ndarray | None = None
_std: np.ndarray | None = None
_load_lock = threading.Lock()


def _load() -> None:
    global _model, _ckpt, _mean, _std

    if _model is not None:
        return

    with _load_lock:
        if _model is not None:   # 기다리는 사이 다른 스레드가 끝냈을 수 있다
            return

        ckpt_path = Path(settings.voice_model_path)
        if not ckpt_path.exists():
            raise FileNotFoundError(
                f"학습된 음성 모델이 없습니다: {ckpt_path}\n"
                "training/voice/train_mlp.py 를 먼저 실행해주세요."
            )

        model, ckpt = load_checkpoint(str(ckpt_path))
        if ckpt["in_dim"] != FEATURE_DIM:
            raise RuntimeError(
                f"모델 입력 개수({ckpt['in_dim']})와 현재 피처 개수({FEATURE_DIM})가 "
                "다릅니다. feature_extractor.py 를 고쳤다면 재학습이 필요합니다."
            )
        if ckpt["out_dim"] != 2:
            # confidence/tension 2축으로 확정하기 전(구버전 audeering 3축)에 학습된
            # 체크포인트를 실수로 그대로 로드하면 언패킹이 어긋난다 - 여기서 바로 잡는다.
            raise RuntimeError(
                f"모델 출력 개수({ckpt['out_dim']})가 2(confidence, tension)가 아닙니다. "
                "구버전(audeering, out_dim=3) 체크포인트라면 "
                "training/voice/train_mlp.py --teacher jungjongho 로 재학습하세요."
            )

        scaler_path = Path(settings.voice_scaler_path)
        if not scaler_path.exists():
            raise FileNotFoundError(f"보정값 파일이 없습니다: {scaler_path}")
        scaler = json.loads(scaler_path.read_text(encoding="utf-8"))

        # ⚠️ _model 을 마지막에 채운다. 이유는 core/face/predictor.py 주석 참고.
        _mean = np.array(scaler["mean"], dtype=np.float32)
        _std = np.array(scaler["std"], dtype=np.float32)
        _ckpt = ckpt
        _model = model

        logger.info("음성 모델 로드 완료 (입력 %d개, 학습방식 %s)",
                    ckpt["in_dim"], ckpt["loss_name"])


def predict_voice(feature: np.ndarray) -> dict:
    """피처벡터 -> {"confidence_score": 0~1, "tension_score": 0~1}

    ⚠️ 키 이름이 api/schemas/analysis.py 의 VoiceResult 필드명과 정확히 같아야 한다.
       api/routers/analysis.py 가 VoiceResult(**result) 로 그대로 언패킹하기 때문에,
       여기서 이름이 어긋나면 pydantic 검증 에러로 바로 터진다(다행히 조용히 틀리는
       종류의 실수는 아니다).
    """
    _load()
    x = (feature - _mean) / np.maximum(_std, 1e-6)

    with torch.no_grad():
        out = _model(torch.from_numpy(x).float().unsqueeze(0)).squeeze(0)

    # 표정 쪽(core/face/predictor.py)과 동일하게, 학습할 때 쓴 손실함수에 따라
    # 마무리 처리를 자동 분기한다. 사람이 기억해서 맞추면 반드시 틀린다.
    if _ckpt["loss_name"] == "bce":
        values = torch.sigmoid(out).numpy()
    else:
        values = np.clip(out.numpy(), 0.0, 1.0)

    confidence, tension = [float(v) for v in values]
    return {"confidence_score": confidence, "tension_score": tension}
