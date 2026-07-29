"""
오디오 클립 1개 -> 경량 피처벡터 (44차원).

[2026-07-29 추가된 6차원]
student 가 teacher(jungjongho) 를 따라가는 정도(r=0.809)를 좀 더 끌어올리려고
"평균/표준편차로만 뭉뚱그리면 사라지는 신호"를 보강했다. 셋 다 이미 계산해두고
있던 Praat/librosa 객체에 호출 하나씩만 더 얹는 수준이라 연산 비용 증가는 미미하다.
  - f0_delta/f0_slope   : 피치의 시간적 변화(표정 aggregator.py 의 ear_delta/
                          dev_slope 와 같은 개념). "처음엔 떨다가 안정됨"과
                          "처음엔 괜찮다가 후반에 무너짐"을 구분하기 위함.
  - formant1/2_mean     : 성도(목/턱/혀) 긴장이 공명주파수를 바꾸는 것을 잡기 위함.
  - spectral_centroid   : 목소리의 "밝기/거칠기". 긴장하면 고주파 에너지가 늘어
                          거칠게 들리는 경향과 관련이 있을 수 있다는 가설.
⚠️ jitter/shimmer 와 마찬가지로 이 6개도 "면접 긴장도"와 실제 상관관계가 검증된
   것은 아니다. train_mlp.py 재학습 후 축별 상관계수로 기여도를 확인할 것 -
   기여가 없으면 다음 정리 때 미련 없이 뺄 것.

[이전 버전에서 고친 것 두 가지]
 1) librosa.pyin 제거.
    pyin 은 확률적 YIN + HMM Viterbi 디코딩이라 이 파이프라인에서 가장 느린 구간이었다.
    그런데 Praat 도 jitter 를 계산하려면 어차피 내부적으로 피치를 구하므로, 같은 일을
    두 번 하고 있었다. F0 통계를 Praat 의 Pitch 객체에서 가져오면 pyin 을 통째로 뺄 수
    있다. Praat 피치 추정도 음성 도메인에서 수십 년 검증된 구현이며 훨씬 빠르다.
    (덤으로 이전 코드의 fmax=C7(2093Hz)는 사람 말소리 F0 범위를 한참 벗어난 낭비였다)

 2) 샘플레이트를 의도적으로 분리.
    이전 코드는 librosa 로 16kHz 리샘플을 해놓고 parselmouth.Sound(path) 로 원본을
    다시 읽고 있었다 - 실수였지만 결과적으로는 이게 맞는 동작이라, 의도로 바꿔 명시한다.
      - librosa (16kHz) : MFCC/에너지/온셋. teacher(wav2vec2)와 동일 조건 유지 목적.
      - Praat  (원본)   : F0/jitter/shimmer/HNR.
        jitter 는 주기 길이의 미세 변동(1% ~= 50us)을 재는 지표인데, 16kHz 는 1샘플이
        62.5us 로 측정 대상보다 눈금이 커서 정밀도가 부족하다. 원본 44.1kHz 가 정확하다.

[왜 음성만 서버에 남는가]
parselmouth 는 Praat(음성학 표준 소프트웨어)의 C/C++ 소스를 그대로 바인딩한 것이라
브라우저에 대체재가 없다. librosa 의 MFCC/온셋도 마찬가지다. 그래서 표정과 달리
음성은 오디오를 서버로 보내고 Celery 워커가 처리하는 구조를 유지한다.
(다만 영상이 아니라 오디오만 보내므로 페이로드는 훨씬 작다: 90초 opus ~= 700KB)
"""
from __future__ import annotations

import logging

import librosa
import numpy as np
import parselmouth
from parselmouth.praat import call as praat_call

from config import settings

logger = logging.getLogger(__name__)

N_MFCC = 13
# 3(F0) + 2(RMS) + 4(휴지/속도/길이) + 3(음질) + 13*2(MFCC)
#   + 2(F0 시간변화) + 2(포먼트) + 2(스펙트럼 무게중심) = 44
FEATURE_DIM = 3 + 2 + 4 + 3 + N_MFCC * 2 + 2 + 2 + 2

# 포먼트 추출 최대 주파수(Hz). 화자 성별을 미리 알 수 없어 Praat 매뉴얼이 권장하는
# 성인 평균값(남/녀 중간 지점)으로 고정한다 - 성별별 최적값(남 5000/여 5500)보다는
# 부정확하지만, 우리 목적은 절대 포먼트값이 아니라 "긴장 시 얼마나 이동하는가"의
# 상대 비교라 이 정도 근사로 충분하다.
FORMANT_MAX_HZ = 5500.0

MIN_DURATION_SEC = 1.0


def _clean(v) -> float:
    """
    Praat 은 계산 불가 시 NaN(--undefined--)을 반환한다.
    NaN 은 어떤 연산과도 NaN 이므로, 하나라도 MLP 에 들어가면 출력 전체가 오염된다.
    반드시 여기서 걸러야 한다.
    """
    if v is None:
        return 0.0
    try:
        f = float(v)
    except (TypeError, ValueError):
        return 0.0
    return 0.0 if (np.isnan(f) or np.isinf(f)) else f


