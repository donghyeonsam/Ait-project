"""
[음성 학습 1단계] teacher(wav2vec2)로 pseudo-label 생성

사람이 라벨링하지 않고, 무거운 사전학습 모델의 출력을 정답으로 삼는다.
이것이 distillation 의 'teacher' 역할이다.

⚠️ 이 스크립트만 wav2vec2-large(3억~ 파라미터)를 로드한다. 서빙 서버에는 절대
   올라가지 않는다 - 그것이 distillation 을 하는 이유 전부다.
   GPU 가 있으면 훨씬 빠르지만 클립 수백 개 수준이면 CPU 로도 감당 가능하다.

[teacher 두 종류를 지원한다]
  --teacher audeering   (기본값)
      영어 MSP-Podcast 로 학습된 연속값 회귀 모델. arousal/dominance/valence(0~1)를
      그대로 출력한다. 한국어 음성에 그대로 돌리면 "영어 화자의 감정 표현 방식" 기준으로
      점수가 매겨진다는 domain gap 이 있다.
  --teacher jungjongho
      한국어 wav2vec2-xlsr 기반 6클래스(기쁨/당황/분노/불안/슬픔/중립) 분류 모델.
      한국어로 학습됐다는 장점이 있지만 이산 분류라서, 우리가 원하는 연속값
      자신감/긴장도로 쓰려면 클래스 확률을 규칙 기반으로 재조합해야 한다(아래
      CONFIDENCE_WEIGHTS 참고). 학습 데이터 출처가 불명확하고 검증 정확도(99.76%)가
      비정상적으로 높아 연기 발화 코퍼스일 가능성이 있다는 점을 감안할 것.

  두 teacher 를 모두 돌려서 앙상블(평균)하는 것도 가능하다 - build_dataset.py 단계에서
  두 CSV 를 합치면 된다. 아래 안내 문구가 매번 "sanity check 필수"를 강조하는 이유는,
  이 프로젝트의 전체 파이프라인이 결국 teacher 를 신뢰할 수 있다는 전제 위에 서 있기
  때문이다(teacher 가 틀리면 student 도 그대로 틀리게 학습된다).

[윈도우 분할 권장 - 음성만의 장점]
teacher 가 라벨을 만들어주므로, 긴 답변을 15초 단위로 잘라 각 조각을 독립 샘플로
쓸 수 있다. 각 조각이 '복사된 라벨'이 아니라 '자기 자신의 실제 측정값'을 갖게 되므로
라벨 노이즈 문제가 생기지 않는다. 표정 쪽은 사람이 라벨링하므로 이게 불가능하다.
  --window 15  옵션으로 활성화한다.

[AIHub 채용면접 음성 데이터셋처럼 폴더가 중첩된 경우]
기본은 --audio 바로 아래 파일만 훑는다. 하위 폴더(직군/성별/경력 등)까지 재귀적으로
훑으려면 --recursive 를 주고, 답변 음성만 걸러내려면(질문/답변이 같이 있는 경우)
--filename-contains "_a_" 처럼 파일명에 포함될 문자열을 지정한다.

실행 예:
  pip install -r requirements.txt -r requirements-train.txt

  # audeering(연속값) teacher, 우리 자체 클립 폴더가 평평한 구조일 때
  python -m training.voice.make_pseudo_labels \
      --teacher audeering \
      --audio data/raw/audio --out data/processed/voice_pseudo_labels_audeering.csv \
      --window 15

  # jungjongho(한국어 6클래스) teacher, AIHub 채용면접 음성처럼 중첩 폴더 + 답변만 필터
  python -m training.voice.make_pseudo_labels \
      --teacher jungjongho \
      --audio data/raw/aihub_interview_audio --recursive --filename-contains "_a_" \
      --out data/processed/voice_pseudo_labels_jungjongho.csv --window 15
"""
from __future__ import annotations

import argparse
import csv
from pathlib import Path

import librosa
import numpy as np
import soundfile as sf
import torch
import torch.nn as nn
from transformers import AutoConfig, AutoFeatureExtractor
from transformers.models.wav2vec2.modeling_wav2vec2 import (
    Wav2Vec2Model,
    Wav2Vec2PreTrainedModel,
)

