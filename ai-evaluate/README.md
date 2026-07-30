# ai-evaluate

AI 모의 면접 - 답변 영상/오디오의 표정·음성 분석 서버.

기존 `ai/`(질문생성·RAG) 서버와 완전히 분리된 별도 서비스다. `ai/` 는 손대지 않는다.

**v0.3.0** — 코드 리뷰 지적사항 8건 반영. 자세한 내용은
[docs/CODE_REVIEW.md](docs/CODE_REVIEW.md) 참고.

---

## 1. 아키텍처

```
[표정]  브라우저: 카메라 → MediaPipe(JS) → 프레임별 숫자 묶음
        → POST /analyses/face  → 점수 바로 받음 (수 ms)
        ※ 영상이 서버로 올라오지 않는다.

[음성]  브라우저: 녹음 → 소리 파일
        → BE(Spring, @Async) 가 바이트로 읽어서 전달
        → POST /analyses/voice  → 점수 바로 받음 (2~3초)
        → BE 가 Redis 에 저장
        ※ 목소리 떨림 계산은 브라우저에 대체품이 없어 서버에서 해야 한다.
```

### 왜 이렇게 나눴나

| | 표정 | 음성 |
|---|---|---|
| 무거운 계산 위치 | 브라우저 | 서버 |
| 서버 CPU 부하 | 거의 0 | 2~3초/건 |
| 서버로 올라가는 것 | 숫자 ~100KB | 소리 ~700KB |

얼굴 인식이 전체 계산의 95%를 차지하는데, 이걸 브라우저로 넘기면 서버는 평균 내고
작은 모델에 넣는 일만 남아 사실상 공짜가 된다. 같은 EC2 에서 화상면접(LiveKit)이
CPU 를 쓰고 있다면 이 차이가 결정적이다.

### 대기열(Celery)을 기본으로 쓰지 않는 이유

BE 가 이미 `@Async` 로 별도 스레드에서 호출한다. 그 스레드는 어차피 기다리고 있으므로,
서버가 번호표를 또 발급하고 BE 가 "다 됐어요?" 하고 계속 물어보는 건 낭비다.
그냥 그 자리에서 처리해 결과를 돌려주는 게 단순하다.

대신 **동시 실행 개수 제한**은 반드시 있어야 한다(`VOICE_CONCURRENCY=2`).
없으면 `@Async` 스레드 수만큼 분석이 한꺼번에 돌아 CPU 가 꽉 차고 LiveKit 이 끊긴다.

대기열이 꼭 필요하면 켤 수 있다:

```bash
docker compose --profile queue up -d   # worker + redis 추가 실행
```

---

## 2. 디렉토리

```
ai-evaluate/
├── config.py                 설정 (.env 로드, ai/config.py 와 같은 패턴)
├── api/                      FastAPI - 표정 동기 처리 + 음성 접수/조회
│   ├── main.py
│   ├── routers/{health,analysis}.py
│   └── schemas/analysis.py
├── core/                     학습·추론이 공유하는 도메인 로직 (도커 이미지에 포함)
│   ├── mlp.py                        표정·음성 공용 MLP 클래스
│   ├── face/
│   │   ├── landmark_metrics.py       EAR/MAR/이탈 계산 (JS 가 이걸 그대로 옮김)
│   │   ├── aggregator.py             프레임 벡터 → 116차원 집계벡터
│   │   ├── predictor.py
│   │   └── model/                    face_mlp.pt, face_scaler.json
│   └── voice/
│       ├── feature_extractor.py      오디오 → 38차원 (Praat 중심, pyin 제거)
│       ├── predictor.py
│       └── model/                    voice_mlp.pt, voice_scaler.json
├── worker/                   Celery (음성 전용)
│   ├── celery_app.py
│   ├── storage.py            로컬볼륨/S3 추상화 (배포 위치 미정 대응)
│   └── tasks.py
├── training/                 학습 전용 (도커 이미지에서 제외됨)
│   ├── trainer.py                    공용 학습 루프
│   ├── face/{extract_frames,build_dataset,train_mlp,verify_parity}.py, labels.csv
│   └── voice/{make_pseudo_labels,build_dataset,train_mlp}.py
├── frontend-sample/face-capture.js   프론트 참고 구현
├── docs/
│   ├── SPRING_INTEGRATION.md         BE 연동 방법 + Java 예시
│   ├── GLOSSARY.md                   용어 사전 (쉬운 말 설명)
│   ├── CODE_REVIEW.md                코드 흐름 설명 + 리뷰 지적사항
│   └── ARCHITECTURE.md               왜 이렇게 만들었나
└── data/                     원본/중간 산출물 (.gitignore 권장)
```

