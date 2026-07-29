"""
Celery 태스크 - 음성 분석 전용.

[태스크는 얇게, 로직은 core/ 에]
실제 연산은 core/voice/ 에 두고 여기서는 호출만 한다. 이유는 두 가지:
  1) 테스트 - Celery 를 띄우지 않고 순수 함수만 단위테스트할 수 있다.
  2) 학습 재사용 - training/voice/build_dataset.py 가 같은 함수를 import 해서
     학습 때와 추론 때 피처 계산이 100% 동일함을 보장한다.
"""
from __future__ import annotations

import logging

from worker.celery_app import celery_app
from worker.storage import storage

logger = logging.getLogger(__name__)


@celery_app.task(name="worker.tasks.analyze_voice", bind=True)
def analyze_voice(self, key: str) -> dict:
    """
    오디오 1개 -> {"confidence_score","tension_score","speech_rate","pause_ratio"}

    [무거운 import 를 함수 안에서 하는 이유]
    librosa/parselmouth/torch 를 모듈 최상단에서 import 하면 워커 기동 순간 전부
    메모리에 올라간다. 함수 안에서 하면 첫 작업이 들어올 때 로딩되므로 기동이 빠르다.
    파이썬은 import 결과를 sys.modules 에 캐싱하므로 두 번째 호출부터는 비용이 없다.

    bind=True 로 받은 self 는 지금은 안 쓰지만, 진행률 보고(self.update_state)나
    재시도(self.retry)가 필요해질 때를 위해 미리 열어둔다.
    """
    from core.voice.feature_extractor import extract_voice_features
    from core.voice.predictor import predict_voice

    logger.info("[voice] 분석 시작: %s", key)
    try:
        local_path = storage.fetch_local(key)
        feature, extras = extract_voice_features(local_path)
        result = predict_voice(feature)
        # 규칙기반으로 이미 계산된 값은 MLP 를 거치지 않고 그대로 노출한다.
        result.update(extras)
        logger.info("[voice] 분석 완료: %s", key)
        return result
    finally:
        # 성공/실패 무관하게 업로드 파일을 지운다.
        # 지우지 않으면 공유 볼륨이 오디오 파일로 계속 차오른다.
        storage.delete(key)
