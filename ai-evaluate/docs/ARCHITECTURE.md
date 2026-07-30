# 설계 결정 기록

이 문서는 "왜 이렇게 만들었는지"를 남긴다. 코드 주석보다 상위 레벨의 판단들.

## 1. 서버를 `ai/` 와 분리한 이유

librosa/parselmouth/torch 는 무겁고 의존성 충돌이 잦다. 기존 `ai/`(질문생성·RAG)에
합치면 질문 생성 API 전체가 그 무게와 배포 리스크를 함께 지게 된다. BE 입장에서는
`ai/`(:8000)와 `ai-evaluate/`(:8100) 두 개의 독립적 호출 경로가 생긴다.

## 2. 표정 추출을 브라우저로 옮긴 이유

초기 설계는 영상을 서버로 업로드 → 서버에서 OpenCV 디코딩 + MediaPipe 추론이었다.
이를 브라우저(JS MediaPipe)로 옮긴 근거:

1. **서버 CPU** — MediaPipe 추론이 전체 연산의 95%. 같은 EC2에서 LiveKit이 60명
   규모 WebRTC를 처리 중이라면 이 부하는 화상통화 품질에 직접 영향을 준다.
2. **대역폭** — 90초 영상 수십 MB vs 벡터 100KB.
3. **응답 구조 단순화** — 서버 작업이 수 ms로 줄어 Celery/폴링이 불필요해졌다.
4. **개인정보** — 면접 영상이 서버로 전송되지 않는다.
5. **이미지 크기** — mediapipe/opencv/libgl 의존성이 도커에서 사라졌다.

**대가**: 학습(파이썬 MediaPipe)과 추론(JS MediaPipe)의 구현이 갈린다.
→ `training/face/verify_parity.py` 로 초기에 1회 검증하는 것으로 대응.

**음성에는 적용 못 함**: Praat(parselmouth)은 브라우저 대체재가 없다.

## 3. 표정과 음성을 별개 모델로 두는 이유

- 무게/의존성 분리
- "표정은 안정적인데 목소리만 떨렸다" 같은 모달리티별 피드백을 주려면 애초에 따로
  평가해야 한다
- 멀티모달 late fusion 은 이론적으로 가능하나 현 단계에서는 복잡도상 보류

`core/mlp.py` 의 MLP 클래스를 공유하지만, 이는 '구조가 같을 뿐 모델은 완전히 별개'다.

## 4. 라벨 단위 = 클립 1개

답변 1개(1~2분) = 집계벡터 1개 = 라벨 1개 = 학습 데이터 한 줄.

프레임 단위 라벨링을 하지 않는 이유: 클립 전체에 붙은 라벨을 내부 모든 프레임에
복사하면 라벨 노이즈가 발생한다(Multiple Instance Learning 문제).

**대가 2가지와 대응**:

| 문제 | 대응 |
|---|---|
| 데이터 희소 (면접 1회 = 5줄) | 음성은 윈도우 분할로 6배 확보. 표정은 촬영량 확보 필요 |
| 시간 정보 소실 (평균이 순서를 지움) | 집계벡터에 시간변화 피처 3개 추가 (전후 차이, 추세 기울기) |

**음성만 윈도우 분할이 공짜인 이유**: teacher 가 라벨을 생성하므로 잘린 조각 각각이
'복사된 라벨'이 아니라 '자기 자신의 실제 측정값'을 갖는다. 표정은 사람이 라벨링하므로
분할하면 라벨 복사 문제가 그대로 발생한다.

## 5. pyin 을 제거하고 Praat 로 통일한 이유

초기 코드는 `librosa.pyin` 으로 F0 를, parselmouth 로 jitter 를 구했다. 그런데
Praat 도 jitter 계산을 위해 내부적으로 피치를 구하므로 **같은 일을 두 번** 하고 있었고,
pyin(확률적 YIN + HMM Viterbi)이 파이프라인에서 가장 느린 구간이었다.

부가로 초기 설정의 `fmax=C7(2093Hz)` 는 사람 말소리 F0 범위(~400Hz)를 한참 벗어난
낭비였다.

## 6. 샘플레이트를 의도적으로 분리한 이유

- **librosa 16kHz**: MFCC/에너지/온셋. teacher(wav2vec2)와 동일 조건 유지.
- **Praat 원본(44.1kHz 등)**: F0/jitter/shimmer/HNR.

