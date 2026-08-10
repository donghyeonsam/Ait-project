# ai-evaluate

면접 답변 영상/오디오에서 **표정·음성**을 분석해 0~10점 점수를 돌려주는 FastAPI 서버.

기존 `ai/`(질문 생성/RAG, :8000) 서버와 완전히 분리된 별도 서비스다(:8100). `librosa`/
`parselmouth`/`torch` 등 무거운 미디어 분석 의존성을 질문 생성 기능과 같은 배포 위험에
묶지 않기 위해 처음부터 별도 서버로 나눴다.

## 디렉토리 구조

```
ai-evaluate/
├── config.py                    # .env 기반 설정
├── api/
│   ├── main.py                    # FastAPI 엔트리포인트 (모델은 lifespan이 아니라 첫 요청 시 lazy 로딩)
│   ├── routers/
│   │   ├── health.py                # /health, /health/model, /health/worker
│   │   └── analysis.py               # /analyses/face, /analyses/voice(+queue)
│   └── schemas/
│       └── analysis.py               # FaceResult/VoiceResult 등 요청·응답 스키마
├── core/                          # 학습(training/)과 추론(api/, worker/)이 공유하는 도메인 로직
│   ├── mlp.py                       # 표정/음성 공용 MLP 클래스 + 체크포인트 로더
│   ├── face/
│   │   ├── landmark_metrics.py        # EAR/MAR/정면이탈 계산 (frontend-sample의 JS와 동일 로직 유지 기준)
│   │   ├── aggregator.py               # 프레임별 값 -> 167차원 집계벡터
│   │   ├── predictor.py                 # 집계벡터 -> MLP 추론 -> score
│   │   └── model/                        # face_mlp.pt, face_scaler.json (커밋된 학습 산출물)
│   └── voice/
│       ├── feature_extractor.py        # 오디오 -> 44차원 피처(librosa+Praat)
│       ├── predictor.py                 # 피처 -> MLP 추론 -> confidence/tension/score
│       └── model/                        # voice_mlp.pt, voice_scaler.json
├── worker/                        # Celery 큐 방식 음성 분석 (선택 기능, 기본 비활성)
│   ├── celery_app.py
│   ├── tasks.py                     # analyze_voice 태스크 (core/voice/*를 그대로 호출)
│   └── storage.py                    # local/S3 스토리지 추상화 (현재 local만 구현)
├── training/                      # 학습 파이프라인 (도커 이미지에는 포함되지 않음, .dockerignore)
│   ├── trainer.py                    # 표정/음성 공용 학습 루프 (80/20 분할, early stopping)
│   ├── face/                          # extract_frames -> make_pseudo_labels -> build_dataset -> train_mlp -> verify_parity
│   └── voice/                         # make_pseudo_labels -> build_dataset -> train_mlp (+ split_holdout, sanity_check_sample)
├── frontend-sample/
│   └── face-capture.js              # 브라우저 MediaPipe 랜드마크 추출 참고 구현
├── docs/                           # 개발일지, ARCHITECTURE.md
├── tests/
│   ├── test_aggregator.py            # 집계 로직 단위 테스트
│   └── test_api.py                    # API 요청/응답 스모크 테스트 (서버 미기동 상태로 검증)
├── requirements.txt                 # 서버(런타임) 의존성
├── requirements-train.txt            # 학습 전용 의존성 (이미지에 미포함)
└── Dockerfile / docker-compose.yml / .dockerignore
```

## 아키텍처 핵심: Teacher-Student Distillation

무거운 사전학습 모델(teacher)은 **학습 시점(`training/`)에만** 라벨을 만드는 데 쓰이고,
실제 서빙(`core/`, `api/`, `worker/`)에는 그 teacher를 흉내 내도록 학습된 **경량 MLP만**
배포된다. `core/mlp.py`의 `MLP` 클래스가 표정/음성 공용 구조이며(입력 차원만 다르고
구조는 동일), 은닉층 `hidden_dims=(64, 32)`, `dropout=0.3`을 기본값으로 쓴다(클립 수가
적으면 `(32, 16)`으로 줄이도록 학습 스크립트가 `--hidden` 옵션을 제공).

| | 표정 | 음성 |
|---|---|---|
| Teacher (학습 시에만 사용) | EMO-AffectNet (ResNet50 + LSTM, 7클래스) | jungjongho/wav2vec2-xlsr-korean-speech-emotion-recognition2 (한국어 6클래스, 기본값). `--teacher audeering`(영어 3축)도 보조로 지원 |
| Student 입력 차원 | 167 | 44 |
| Student 출력 | score(회귀 1) → 종형 곡선으로 0~10점 변환 | confidence/tension(2) → tension을 종형 곡선으로 0~10점 변환 |
| 현재 커밋된 체크포인트 | `core/face/model/face_mlp.pt`(in_dim=167로 확인됨) | `core/voice/model/voice_mlp.pt`(in_dim=44로 확인됨) |

응답 스키마(`FaceResult`/`VoiceResult`)는 `score`(0~10) 단일 필드만 노출한다.
`tension_score`/`confidence_score`/`blink_per_minute` 등은 `predictor.py` 내부에서는
계속 계산되지만 pydantic 스키마에 선언돼 있지 않아 응답 직렬화 시 자동으로 제외된다.