SAMPLE_RATE = 16000

TEACHER_MODEL_NAMES = {
    "audeering": "audeering/wav2vec2-large-robust-12-ft-emotion-msp-dim",
    "jungjongho": "jungjongho/wav2vec2-xlsr-korean-speech-emotion-recognition2_data_rebalance",
}

# jungjongho 모델의 6클래스를 "자신감/긴장도" 스칼라 하나로 재조합하는 가중치.
# 근거는 순전히 휴리스틱이다 - 면접 맥락에서 불안/당황/슬픔은 자신감을 깎아먹는
# 신호로, 분노는 절반 가중치로(방어적 태도일 수도, 단호함일 수도 있어 모호함),
# 기쁨/중립은 안정적으로 답하는 신호로 취급한다.
# ⚠️ 반드시 sanity check 로 재조정할 값이다. 우리 실제 면접 녹음을 들어보고
#    이 가중치가 체감과 맞는지 확인 후 조정하라.
TENSION_WEIGHTS = {
    "기쁨": 0.0,
    "당황": 1.0,
    "분노": 0.5,
    "불안": 1.0,
    "슬픔": 0.3,
    "중립": 0.0,
}


class RegressionHead(nn.Module):
    """audeering 모델 카드에 명시된 커스텀 헤드. 표준 AutoModel 로는 로드되지 않는다."""

    def __init__(self, config):
        super().__init__()
        self.dense = nn.Linear(config.hidden_size, config.hidden_size)
        self.dropout = nn.Dropout(config.final_dropout)
        self.out_proj = nn.Linear(config.hidden_size, config.num_labels)

    def forward(self, features):
        x = self.dropout(torch.tanh(self.dense(features)))
        return self.out_proj(x)


class EmotionModel(Wav2Vec2PreTrainedModel):
    """audeering: wav2vec2 백본 + 회귀 헤드 (arousal/dominance/valence)."""

    def __init__(self, config):
        super().__init__(config)
        self.wav2vec2 = Wav2Vec2Model(config)
        self.classifier = RegressionHead(config)
        self.init_weights()

    def forward(self, input_values):
        hidden = self.wav2vec2(input_values)[0]
        pooled = torch.mean(hidden, dim=1)
        return self.classifier(pooled)


class Wav2Vec2ClassificationHead(nn.Module):
    """jungjongho 모델이 쓰는 헤드 구조(m3hrdadfi 패턴). 이 저장소엔 클래스 정의가
    없어 config.json(hidden_size=1024, final_dropout=0.0, num_labels=6)에 맞춰
    직접 재현했다. 가중치는 from_pretrained 가 이 클래스의 파라미터 이름
    (dense/out_proj)에 그대로 매핑해준다."""

    def __init__(self, config):
        super().__init__()
        self.dense = nn.Linear(config.hidden_size, config.hidden_size)
        self.dropout = nn.Dropout(config.final_dropout)
        self.out_proj = nn.Linear(config.hidden_size, config.num_labels)

    def forward(self, features):
        x = self.dropout(features)
        x = torch.tanh(self.dense(x))
        x = self.dropout(x)
        return self.out_proj(x)


class Wav2Vec2ForSpeechClassification(Wav2Vec2PreTrainedModel):
    """jungjongho: wav2vec2 백본 + 분류 헤드. config.pooling_mode(="mean")를 그대로
    따른다 - 학습 때와 다른 pooling 을 쓰면 헤드 가중치가 안 맞아 출력이 무의미해진다."""

    def __init__(self, config):
        super().__init__(config)
        self.pooling_mode = config.pooling_mode
        self.wav2vec2 = Wav2Vec2Model(config)
        self.classifier = Wav2Vec2ClassificationHead(config)
        self.init_weights()

    def _pool(self, hidden_states):
        if self.pooling_mode == "mean":
            return torch.mean(hidden_states, dim=1)
        if self.pooling_mode == "sum":
            return torch.sum(hidden_states, dim=1)
        if self.pooling_mode == "max":
            return torch.max(hidden_states, dim=1)[0]
        raise ValueError(f"알 수 없는 pooling_mode: {self.pooling_mode}")

    def forward(self, input_values):
        hidden = self.wav2vec2(input_values)[0]
        pooled = self._pool(hidden)
        return self.classifier(pooled)


