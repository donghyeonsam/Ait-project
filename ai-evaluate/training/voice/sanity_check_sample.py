"""
[음성 학습 5단계] holdout 표본 추출 -> 사람이 직접 듣고 검증

split_holdout.py 가 떼어놓은 holdout(학습에 한 번도 안 쓰인 15%)에서 tension_score
기준 상위/중위/하위 표본을 뽑는다. 1301개 답변을 전부 들을 필요는 없다 - teacher를
쓰는 이유 자체가 전수 라벨링을 피하기 위해서다. 극단값(가장 긴장됨/가장 편안함)과
중간값 위주로 소규모 표본만 확인하면, teacher 라벨과 student 모델이 최소한의
방향성은 맞는지 감을 잡을 수 있다.

[원본 답변(source_clip) 단위로 뽑는 이유]
같은 답변에서 잘린 윈도우 6개를 전부 표본에 넣으면 사실상 같은 걸 6번 듣는
셈이라 표본 다양성이 낮아진다. 그래서 원본 답변마다 대표 윈도우 하나만(그 답변
안에서 tension_score 가 가장 중앙값에 가까운 윈도우) 뽑는다.

[학습된 모델이 있으면 예측값도 같이 보여준다]
core/voice/model/ 에 학습된 voice_mlp.pt 가 있으면, holdout 오디오를 그 모델에도
직접 태워 teacher 라벨과 student 예측을 나란히 보여준다. 사람이 들을 때 "teacher가
틀렸나 student가 틀렸나"를 한 번에 구분할 수 있다. 모델이 아직 없으면 이 열은
비워두고 teacher 라벨만으로 진행한다.

실행:
  python -m training.voice.sanity_check_sample \
      --holdout data/processed/voice_pseudo_labels_holdout.csv \
      --audio data/processed/audio_chunks \
      --n-per-group 12 \
      --out-dir data/processed/sanity_check
"""
from __future__ import annotations

import argparse
import csv
import shutil
from pathlib import Path


def pick_representative_window(rows: list[dict]) -> dict:
    """같은 source_clip 에 속한 윈도우들 중 tension 이 중앙값에 가장 가까운 것 하나."""
    sorted_rows = sorted(rows, key=lambda r: float(r["tension"]))
    mid = sorted_rows[len(sorted_rows) // 2]
    return mid


def try_load_model():
    """학습된 모델이 있으면 (predict_fn, extract_fn) 반환, 없으면 (None, None)."""
    try:
        from core.voice.feature_extractor import extract_voice_features
        from core.voice.predictor import predict_voice
        # predictor._load() 가 파일 없으면 FileNotFoundError 를 던지므로 미리 확인.
        from config import settings
        if not Path(settings.voice_model_path).exists():
            return None, None
        return predict_voice, extract_voice_features
    except Exception as e:
        print(f"[warn] 모델 로드 스킵: {e}")
        return None, None


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--holdout", required=True,
                         help="split_holdout.py 가 만든 holdout CSV")
    parser.add_argument("--audio", required=True,
                         help="윈도우 조각(chunk) wav 가 있는 폴더 (data/processed/audio_chunks)")
    parser.add_argument("--n-per-group", type=int, default=12,
                         help="상위/중위/하위 각각 몇 개씩 뽑을지")
    parser.add_argument("--out-dir", required=True,
                         help="선택된 wav 복사본 + 요약 CSV 를 저장할 폴더")
    args = parser.parse_args()

    with open(args.holdout, encoding="utf-8-sig") as f:
        rows = list(csv.DictReader(f))
    if not rows:
        raise SystemExit(f"holdout CSV 에 데이터가 없습니다: {args.holdout}")

    # source_clip 별로 대표 윈도우 하나씩만 남긴다.
    by_clip: dict[str, list[dict]] = {}
    for r in rows:
        by_clip.setdefault(r["source_clip"], []).append(r)
    representatives = [pick_representative_window(rs) for rs in by_clip.values()]
    representatives.sort(key=lambda r: float(r["tension"]))

    n = args.n_per_group
    total = len(representatives)
    if total < n * 3:
        print(f"[warn] 원본 답변이 {total}개뿐이라 그룹당 {n}개씩 뽑기엔 부족할 수 있습니다.")

    bottom = representatives[:n]                                    # tension 낮음 = 편안함
    top = representatives[-n:]                                      # tension 높음 = 긴장
    mid_start = max(0, total // 2 - n // 2)
    middle = representatives[mid_start:mid_start + n]

    groups = [("low_tension", bottom), ("mid_tension", middle), ("high_tension", top)]

    predict_voice, extract_voice_features = try_load_model()
    has_model = predict_voice is not None
    print(f"학습된 모델 {'발견 - 예측값도 같이 기록합니다' if has_model else '없음 - teacher 라벨만 기록합니다'}")

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    summary_rows = []

    for group_name, items in groups:
        for rank, row in enumerate(items, start=1):
            src = Path(args.audio) / row["file_name"]
            if not src.exists():
                print(f"[warn] 없음: {src}")
                continue

            dst_name = f"{group_name}_{rank:02d}_{row['file_name']}"
            shutil.copy2(src, out_dir / dst_name)

            record = {
                "group": group_name,
                "copied_as": dst_name,
                "file_name": row["file_name"],
                "source_clip": row["source_clip"],
                "teacher_confidence": row["confidence"],
                "teacher_tension": row["tension"],
            }

            if has_model:
                try:
                    feat, _ = extract_voice_features(str(src))
                    pred = predict_voice(feat)
                    record["pred_confidence"] = round(pred["confidence_score"], 4)
                    record["pred_tension"] = round(pred["tension_score"], 4)
                    # 종형 곡선 점수(BE 응답 필드명은 score). voice_ideal_tension 이
                    # 적절한지도 이 표본으로 같이 판단한다.
                    record["pred_score"] = pred["score"]
                except Exception as e:
                    record["pred_confidence"] = record["pred_tension"] = f"오류: {e}"
                    record["pred_score"] = f"오류: {e}"

            summary_rows.append(record)
            print(f"[{group_name}] {row['file_name']}  "
                  f"teacher_tension={float(row['tension']):.3f}")

    summary_path = out_dir / "sanity_check_summary.csv"
    fieldnames = list(summary_rows[0].keys()) if summary_rows else []
    with open(summary_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(summary_rows)

    print(f"\n총 {len(summary_rows)}개 표본을 {out_dir} 에 복사했습니다.")
    print(f"요약: {summary_path}")
    print(
        "\n다음 할 일: 위 폴더의 wav 파일들을 직접 들어보면서,\n"
        "  - low_tension 으로 분류된 것들이 실제로 편안하게 들리는지\n"
        "  - high_tension 으로 분류된 것들이 실제로 긴장/불안하게 들리는지\n"
        "  - teacher_tension 과 pred_tension(모델 예측)이 크게 다른 케이스가 있는지\n"
        "확인하세요. 셋 다 어긋나면 teacher(TENSION_WEIGHTS) 를 의심하고,\n"
        "teacher 는 맞는데 모델 예측만 어긋나면 피처/학습 쪽을 의심하세요."
    )


if __name__ == "__main__":
    main()
