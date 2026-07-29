"""
[음성 학습 1.5단계] pseudo-label CSV -> train/holdout 분리

teacher(make_pseudo_labels.py)가 만든 CSV를 build_dataset.py 에 그대로 다 넣지 않고,
일부(기본 15%)를 학습 과정에 아예 안 보이게 떼어놓는다. 이렇게 떼어놓은 holdout은
train_mlp.py 의 --group-split(train/val)과 성격이 다르다 - val 은 early stopping에
관여해 학습 과정의 일부지만, 여기서 만드는 holdout은 학습이 끝날 때까지 어디에도
쓰이지 않는 진짜 최종 시험지다. 나중에 (a) 모델 예측값과 teacher 라벨을 비교하거나
(b) 팀원이 직접 들어보는 sanity check용으로 쓴다.

[왜 source_clip 단위로 나누나]
같은 원본 답변에서 15초씩 잘린 윈도우들은 서로 내용이 거의 같다. 파일(윈도우) 단위로
무작위 분리하면 "학습에 쓴 파일의 옆 조각"이 테스트셋에 섞여 들어가 성능이 과대평가된다.
그래서 원본 답변(source_clip) 단위로 먼저 나누고, 그 답변에 속한 윈도우는 전부 같은
쪽(train 아니면 holdout)에 넣는다.

[계층화(stratification)를 안 하는 이유]
직군(Management/ICT/...)별로 비율을 맞출 이유가 약하다 - teacher/student 가 보는 건
음성 신호(피치/떨림/MFCC 등)지 답변 내용(직군)이 아니라서 직군이 신호에 직접
영향을 주지 않는다. 성별은 F0 같은 피처에 실제로 영향을 주지만, 이 정도 규모
(1301개 원본 답변)면 완전 무작위로 나눠도 성별 비율이 자연스럽게 비슷하게 섞인다.
그래서 완전 무작위 분리로 충분하다는 결론을 내렸다.

실행:
  python -m training.voice.split_holdout \
      --labels data/processed/voice_pseudo_labels_jungjongho.csv \
      --holdout-ratio 0.15 \
      --seed 42 \
      --train-out data/processed/voice_pseudo_labels_train.csv \
      --holdout-out data/processed/voice_pseudo_labels_holdout.csv
"""
from __future__ import annotations

import argparse
import csv
import random
from pathlib import Path


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--labels", required=True,
                         help="make_pseudo_labels.py 가 만든 전체 CSV")
    parser.add_argument("--holdout-ratio", type=float, default=0.15,
                         help="원본 답변(source_clip) 기준으로 holdout 에 뺄 비율")
    parser.add_argument("--seed", type=int, default=42,
                         help="재현 가능하게 고정. 팀원끼리 같은 결과를 보려면 값을 공유할 것")
    parser.add_argument("--train-out", required=True)
    parser.add_argument("--holdout-out", required=True)
    args = parser.parse_args()

    with open(args.labels, encoding="utf-8-sig") as f:
        rows = list(csv.DictReader(f))
        fieldnames = rows[0].keys() if rows else []

    if not rows:
        raise SystemExit(f"CSV 에 데이터가 없습니다: {args.labels}")

    # source_clip 이 없으면(윈도우 분할을 안 한 경우) file_name 을 그대로 그룹키로 쓴다.
    # make_pseudo_labels.py 가 항상 source_clip 을 채워주므로 보통은 이 분기를 안 탄다.
    def group_key(row: dict) -> str:
        return row.get("source_clip") or row["file_name"]

    groups = sorted({group_key(r) for r in rows})  # sorted: --seed 가 같으면 항상 같은 순서

    rng = random.Random(args.seed)
    rng.shuffle(groups)

    n_holdout = round(len(groups) * args.holdout_ratio)
    holdout_groups = set(groups[:n_holdout])
    train_groups = set(groups[n_holdout:])

    train_rows = [r for r in rows if group_key(r) not in holdout_groups]
    holdout_rows = [r for r in rows if group_key(r) in holdout_groups]

    for out_path, out_rows in [(args.train_out, train_rows), (args.holdout_out, holdout_rows)]:
        Path(out_path).parent.mkdir(parents=True, exist_ok=True)
        with open(out_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=list(fieldnames))
            writer.writeheader()
            writer.writerows(out_rows)

    print(f"원본 답변(source_clip) 총 {len(groups)}개 -> "
          f"train {len(train_groups)}개 / holdout {len(holdout_groups)}개")
    print(f"윈도우(행) 기준 -> train {len(train_rows)}개 / holdout {len(holdout_rows)}개")
    print(f"\n저장: {args.train_out} (build_dataset.py 에 이걸 넣으세요)")
    print(f"저장: {args.holdout_out} (학습에 쓰지 말고 sanity check/최종 검증용으로 남겨두세요)")
    print(
        "\n⚠️ holdout 은 build_dataset.py/train_mlp.py 어디에도 넣지 마세요. "
        "학습 과정에 한 번이라도 관여하면 '한 번도 안 본 데이터로 검증'이라는 "
        "의미가 사라집니다."
    )


if __name__ == "__main__":
    main()