def iter_windows(y: np.ndarray, sr: int, window_sec: float):
    """오디오를 window_sec 단위로 자른다. window_sec<=0 이면 통째로 1개."""
    if window_sec <= 0:
        yield 0, y
        return
    size = int(window_sec * sr)
    for i in range(0, len(y), size):
        chunk = y[i:i + size]
        # 너무 짧은 자투리는 버린다(통계가 의미를 갖지 못함).
        if len(chunk) >= sr * 3:
            yield i // size, chunk


def discover_audio_files(root: Path, recursive: bool, filename_contains: str | None):
    exts = {".wav", ".flac", ".mp3", ".m4a", ".ogg"}
    it = root.rglob("*") if recursive else root.iterdir()
    files = [p for p in it if p.is_file() and p.suffix.lower() in exts]
    if filename_contains:
        files = [p for p in files if filename_contains in p.name]
    return sorted(files)


def load_teacher(teacher: str, device: torch.device):
    model_name = TEACHER_MODEL_NAMES[teacher]
    feature_extractor = AutoFeatureExtractor.from_pretrained(model_name)
    config = AutoConfig.from_pretrained(model_name)
    if teacher == "audeering":
        model = EmotionModel.from_pretrained(model_name, config=config)
    elif teacher == "jungjongho":
        model = Wav2Vec2ForSpeechClassification.from_pretrained(model_name, config=config)
    else:
        raise ValueError(f"알 수 없는 teacher: {teacher}")
    model.eval()
    model.to(device)  # GPU 가 있으면 여기서 VRAM 에 올라간다. inputs 쪽도 같은 device 로 옮겨야 한다.
    return feature_extractor, model, config


def run_audeering(model, input_values) -> dict:
    with torch.no_grad():
        out = model(input_values).squeeze(0).cpu().numpy()
    # ⚠️ 이 모델의 출력 순서는 (arousal, dominance, valence) 다.
    #    valence 가 세 번째라는 점을 놓치기 쉽다 - a/v/d 순서라고 착각하면
    #    에러 없이 값만 뒤바뀐다.
    arousal, dominance, valence = [float(np.clip(v, 0.0, 1.0)) for v in out]
    return {"arousal": round(arousal, 4), "valence": round(valence, 4),
            "dominance": round(dominance, 4)}