**핵심 원칙**: 집계·피처 계산 로직은 `core/` 한 곳에만 있고 학습과 추론이 그것을
공유한다. 학습 때의 피처와 서비스할 때의 피처가 어긋나면(training-serving skew)
검증 성능은 좋은데 실서비스만 틀리는, 추적이 극히 어려운 버그가 된다.

---

## 3. 서버 실행

```bash
cp .env.example .env
docker compose up -d --build        # api 컨테이너 하나만 뜬다

curl localhost:8100/health          # 서버 살아있는지
curl localhost:8100/health/model    # 학습된 모델 파일이 있는지
```

용어가 낯설면 **[docs/GLOSSARY.md](docs/GLOSSARY.md)** 에 쉬운 말로 정리해뒀다.

포트는 8100이다(기존 `ai/` 가 8000 사용).

---

## 4. 학습 파이프라인

학습은 서버가 아니라 **개발자 로컬**에서 돌린다. 산출물 `.pt`/`.json` 만
`core/*/model/` 에 커밋해서 배포한다.

```bash
pip install -r requirements.txt -r requirements-train.txt
```

### 4-1. 표정

```bash
# 0) MediaPipe 모델 파일 (1회, 프론트와 반드시 같은 파일을 써야 함)
mkdir -p models
wget -O models/face_landmarker.task \
  https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task

# 1) 팀원 답변 영상 촬영 → data/raw/clips/ 에 배치

# 2) 라벨: 사람이 직접 채우거나(training/face/labels.csv), teacher(EMO-AffectNet)로
#    pseudo-label 을 자동 생성한다. 후자를 먼저 돌려 초안을 만들고 사람이 검수/수정
#    하는 방식을 권장한다 (완전 자동보다 신뢰도가 높고, 라벨링 시간도 준다).
python -m training.face.make_pseudo_labels \
    --video data/raw/clips \
    --out training/face/labels_pseudo.csv \
    --lstm-corpus Aff-Wild2
#    (clip_id, file_name, person_id, labeler_a, labeler_b, label_final, note)
#    person_id 는 "unknown" 으로 채워지므로 group-split 이 필요하면 직접 채울 것.

# 3) 영상 → 프레임 벡터 JSON
python -m training.face.extract_frames \
    --clips data/raw/clips --out data/processed/frames \
    --model models/face_landmarker.task

# 4) 프레임 JSON + 라벨 → 학습 데이터셋 (사람 라벨 대신 pseudo-label CSV 를 써도 됨)
python -m training.face.build_dataset \
    --frames data/processed/frames \
    --labels training/face/labels.csv \
    --out data/processed/face_dataset.npz

# 5) 학습 (데이터가 적으면 --hidden 32,16)
python -m training.face.train_mlp \
    --data data/processed/face_dataset.npz --group-split
```

### 4-2. 음성

```bash
# 1) 영상에서 오디오 분리
mkdir -p data/raw/audio
for f in data/raw/clips/*.mp4; do
  ffmpeg -i "$f" -ar 16000 -ac 1 "data/raw/audio/$(basename "${f%.*}").wav"
done

# 2) teacher(jungjongho, 한국어 6클래스)로 pseudo-label 생성.
#    --window 15 로 데이터를 6배 늘린다. audeering 을 보조로 쓰려면 --teacher audeering.
python -m training.voice.make_pseudo_labels \
    --teacher jungjongho \
    --audio data/raw/audio \
    --out data/processed/voice_pseudo_labels_jungjongho.csv \
    --window 15

# 3) 경량 피처 + 라벨 결합 (윈도우 분할했으므로 chunks 폴더를 지정)
#    --teacher 는 2)에서 쓴 것과 반드시 같아야 한다(컬럼 스키마가 다름).
python -m training.voice.build_dataset \
    --teacher jungjongho \
    --audio data/processed/audio_chunks \
    --labels data/processed/voice_pseudo_labels_jungjongho.csv \
    --out data/processed/voice_dataset.npz

# 4) distillation 학습 (--teacher 도 동일하게)
python -m training.voice.train_mlp \
    --teacher jungjongho \
    --data data/processed/voice_dataset.npz --group-split
```

### 4-3. 정합성 검증 (초기에 1회 필수)

파이썬 MediaPipe와 브라우저 JS MediaPipe의 출력이 같은지 확인한다.

```bash
python -m training.face.verify_parity --py out_py/sample.json --js sample_js.json
```

JS 쪽 JSON은 `FaceCapture.downloadDebugJson()` 으로 받는다.

---

## 4-4. 테스트

