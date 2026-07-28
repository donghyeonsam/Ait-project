"""
[음성 학습 2단계] 경량 피처 + pseudo-label -> npz

teacher 에 따라 make_pseudo_labels.py 가 만드는 CSV 의 컬럼이 다르므로(--teacher 참고),
여기서도 같은 플래그로 어떤 컬럼을 y 로 읽을지 정해야 한다.

실행 (윈도우 분할을 했다면 --audio 에 chunks 폴더를 지정):
  # jungjongho teacher (기본, 확정된 축: confidence/tension)
  python -m training.voice.build_dataset \
      --teacher jungjongho \
      --audio data/processed/audio_chunks \
      --labels data/processed/voice_pseudo_labels_jungjongho.csv \
      --out data/processed/voice_dataset.npz

  # audeering teacher (구버전 / 보조 앙상블용, arousal-valence-dominance 3축)
  python -m training.voice.build_dataset \
      --teacher audeering \
      --audio data/processed/audio_chunks \
      --labels data/processed/voice_pseudo_labels_audeering.csv \
      --out data/processed/voice_dataset_audeering.npz
"""
from __future__ import annotations

import argparse
import csv
from pathlib import Path

import numpy as np

# 추론(worker/tasks.py)에서 쓰는 것과 완전히 동일한 함수를 재사용한다.
from core.voice.feature_extractor import extract_voice_features

# teacher 별로 CSV 의 어느 컬럼을 y 로 쓸지, 그리고 core/voice/predictor.py 의
# 언패킹 순서와 맞추기 위해 컬럼 순서를 여기서 고정한다.
# ⚠️ 순서를 바꾸면 core/voice/predictor.py 의 `confidence, tension = ...` 언패킹과
#    어긋난다 - 에러 없이 값만 뒤바뀐다.
TEACHER_COLUMNS = {
    "jungjongho": ["confidence", "tension"],
    "audeering": ["arousal", "valence", "dominance"],
}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--teacher", choices=list(TEACHER_COLUMNS), default="jungjongho",
                        help="make_pseudo_labels.py 에서 어떤 teacher 로 만든 CSV 인지")
    parser.add_argument("--audio", required=True)
    parser.add_argument("--labels", required=True)
    parser.add_argument("--out", required=True)
    args = parser.parse_args()

    columns = TEACHER_COLUMNS[args.teacher]

    with open(args.labels, encoding="utf-8-sig") as f:
        rows = list(csv.DictReader(f))

    features, targets, names, groups = [], [], [], []
    for row in rows:
        path = Path(args.audio) / row["file_name"]
        if not path.exists():
            print(f"[warn] 없음: {path}")
            continue
        try:
            feat, _ = extract_voice_features(str(path))
        except Exception as e:
            print(f"[fail] {row['file_name']}: {e}")
            continue

        try:
            targets.append([float(row[c]) for c in columns])
        except KeyError as e:
            raise SystemExit(
                f"CSV 에 {e} 컬럼이 없습니다. --teacher {args.teacher} 는 "
                f"{columns} 컬럼을 기대합니다 - make_pseudo_labels.py 를 같은 "
                "--teacher 값으로 돌렸는지 확인하세요."
            )

        features.append(feat)
        names.append(row["file_name"])
        groups.append(row.get("source_clip", row["file_name"]))
        print(f"[ok] {row['file_name']}")

    if not features:
        raise SystemExit("사용 가능한 데이터가 없습니다.")

    X = np.stack(features)
    y = np.array(targets, dtype=np.float32)

    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    np.savez(args.out, X=X, y=y,
             names=np.array(names), groups=np.array(groups),
             columns=np.array(columns))
    print(f"\n저장: {args.out}  X={X.shape}  y={y.shape}  columns={columns}")
    print(
        "\n참고: 같은 원본 클립에서 잘린 윈도우들은 서로 매우 비슷하므로, train/val 에"
        " 섞이면\n      검증 성능이 과대평가됩니다. train_mlp.py 를 --group-split 으로"
        " 실행하세요."
    )


if __name__ == "__main__":
    main()