## 표정 분석: 랜드마크 추출은 브라우저에서

`POST /analyses/face`는 영상 파일을 받지 않는다. 브라우저(MediaPipe JS,
`frontend-sample/face-capture.js` 참고)가 얼굴 인식과 blendshape/EAR/MAR/정면이탈 계산을
끝낸 뒤, 프레임별 숫자 묶음(`FaceFrame`: blendshapes 52개 + ear/mar/deviation)만
`FaceAnalyzeRequest`로 전송한다. 서버는 이를 `core/face/aggregator.py`로 167차원
벡터(blendshape 평균/표준편차/후반-전반차이 52×3 + EAR/MAR/이탈 통계 + 깜빡임/시선이탈
+ 시간변화 피처)로 집계한 뒤 MLP에 넣기만 하므로 수 ms 안에 끝난다. 학습(`training/face/
build_dataset.py`)과 추론이 같은 `aggregate_from_frames()` 함수를 공유해
training-serving skew를 방지한다.

## 음성 분석: 서버가 오디오를 직접 처리

`POST /analyses/voice`는 오디오 파일(webm/wav/mp3/m4a/ogg/flac/opus)을 바이트로 받아
임시 파일로 저장한 뒤, `core/voice/feature_extractor.py`가 librosa(16kHz 리샘플,
MFCC 13×2/RMS/onset 기반 발화속도/무음비율)와 Praat(원본 샘플레이트, F0/jitter/shimmer/
HNR/포먼트)로 44차원 피처를 뽑아 MLP에 넣는다(2~3초 소요). 목소리 떨림 같은 지표는
브라우저에서 계산할 수 없어 오디오 자체를 서버로 보내야 한다. `asyncio.Semaphore` +
전용 `ThreadPoolExecutor`(기본 동시 2건, `VOICE_CONCURRENCY`)로 동시 실행 개수를
제한해, 같은 서버에서 도는 화상면접(LiveKit) CPU를 침범하지 않게 한다.

## 핵심 기술 스택

| 구분 | 내용 |
|---|---|
| 웹 프레임워크 | FastAPI 0.115.0 + uvicorn |
| 데이터 검증 | pydantic 2.9.2 / pydantic-settings 2.5.2 |
| MLP 추론 | torch 2.4.1 (CPU 전용 휠), numpy 1.26.4 |
| 음성 피처 추출 | librosa 0.10.2, praat-parselmouth 0.4.5, soundfile, audioread (+ ffmpeg) |
| 큐(선택 기능) | celery 5.4.0, redis 5.0.8 |
| 파일 업로드 | python-multipart |
| 학습 전용(`requirements-train.txt`, 이미지 미포함) | mediapipe 0.10.14, opencv-python-headless, transformers, huggingface_hub, pillow, scikit-learn |

## API 엔드포인트

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/health` | 서버 생존 확인 (외부 의존성 없이 즉시 응답) |
| GET | `/health/model` | 표정/음성 모델 파일이 실제로 존재하는지 확인 |
| GET | `/health/worker` | Celery 워커 ping (큐 미사용 시 `disabled`/`no_worker`가 정상) |
| POST | `/analyses/face` | 프레임 벡터 묶음 → 표정 점수 즉시 반환 |
| POST | `/analyses/voice` | 오디오 파일 → 음성 점수 반환 (동기, 2~3초 소요) |
| POST | `/analyses/voice/queue` | (선택) 오디오를 큐에 접수하고 `task_id` 반환 — Celery/Redis 필요 |
| GET | `/analyses/voice/{task_id}` | (선택) `task_id`로 큐 처리 상태/결과 조회 |

## worker/(큐 방식)는 선택적 기능이다

`worker/`는 Celery 태스크(`analyze_voice`)와 스토리지 추상화까지 완전히 구현돼 있고
Dockerfile에도 포함되지만(`COPY worker/`), **기본 `docker compose up`으로는 실행되지
않는다.** `analysis.py`의 `POST /analyses/voice`가 이미 그 자리에서 동기 처리로 결과를
반환하므로, BE가 응답을 기다릴 수 없는 상황에서만 아래 프로필로 켜서 쓰도록 설계돼 있다.

## 실행 방법

```bash
# .env 파일 필요 (별도 .env.example 없음 — docker-compose가 env_file로 참조하므로
# 파일 자체는 있어야 하며, 없는 값은 config.py의 기본값을 그대로 쓴다)
touch .env

# 기본 실행: api 컨테이너만 (표정/음성 모두 이 안에서 동기 처리)
docker compose up -d --build
# → http://localhost:8100

# 큐 방식이 필요할 때: worker + redis 추가 실행
docker compose --profile queue up -d --build
```

`docker-compose.yml`은 모든 서비스를 `platform: linux/amd64`로 고정한다(ARM 환경에서
`praat-parselmouth` 소스 빌드가 실패하는 것을 막기 위함). uvicorn `--workers`는 늘리지
않는 것을 전제로 한다 — `VOICE_CONCURRENCY`가 프로세스 1개 기준이라 워커 수를 늘리면
실제 동시 분석 개수가 그만큼 배로 늘어난다.
