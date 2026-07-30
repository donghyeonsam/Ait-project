"""
API 동작 확인 테스트.

실행 (ai-evaluate 루트에서):
    pip install fastapi python-multipart httpx numpy
    python -m tests.test_api

서버를 실제로 띄우지 않고 요청/응답을 흉내 내서 확인한다.
torch/librosa 가 설치돼 있지 않아도 대부분의 항목은 검사된다.
"""
import io
import sys

import numpy as np
from fastapi.testclient import TestClient

from api.main import app

# raise_server_exceptions=False : 서버 내부 오류를 예외로 터뜨리지 않고
# 실제 운영처럼 500 응답으로 돌려받는다.
client = TestClient(app, raise_server_exceptions=False)

try:
    import torch  # noqa: F401
    HAS_TORCH = True
except ImportError:
    HAS_TORCH = False


def main() -> int:
    r = client.get("/health")
    assert r.status_code == 200 and r.json()["status"] == "ok"
    print(f"[1] GET /health -> {r.status_code} {r.json()}")

    r = client.get("/health/model")
    assert r.status_code == 200
    print(f"[2] GET /health/model -> {r.json()}  (학습 전이면 둘 다 false 가 정상)")

    rng = np.random.default_rng(0)
    frames = [
        {"blendshapes": rng.random(52).round(4).tolist(),
         "ear": 0.3, "mar": 0.2, "deviation": 0.05}
        for _ in range(30)
    ]
    body = {"fps": 5.0, "duration_sec": 6.0, "frames": frames}

    r = client.post("/analyses/face", json=body)
    if HAS_TORCH:
        # 아직 학습을 안 했으면 503(서버 준비 안 됨)이 정상이다.
        assert r.status_code in (200, 503), (r.status_code, r.text[:200])
        print(f"[3] POST /analyses/face -> {r.status_code} "
              f"{'정상 분석' if r.status_code == 200 else '모델 미학습 안내'} OK")
    else:
        print(f"[3] POST /analyses/face -> {r.status_code} (torch 미설치 환경, 건너뜀)")

    # blendshape 이 52개가 아니면 거부되어야 한다.
    bad = [{"blendshapes": [0.1] * 51, "ear": 0.3, "mar": 0.2,
            "deviation": 0.05}] * 10
    r = client.post("/analyses/face",
                    json={"fps": 5.0, "duration_sec": 6.0, "frames": bad})
    assert r.status_code == 422, r.status_code
    print(f"[4] POST /analyses/face (blendshape 51개) -> {r.status_code} 거부 OK")

    # 프레임이 5개 미만이면 거부되어야 한다.
    r = client.post("/analyses/face",
                    json={"fps": 5.0, "duration_sec": 6.0, "frames": frames[:3]})
    assert r.status_code == 422, r.status_code
    print(f"[5] POST /analyses/face (프레임 3개) -> {r.status_code} 거부 OK")

    # 소리 파일이 아닌 확장자는 거부.
    r = client.post("/analyses/voice",
                    files={"file": ("a.txt", io.BytesIO(b"x"), "text/plain")})
    assert r.status_code == 400, r.status_code
    print(f"[6] POST /analyses/voice (.txt) -> {r.status_code} 거부 OK")

    # 빈 파일 거부.
    r = client.post("/analyses/voice",
                    files={"file": ("a.webm", io.BytesIO(b""), "audio/webm")})
    assert r.status_code == 400 and "빈 파일" in r.json()["detail"]
    print(f"[7] POST /analyses/voice (빈 파일) -> {r.status_code} 거부 OK")

    # 확장자는 맞지만 내용이 깨진 경우 -> 500 이 아니라 400 이어야 한다.
    r = client.post("/analyses/voice",
                    files={"file": ("a.webm", io.BytesIO(b"not audio"),
                                    "audio/webm")})
    assert r.status_code == 400, (r.status_code, r.text[:200])
    print(f"[8] POST /analyses/voice (깨진 파일) -> {r.status_code} "
          "(500 아님) OK")

    # 파일이 너무 크면 413.
    big = b"0" * (31 * 1024 * 1024)
    r = client.post("/analyses/voice",
                    files={"file": ("a.webm", io.BytesIO(big), "audio/webm")})
    assert r.status_code == 413, (r.status_code, r.text[:200])
    print(f"[9] POST /analyses/voice (31MB) -> {r.status_code} 거부 OK")

    # duration_sec 이 프레임 수에 비해 말이 안 되게 짧으면 400.
    # (450프레임/5fps = 최소 90초여야 하는데 1초라고 보낸 경우)
    # (torch 가 없는 환경에서는 모델 import 단계에서 먼저 막히므로 건너뛴다.
    #  이 검증 로직 자체는 tests/test_aggregator.py 에서 별도로 확인한다)
    many = [{"blendshapes": rng.random(52).round(4).tolist(),
             "ear": 0.3, "mar": 0.2, "deviation": 0.05} for _ in range(450)]
    r = client.post("/analyses/face",
                    json={"fps": 5.0, "duration_sec": 1.0, "frames": many})
    if HAS_TORCH:
        assert r.status_code == 400, (r.status_code, r.text[:200])
        assert "duration_sec" in r.json()["detail"]
        print(f"[10] POST /analyses/face (450프레임인데 1초) -> "
              f"{r.status_code} 거부 OK")
    else:
        print(f"[10] POST /analyses/face (duration 불일치) -> {r.status_code} "
              "(torch 미설치 환경, test_aggregator 에서 확인함)")

    # request_id 를 같이 보내도 정상 동작해야 한다(형식 검사만).
    r = client.post("/analyses/voice",
                    data={"request_id": "42-3"},
                    files={"file": ("a.txt", io.BytesIO(b"x"), "text/plain")})
    assert r.status_code == 400  # 확장자 때문에 거부되는 게 맞다
    print(f"[11] request_id 동봉 요청 -> {r.status_code} (확장자 검사 정상 동작)")

    print("\nAPI 테스트 전체 통과")
    return 0


if __name__ == "__main__":
    sys.exit(main())