def _praat_features(path: str) -> dict[str, float]:
    """
    Praat(parselmouth)으로 F0 통계 + 음질 지표를 한 번에 계산한다.

    [지표 의미]
      F0        : 기본주파수(목소리 높낮이). 표준편차는 억양의 다양성/떨림을 반영.
      jitter    : 연속한 성대 진동 '주기 길이'의 흔들림 -> 주파수 불안정, 거친 목소리
      shimmer   : 연속한 주기의 '진폭' 흔들림 -> 음량 불안정
      HNR       : 배음 대 잡음 비(dB). 높을수록 맑고 안정적인 목소리

    ⚠️ 임상에서 인용되는 정상범위(jitter<1.04%, shimmer<3.81%, HNR>20dB)는 환자에게
       모음 '아-'를 3초간 지속 발성시켜 측정한 값이다. 우리는 자연스러운 답변 발화를
       다루므로(자음/무음이 끼어들고 억양 때문에 피치가 의도적으로 오르내림) 그 절대
       기준을 그대로 적용하면 안 된다. 같은 방식으로 계산한 값끼리의 상대 비교 용도로만
       쓰고, 실제로 긴장도와 상관이 있는지는 우리 데이터로 검증해야 한다.
    """
    snd = parselmouth.Sound(path)  # 원본 샘플레이트 유지가 의도된 동작

    floor = settings.praat_pitch_floor
    ceiling = settings.praat_pitch_ceiling

    # "To Pitch" 인자: (time_step, pitch_floor, pitch_ceiling)
    # time_step=0.0 은 Praat 자동 선택(보통 0.01초).
    pitch = praat_call(snd, "To Pitch", 0.0, floor, ceiling)

    # "Get mean" 등은 무성 구간을 자동으로 제외하고 계산한다.
    # (0, 0) = 전체 시간 범위. "Parabolic" = 극값을 포물선 보간으로 정밀화.
    f0_mean = _clean(praat_call(pitch, "Get mean", 0, 0, "Hertz"))
    f0_std = _clean(praat_call(pitch, "Get standard deviation", 0, 0, "Hertz"))
    f0_min = _clean(praat_call(pitch, "Get minimum", 0, 0, "Hertz", "Parabolic"))
    f0_max = _clean(praat_call(pitch, "Get maximum", 0, 0, "Hertz", "Parabolic"))
    f0_range = max(0.0, f0_max - f0_min)

    # PointProcess: 성대가 닫히는 순간들의 시각 배열. jitter/shimmer 계산의 전제다.
    # 'cc' = cross-correlation 방식으로 주기를 검출.
    point_process = praat_call(snd, "To PointProcess (periodic, cc)", floor, ceiling)

    # 인자: (t_min, t_max, 최단주기, 최장주기, 최대주기배율[, 최대진폭배율])
    #   0, 0        : 전체 구간
    #   0.0001      : 최단 주기 0.1ms (= 최고 10000Hz)
    #   0.02        : 최장 주기 20ms  (= 최저 50Hz)
    #   1.3         : 인접 두 주기의 비가 1.3 을 넘으면 그 쌍을 제외.
    #                 옥타브 오류(피치를 2배/절반으로 잘못 잡는 것)가 거대한 jitter 로
    #                 둔갑하는 것을 막는 장치다.
    #   1.6         : 위와 같은 개념의 진폭 버전(shimmer 전용)
    jitter = _clean(praat_call(
        point_process, "Get jitter (local)", 0, 0, 0.0001, 0.02, 1.3))
    shimmer = _clean(praat_call(
        [snd, point_process], "Get shimmer (local)", 0, 0, 0.0001, 0.02, 1.3, 1.6))

    # "To Harmonicity (cc)" 인자: (time_step, minimum_pitch, silence_threshold,
    #                              periods_per_window)
    harmonicity = praat_call(snd, "To Harmonicity (cc)", 0.01, floor, 0.1, 1.0)
    hnr = _clean(praat_call(harmonicity, "Get mean", 0, 0))

    # ── F0 의 시간적 변화 (표정 aggregator.py 의 ear_delta/dev_slope 와 같은 개념) ──
    # pitch 객체는 이미 위에서 "To Pitch" 로 만들어뒀으므로 재계산 없이 프레임별
    # F0 배열만 꺼내 쓴다. selected_array['frequency'] 는 무성 프레임을 0.0 으로 채운다.
    f0_track = pitch.selected_array["frequency"]
    voiced = f0_track[f0_track > 0]
    if voiced.size >= 6:  # 최소 몇 개는 있어야 앞/뒤 구간 비교가 의미를 가진다
        third = max(1, voiced.size // 3)
        f0_delta = float(voiced[-third:].mean() - voiced[:third].mean())
        # 1차 다항 회귀 기울기. 양수면 답변 후반으로 갈수록 피치가 올라감(긴장 상승 신호일 수 있음).
        f0_slope = float(np.polyfit(np.arange(voiced.size), voiced, 1)[0])
    else:
        f0_delta, f0_slope = 0.0, 0.0

    # ── 포먼트(성도 공명 주파수) ──
    # "To Formant (burg)" 인자: (time_step, max_number_of_formants, max_formant_hz,
    #                            window_length_sec, pre_emphasis_from_hz)
    # 5개 포먼트까지 추적하되 우리가 쓰는 건 F1/F2 뿐이다(F3 이상은 개인차가 커서
    # 이 용도엔 신호보다 잡음에 가깝다는 판단, 추후 상관계수 보고 재검토 가능).
    formant = praat_call(snd, "To Formant (burg)", 0.0, 5, FORMANT_MAX_HZ, 0.025, 50)
    f1 = _clean(praat_call(formant, "Get mean", 1, 0, 0, "Hertz"))
    f2 = _clean(praat_call(formant, "Get mean", 2, 0, 0, "Hertz"))

    return {
        "f0_mean": f0_mean,
        "f0_std": f0_std,
        "f0_range": f0_range,
        "f0_delta": _clean(f0_delta),
        "f0_slope": _clean(f0_slope),
        "jitter": jitter,
        "shimmer": shimmer,
        "hnr": hnr,
        "formant1": f1,
        "formant2": f2,
    }


def extract_voice_features(path: str) -> tuple[np.ndarray, dict]:
    """
    오디오 경로 -> (피처벡터 44차원, API 응답용 부가지표).

    표정과 마찬가지로 학습(training/voice/build_dataset.py)과 추론(worker/tasks.py)이
    이 함수를 공유해 training-serving skew 를 원천 차단한다.
    """
    # sr 을 명시하면 librosa 가 해당 레이트로 리샘플한다. mono=True 로 채널을 합친다.
    y, sr = librosa.load(path, sr=settings.voice_sample_rate, mono=True)
    duration = len(y) / sr
    if duration < MIN_DURATION_SEC:
        raise ValueError(f"오디오가 너무 짧습니다({duration:.2f}초)")

    praat = _praat_features(path)

    # ── 에너지 / 무음 ──
    rms = librosa.feature.rms(y=y)[0]  # 프레임별 음량

    # top_db=30 : 최대 음량보다 30dB 이상 작은 구간을 무음으로 간주.
    # split() 은 '소리가 있는 구간'의 [시작, 끝] 목록을 반환한다.
    intervals = librosa.effects.split(y, top_db=30)
    if len(intervals):
        voiced_len = int(np.sum(intervals[:, 1] - intervals[:, 0]))
        pause_count = max(0, len(intervals) - 1)  # 유성 구간 사이의 간격 = 휴지 횟수
    else:
        voiced_len, pause_count = 0, 0
    pause_ratio = float(np.clip(1.0 - (voiced_len / max(len(y), 1)), 0.0, 1.0))

    # ── 발화 속도 (근사) ──
    # 정확한 음절 수를 세려면 STT 가 필요하다. 여기서는 '소리의 시작점(onset) 개수'를
    # 음절 수의 대리 지표로 삼는다. 절대값은 부정확하지만, 같은 방식으로 계산한 값끼리
    # 비교하는 데는(빠른 답변 vs 느린 답변) 충분히 유효하다.
    onsets = librosa.onset.onset_detect(y=y, sr=sr, units="frames")
    speech_rate = float(len(onsets) / max(duration, 1e-6))

    # ── MFCC ──
    # 사람의 청각 특성을 반영한 스펙트럼 요약. 음색/발음의 전반적 특징을 담는다.
    mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=N_MFCC)

    # ── 스펙트럼 무게중심 (밝기/거칠기) ──
    # MFCC 계산과 같은 STFT 프레임을 재사용하는 수준이라 추가 비용이 거의 없다.
    centroid = librosa.feature.spectral_centroid(y=y, sr=sr)[0]

    feature = np.concatenate([
        [praat["f0_mean"], praat["f0_std"], praat["f0_range"]],     # 3
        [float(rms.mean()), float(rms.std())],                       # 2
        [pause_ratio, float(pause_count), speech_rate, duration],    # 4
        [praat["jitter"], praat["shimmer"], praat["hnr"]],           # 3
        mfcc.mean(axis=1),                                           # 13
        mfcc.std(axis=1),                                            # 13
        [praat["f0_delta"], praat["f0_slope"]],                       # 2
        [praat["formant1"], praat["formant2"]],                       # 2
        [float(centroid.mean()), float(centroid.std())],              # 2
    ]).astype(np.float32)

    if feature.shape[0] != FEATURE_DIM:
        raise RuntimeError(
            f"음성 피처 차원 불일치: {feature.shape[0]} != {FEATURE_DIM}")

    # NaN/inf 최종 방어. 위에서 _clean 을 거쳤지만 librosa 쪽에서도 나올 수 있다.
    feature = np.nan_to_num(feature, nan=0.0, posinf=0.0, neginf=0.0)

    extras = {"speech_rate": speech_rate, "pause_ratio": pause_ratio}
    return feature, extras
