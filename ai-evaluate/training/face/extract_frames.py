"""
[학습 전용] 녹화 영상 -> 프레임별 표정 벡터 (JSON)

추론 시에는 브라우저의 JS MediaPipe 가 이 일을 한다. 학습 데이터를 만들 때는
사람이 영상을 보고 라벨을 매겨야 하므로 영상이 필요하고, 그 영상에서 프레임 벡터를
뽑는 것이 이 스크립트의 역할이다.

이 파일은 도커 이미지에 포함되지 않는다(.dockerignore). mediapipe/opencv 는
requirements-train.txt 에만 있다.

사전 준비 - MediaPipe 모델 파일 다운로드 (1회):
  mkdir -p models
  wget -O models/face_landmarker.task \
    https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task

실행:
  python -m training.face.extract_frames \
      --clips data/raw/clips --out data/processed/frames \
      --model models/face_landmarker.task
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import cv2
import mediapipe as mp
import numpy as np
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision as mp_vision

from core.face.landmark_metrics import frame_metrics

# 프론트와 동일하게 맞춰야 하는 값. 초당 몇 프레임을 쓸지.
# 30fps 영상을 전부 처리하면 연산량이 6배가 되는데, 표정 추세를 보는 데는 5fps 로 충분하다.
SAMPLE_FPS = 5.0


def build_landmarker(model_path: str):
    options = mp_vision.FaceLandmarkerOptions(
        base_options=mp_python.BaseOptions(model_asset_path=model_path),
        # blendshape 출력이 우리 피처의 주재료(52차원)다.
        output_face_blendshapes=True,
        output_facial_transformation_matrixes=False,
        num_faces=1,  # 면접 영상은 1인 촬영이므로 1로 고정(연산량 절감)
        running_mode=mp_vision.RunningMode.IMAGE,
    )
    return mp_vision.FaceLandmarker.create_from_options(options)


def extract(video_path: str, landmarker) -> dict:
    """영상 1개 -> {"fps","duration_sec","frames":[{blendshapes,ear,mar,deviation}...]}"""
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError(f"영상을 열 수 없습니다: {video_path}")

    src_fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    step = max(1, int(round(src_fps / SAMPLE_FPS)))

    frames = []
    frame_idx = 0
    total_read = 0
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        total_read += 1
        if frame_idx % step != 0:
            frame_idx += 1
            continue
        frame_idx += 1

        # ⚠️ OpenCV 는 BGR 로 읽고 MediaPipe 는 RGB 를 기대한다.
        #    이 변환을 빠뜨리면 에러 없이 얼굴 검출률만 조용히 떨어진다 - 최다 실수 지점.
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)

        result = landmarker.detect(mp_image)
        if not result.face_landmarks:
            continue  # 얼굴 미검출 프레임은 버린다

        lm = result.face_landmarks[0]
        pts = np.array([[p.x, p.y] for p in lm], dtype=np.float32)
        ear, mar, deviation = frame_metrics(pts)

        # blendshape 은 MediaPipe 가 반환하는 순서(index 순)를 그대로 유지한다.
        # 이름순 정렬 등으로 순서가 바뀌면 JS 쪽과 축이 어긋난다.
        blendshapes = [float(c.score) for c in result.face_blendshapes[0]]

        frames.append({
            "blendshapes": blendshapes,
            "ear": ear,
            "mar": mar,
            "deviation": deviation,
        })

    cap.release()
    duration = total_read / src_fps if src_fps > 0 else 0.0
    return {"fps": SAMPLE_FPS, "duration_sec": duration, "frames": frames}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--clips", required=True, help="영상 폴더")
    parser.add_argument("--out", required=True, help="JSON 출력 폴더")
    parser.add_argument("--model", default="models/face_landmarker.task")
    args = parser.parse_args()

    if not Path(args.model).exists():
        raise SystemExit(
            f"MediaPipe 모델 파일이 없습니다: {args.model}\n"
            "이 파일 상단 docstring 의 wget 명령으로 먼저 받아주세요."
        )

    landmarker = build_landmarker(args.model)
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    videos = sorted(
        p for p in Path(args.clips).iterdir()
        if p.suffix.lower() in {".mp4", ".mov", ".webm", ".avi"}
    )
    if not videos:
        raise SystemExit(f"영상이 없습니다: {args.clips}")

    for video in videos:
        try:
            data = extract(str(video), landmarker)
        except ValueError as e:
            print(f"[fail] {video.name}: {e}")
            continue

        n = len(data["frames"])
        if n < 5:
            # 조용히 넘기지 않는다. 실패가 잦으면 촬영 방식(조명/각도/프레이밍) 자체를
            # 고쳐야 한다는 신호이기 때문이다.
            print(f"[fail] {video.name}: 얼굴 검출 프레임 부족({n}개)")
            continue

        dest = out_dir / f"{video.stem}.json"
        dest.write_text(json.dumps(data), encoding="utf-8")
        print(f"[ok] {video.name} -> {dest.name} ({n} frames, {data['duration_sec']:.1f}s)")


if __name__ == "__main__":
    main()