def run_jungjongho(model, config, input_values) -> dict:
    with torch.no_grad():
        logits = model(input_values).squeeze(0)
    probs = torch.softmax(logits, dim=-1).cpu().numpy()
    id2label = config.id2label  # {0: "기쁨", 1: "당황", ...} (transformers 가 str 키를 int 로 정리해줌)
    label_probs = {id2label[i]: float(p) for i, p in enumerate(probs)}

    tension = sum(label_probs[k] * w for k, w in TENSION_WEIGHTS.items())
    tension = float(np.clip(tension, 0.0, 1.0))
    confidence = round(1.0 - tension, 4)

    row = {f"p_{k}": round(v, 4) for k, v in label_probs.items()}
    row["tension"] = round(tension, 4)
    row["confidence"] = confidence
    return row


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--teacher", choices=list(TEACHER_MODEL_NAMES), default="audeering",
                        help="어떤 사전학습 모델을 teacher 로 쓸지")
    parser.add_argument("--audio", required=True, help="오디오 폴더")
    parser.add_argument("--out", required=True, help="출력 csv")
    parser.add_argument("--window", type=float, default=0.0,
                        help="윈도우 길이(초). 0이면 클립 통째로. 권장 15")
    parser.add_argument("--chunks-dir", default="data/processed/audio_chunks",
                        help="윈도우 분할 시 잘린 wav 를 저장할 폴더")
    parser.add_argument("--recursive", action="store_true",
                        help="--audio 하위 폴더까지 재귀적으로 탐색(AIHub 처럼 "
                             "직군/성별/경력 폴더로 중첩된 경우)")
    parser.add_argument("--filename-contains", default=None,
                        help='파일명에 이 문자열이 포함된 것만 사용. 예: "_a_" '
                             '(AIHub 채용면접 음성에서 질문(_q_)이 아닌 답변만 거를 때)')
    parser.add_argument("--device", default=None,
                         help='"cuda"/"cpu" 직접 지정. 생략하면 GPU 가 있으면 자동으로 씀')
    args = parser.parse_args()

    device = torch.device(
        args.device if args.device else ("cuda" if torch.cuda.is_available() else "cpu")
    )
    print(f"[device] {device} 사용 (torch {torch.__version__})")

    feature_extractor, model, config = load_teacher(args.teacher, device)

    chunks_dir = Path(args.chunks_dir)
    if args.window > 0:
        chunks_dir.mkdir(parents=True, exist_ok=True)

    audio_files = discover_audio_files(Path(args.audio), args.recursive, args.filename_contains)
    if not audio_files:
        raise SystemExit(
            f"오디오가 없습니다: {args.audio} "
            f"(recursive={args.recursive}, filename_contains={args.filename_contains!r})"
        )

    rows = []
    for path in audio_files:
        y, _ = librosa.load(str(path), sr=SAMPLE_RATE, mono=True)

        for wi, chunk in iter_windows(y, SAMPLE_RATE, args.window):
            if args.window > 0:
                # 잘라낸 조각을 파일로 저장한다. 다음 단계(build_dataset)에서
                # 같은 조각으로 경량 피처를 뽑아야 라벨과 입력이 정확히 짝지어진다.
                out_name = f"{path.stem}_w{wi:03d}.wav"
                sf.write(str(chunks_dir / out_name), chunk, SAMPLE_RATE)
                file_name = out_name
            else:
                file_name = path.name

            # feature_extractor 가 모델 규격에 맞는 정규화를 수행한다.
            # 이걸 건너뛰고 raw 파형을 넣으면 출력이 크게 틀어진다.
            inputs = feature_extractor(chunk, sampling_rate=SAMPLE_RATE, return_tensors="pt")
            input_values = inputs.input_values.to(device)  # 모델과 같은 device 로 옮겨야 한다

            if args.teacher == "audeering":
                extra = run_audeering(model, input_values)
                summary = f"a={extra['arousal']:.3f} v={extra['valence']:.3f} d={extra['dominance']:.3f}"
            else:
                extra = run_jungjongho(model, config, input_values)
                summary = f"confidence={extra['confidence']:.3f} tension={extra['tension']:.3f}"

            rows.append({"file_name": file_name, "source_clip": path.stem, **extra})
            print(f"[ok] {file_name} {summary}")

    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    fieldnames = list(rows[0].keys()) if rows else ["file_name", "source_clip"]
    with open(args.out, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"\n저장: {args.out} ({len(rows)}개, teacher={args.teacher})")
    if args.window > 0:
        print(f"잘린 오디오: {chunks_dir}  "
              f"-> 다음 단계에서 --audio 로 이 폴더를 지정하세요.")
    print(
        "\n⚠️ sanity check 필수: 위 결과 중 5~10개를 직접 들어보고 값이 납득 가능한지"
        " 확인하세요.\n   audeering 은 영어 감정 데이터, jungjongho 는 출처가 불명확한"
        " 한국어 데이터로 학습됐습니다 - 둘 다 우리 면접 발화와 도메인이 다를 수 있고,"
        "\n   jungjongho 의 6클래스->자신감 매핑(TENSION_WEIGHTS)은 순전한 휴리스틱이라"
        " 이 스크립트 상단 가중치를 우리 데이터로 직접 검증/조정해야 합니다.\n"
        "   teacher 가 틀리면 student 는 그 틀린 값을 충실히 흉내내게 되고"
        "(garbage in, garbage out), 이 오류는 나중에 발견하기가 매우 어렵습니다."
        " distillation 의 근본 한계는 student 가 teacher 를 넘어설 수 없다는 점입니다."
    )


if __name__ == "__main__":
    main()