```bash
pip install fastapi python-multipart httpx numpy
python -m tests.test_aggregator   # 집계 로직 (torch 불필요)
python -m tests.test_api          # API 응답/검증
```

---

## 5. API

| 메서드 | 경로 | 설명 |
|---|---|---|
| POST | `/analyses/face` | 프레임 숫자 묶음 → 표정 점수 (바로 응답) |
| POST | `/analyses/voice` | 소리 파일/바이트 → 음성 점수 (2~3초 후 응답) |
| GET | `/health` | 서버 살아있는지 |
| GET | `/health/model` | 학습된 모델 파일이 있는지 |
| POST | `/analyses/voice/queue` | (선택) 대기열에 넣고 번호표 받기 |
| GET | `/analyses/voice/{task_id}` | (선택) 번호표로 결과 조회 |

BE(Spring) 연동 예시 코드는 **[docs/SPRING_INTEGRATION.md](docs/SPRING_INTEGRATION.md)** 참고.

⚠️ BE 쪽 read timeout 을 최소 30초로 잡을 것. 기본값이 짧으면 분석이 끝나기 전에 끊긴다.

---

## 6. 배포 위치가 바뀔 때

배포처가 아직 미정이라 이식성을 고려해뒀다.

| 상황 | 고칠 곳 |
|---|---|
| 다른 VM(GCP/온프렘)으로 이사 | 없음. compose 그대로 복사 |
| Redis를 관리형으로 | `.env` 의 CELERY_* 두 줄 |
| CPU→GPU 인스턴스 | Dockerfile 의 torch CPU 인덱스 한 줄 삭제 |
| ECS/k8s (컨테이너가 다른 노드에 분산) | `worker/storage.py` 에 S3Storage 추가 + `.env` 한 줄 |

`storage.py` 추상화가 있는 이유가 마지막 항목이다. api와 worker가 공유 볼륨으로
파일을 주고받는 방식은 두 컨테이너가 같은 머신에 있을 때만 동작한다.

---

## 7. 아직 정해지지 않은 것 (⚠️ 코드보다 먼저 결정해야 함)

- [x] ~~표정 MLP가 무엇을 예측할지~~ — **확정**: 표정/음성 둘 다 `confidence_score`
      (자신감) / `tension_score`(긴장도) 0~1 연속값, `tension_score = 1 - confidence_score`.
      teacher 도 확정: 음성=jungjongho(한국어 6클래스 분류 → 재조합), 표정=EMO-AffectNet
      (ResNet50+LSTM, 7클래스 → 재조합). 근거는 `docs/ARCHITECTURE.md` 9절 참고.
- [ ] 라벨링 인원/도구 (초기엔 구글시트, 물량 늘면 Label Studio) — teacher pseudo-label
      을 초안으로 쓰고 사람이 검수하는 방식을 권장(4-1/4-2 참고)
- [ ] MLP 은닉층 크기 — `(64,32)` 는 임시값. 클립 100개 미만이면 `(32,16)` 권장
- [ ] `ai-evaluate` 를 별도 레포로 뺄지 같은 레포에 둘지
- [ ] 모델 파일이 커지면 Git LFS 검토 (`face_landmarker.task` 가 수 MB)
- [ ] teacher 라벨(특히 jungjongho 의 TENSION_WEIGHTS, EMO-AffectNet 의
      FACE_TENSION_WEIGHTS)의 sanity check — 실제 팀 녹화본으로 검증 전까지는
      두 가중치 모두 잠정값이다.

## 8. 알려진 한계

- **데이터 부족 위험**: 표정 피처 116차원인데 클립이 50개면 모델은 학습이 아니라
  암기를 한다. 검증 점수가 좋아도 실서비스에서 무너진다.
- **distillation 의 상한**: student(경량 MLP)는 teacher(wav2vec2)보다 좋아질 수 없다.
  teacher 가 한국어 면접 발화에서 틀리면 student 는 그 틀린 값을 충실히 학습한다.
  `make_pseudo_labels.py` 실행 후 sanity check 를 반드시 할 것.
- **jitter/shimmer 의 근거 약함**: 이 지표들은 성대 질환 진단 맥락에서 검증된 것이지
  '면접 긴장'과의 상관은 우리 데이터로 확인해야 한다. `train_mlp.py` 의 축별
  상관계수 출력이 그 검증 지점이다.
- **`deviation` 은 시선추적이 아니다**: 코끝의 화면중앙 이탈 거리로, 사용자가 카메라
  앞에 치우쳐 앉기만 해도 커진다. 정확한 시선이 필요하면 홍채 랜드마크(468~477) 확장 필요.
