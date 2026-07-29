"""
[표정 학습 1단계] 프레임 JSON + 라벨 시트 -> 학습용 npz

실행:
  python -m training.face.build_dataset \
      --frames data/processed/frames \
      --labels training/face/labels.csv \
      --out data/processed/face_dataset.npz

[집계는 core/face/aggregator.py 를 그대로 호출한다]
추론 경로(api/routers/analysis.py)와 완전히 동일한 함수를 쓰기 때문에, 학습 때의
집계 방식과 서비스할 때의 집계 방식이 어긋날 수 없다.

[labels.csv 형식]
  clip_id, file_name, person_id, labeler_a, labeler_b, label_final, note
  - labeler_a/b : 라벨러 2명이 독립적으로 매긴 점수. 한 명만 매기면 그 사람의 기준
                  편향이 그대로 모델에 학습된다.
  - label_final : 평균 또는 논의 후 합의값. 학습에 실제로 쓰는 컬럼.
  - person_id   : 촬영한 사람. train/val 을 사람 단위로 나누는 데 쓴다(data leakage 방지).
  ※ 두 라벨러 값이 자주 크게 벌어지면(0.2 vs 0.8 등) 데이터를 더 모을 게 아니라
    '라벨 기준 정의'로 돌아가야 한다는 신호다.
"""
from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path

import numpy as np

from core.face.aggregator import FEATURE_DIM, aggregate_from_frames


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--frames", required=True, help="extract_frames.py 출력 폴더")
    parser.add_argument("--labels", required=True, help="labels.csv")
    parser.add_argument("--out", required=True, help="출력 npz")
    args = parser.parse_args()

    # utf-8-sig : 엑셀이 CSV 앞에 붙이는 BOM 을 제거한다.
    with open(args.labels, encoding="utf-8-sig") as f:
        rows = list(csv.DictReader(f))

    features, labels, clip_ids, persons = [], [], [], []
    for row in rows:
        if not row.get("label_final"):
            print(f"[skip] 라벨 없음: {row.get('clip_id')}")
            continue

        stem = Path(row["file_name"]).stem
        json_path = Path(args.frames) / f"{stem}.json"
        if not json_path.exists():
            print(f"[warn] 프레임 JSON 없음: {json_path}")
            continue

        data = json.loads(json_path.read_text(encoding="utf-8"))
        fr = data["frames"]

        blendshapes = np.array([f["blendshapes"] for f in fr], dtype=np.float32)
        ear = np.array([f["ear"] for f in fr], dtype=np.float32)
        mar = np.array([f["mar"] for f in fr], dtype=np.float32)
        dev = np.array([f["deviation"] for f in fr], dtype=np.float32)

        try:
            agg = aggregate_from_frames(
                blendshapes, ear, mar, dev, duration_sec=data["duration_sec"])
        except (ValueError, RuntimeError) as e:
            print(f"[fail] {row['clip_id']}: {e}")
            continue

        features.append(agg.vector)
        labels.append(float(row["label_final"]))
        clip_ids.append(row["clip_id"])
        persons.append(row.get("person_id", "unknown"))
        print(f"[ok] {row['clip_id']} frames={agg.analyzed_frames} "
              f"blink/min={agg.blink_per_minute:.1f}")

    if not features:
        raise SystemExit("사용 가능한 데이터가 없습니다.")

    X = np.stack(features)
    y = np.array(labels, dtype=np.float32)

    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    # clip_ids 를 함께 저장해두면 나중에 "어떤 클립에서 크게 틀렸는지" 오류 분석이 가능하다.
    np.savez(args.out, X=X, y=y,
             clip_ids=np.array(clip_ids), persons=np.array(persons))
    print(f"\n저장: {args.out}  X={X.shape}  y={y.shape}")

    if len(y) < 100:
        print(
            f"\n⚠️ 클립이 {len(y)}개뿐입니다. 입력 차원({FEATURE_DIM})보다 샘플 수가 적거나"
            " 비슷하면 모델은 학습이 아니라 암기를 하게 되어 검증 성능을 신뢰할 수 없습니다."
            "\n   당장은 train_mlp.py 를 --hidden 32,16 으로 돌리고, 최소 수백 개 확보를"
            " 목표로 촬영을 이어가세요."
        )
    if len(set(persons)) < 3:
        print(
            f"⚠️ 촬영 인원이 {len(set(persons))}명뿐입니다. 사람 수가 적으면 모델이 긴장도가"
            " 아니라 개인의 얼굴 특징을 학습할 위험이 큽니다."
        )


if __name__ == "__main__":
    main()