jitter 는 주기 길이의 미세 변동(1% ≈ 50µs)을 재는 지표인데, 16kHz는 1샘플이 62.5µs로
**측정 대상보다 눈금이 크다**. 파라볼릭 보간으로 일부 회복되지만 한계가 있어 원본
샘플레이트를 쓰는 편이 정확하다.

## 7. Celery 를 쓰는 이유 (Django 없이)

Celery 는 프레임워크 무관한 독립 작업큐 라이브러리다. Django 예제가 많아 오해하기
쉽지만 FastAPI + Celery + Redis 로 충분하다.

음성 분석이 수 초 걸리므로 HTTP 요청 안에서 동기 처리하면 uvicorn 워커가 점유되고
BE 타임아웃도 발생한다.

## 8. storage 추상화를 넣은 이유

배포처가 미정이다. api ↔ worker 가 공유 볼륨으로 파일을 주고받는 방식은 두 컨테이너가
**같은 물리 머신**에 있을 때만 동작한다. ECS/k8s/오토스케일링으로 가면 깨진다.

지금 30줄을 투자해두면 나중에 `S3Storage` 클래스 하나 추가 + `.env` 한 줄로 끝난다.
안 해두면 api/worker/tasks 세 파일에 흩어진 경로 처리를 전부 뒤져야 한다.

## 9. teacher 모델을 jungjongho / EMO-AffectNet 으로 확정한 이유

Hugging Face 에 있는 사전학습 모델들을 라이선스·출력 형태·도메인(한국어/실제 면접
맥락)·검증도 기준으로 비교한 뒤 정했다.

**음성**: audeering/wav2vec2-large-robust-12-ft-emotion-msp-dim(영어, MSP-Podcast,
연속값 회귀, 다운로드 89만+)이 검증도는 가장 높지만 영어 화자 기준으로 학습됐다는
domain gap 이 있다. jungjongho/wav2vec2-xlsr-korean-speech-emotion-recognition2
(한국어, 6클래스 이산 분류)는 검증도가 낮고 학습 데이터 출처가 불명확하지만(99.76%
검증 정확도가 비정상적으로 높아 연기 발화 코퍼스일 가능성 있음), 한국어로 학습됐다는
점을 우선했다. 6클래스 확률을 `training/voice/make_pseudo_labels.py` 의
`TENSION_WEIGHTS` 로 confidence/tension 스칼라로 재조합해서 쓴다.
audeering 을 보조 teacher 로 앙상블하는 것은 `--teacher audeering` 옵션으로 여전히
가능하게 남겨뒀다.

**표정**: dima806/facial_emotions_image_detection(정적 이미지 ViT, 91% acc, 라이선스
깨끗함)이 검증도는 가장 좋지만 "사진 한 장" 분류기라 우리가 원하는 "영상 전체 흐름"과
구조가 다르다. ElenaRyumina/face_emotion_recognition(EMO-AffectNet, ResNet50 백본 +
LSTM)은 CNN 프레임 피처 → 시간축 모델이라는 점에서 우리 목표(집계벡터 → MLP)와
아키텍처가 가장 유사해 선택했다. 다만 학습 데이터가 전부 연기 코퍼스(RAVDESS 등)이거나
유튜브 반응 영상(Aff-Wild2)이라 한국인 실제 면접 도메인과는 거리가 있고, 코퍼스별
leave-one-corpus-out 성능이 25~76% UAR 로 크게 흔들린다는 한계가 있다 - 6개 LSTM
버전 중 가장 자연스러운 반응에 가까운 Aff-Wild2 를 기본값으로 쓴다
(`training/face/make_pseudo_labels.py --lstm-corpus`).

**공통 원칙**: 두 모델 모두 teacher(distillation 의 정답 생성기)로만 쓰고, 서빙에는
절대 올리지 않는다. EMO-AffectNet 의 ResNet50 프레임별 추론은 CPU 로 돌리기엔 무겁고,
브라우저에 올리는 것도 표정 추출을 서버에서 브라우저로 옮긴 결정(섹션 2)과 배치된다.
그래서 이 두 모델은 오프라인 학습 스크립트에서만 무겁게 한 번 돌고, 서빙은 여전히
`core/face/` 의 116차원 집계벡터 + 경량 MLP, `core/voice/` 의 38차원 피처 + 경량 MLP
그대로다.
