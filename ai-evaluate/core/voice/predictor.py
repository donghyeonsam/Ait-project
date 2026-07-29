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


def _tension_to_interview_score_10(tension: float) -> float:
    """
    tension_score(0~1) -> interview_score_10(0~10).

    [단조 증가에서 종형 곡선으로 바꾼 이유]
    이전엔 "긴장이 적을수록(confidence_score 가 높을수록) 좋은 점수"였다. 그런데
    실제 면접에서는 너무 편안해도(준비 안 된 느낌, 무성의해 보임) 좋은 인상이 아니다 -
    적당히 긴장한 상태가 오히려 좋은 신호다(여키스-도슨 법칙: 각성이 너무 낮아도
    너무 높아도 수행이 떨어지고, 중간 지점에서 최고치를 찍는다는 심리학 개념과 같은 결).

    그래서 정점(voice_ideal_tension)에서 멀어질수록(양방향 대칭으로) 점수가 깎이는
    가우시안(종형) 곡선을 쓴다:
        score = 10 * exp( -(tension - ideal)^2 / (2 * width^2) )
    tension == ideal 이면 10점, 멀어질수록 0에 가까워진다. 방향(너무 편안함 vs
    너무 긴장함)에 따라 감점 폭을 다르게 주지 않기로 했으므로 좌우 대칭이다.

    ⚠️ voice_ideal_tension/voice_tension_score_width(config.py)는 아직 잠정값이다.
       training/voice/sanity_check_sample.py 로 뽑은 표본을 실제로 들어보고 "이 정도
       긴장이 딱 좋다" 싶은 지점으로 voice_ideal_tension 을 조정할 것 - 재학습 없이
       이 두 숫자만 바꾸면 바로 반영된다.
    """
    ideal = settings.voice_ideal_tension
    width = settings.voice_tension_score_width
    score = 10.0 * np.exp(-((tension - ideal) ** 2) / (2 * width ** 2))
    return round(float(score), 1)


def predict_voice(feature: np.ndarray) -> dict:
    """피처벡터 -> {"confidence_score": 0~1, "tension_score": 0~1, "score": 0~10}

    ⚠️ 키 이름이 api/schemas/analysis.py 의 VoiceResult 필드명과 정확히 같아야 한다.
       api/routers/analysis.py 가 VoiceResult(**result) 로 그대로 언패킹하기 때문에,
       여기서 이름이 어긋나면 pydantic 검증 에러로 바로 터진다(다행히 조용히 틀리는
       종류의 실수는 아니다).

    [score] BE 가 "10점 만점" 점수로 바로 쓰라고 편의상 추가한 필드다(예전 이름은
    interview_score_10, 2026-07-29 BE 응답 스펙을 이 필드 하나로 좁히면서 score 로
    개명). 모델이 새로 뭘 예측하는 게 아니라 이미 나온 tension_score(0~1)를 종형
    곡선에 통과시킨 후처리 값이라 - 이 계산식을 바꾸려고 teacher/student 를 재학습할
    필요는 없다. (연속값 confidence_score/tension_score 자체는 내부적으로 계속
    계산하되 응답 스키마에서만 뺀 것과 같은 원칙이다.)
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
    return {
        "confidence_score": confidence,
        "tension_score": tension,
        "score": _tension_to_interview_score_10(tension),
    }
