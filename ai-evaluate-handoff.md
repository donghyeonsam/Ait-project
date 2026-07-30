# 핸드오프 — ai-evaluate (표정·음성 분석 서버) 설계/구현 컨텍스트

이 문서는 AI 모의면접 프로젝트 중 "표정/음성 기반 자신감·긴장도 분석" 기능(`ai-evaluate` 서비스)에 대해 지금까지 논의·결정·구현한 내용을 압축한 것이다. 새 대화창에서 이걸 붙여넣고 "여기서 이어서 하자"고 시작하면 된다.

## 1. 프로젝트 배경

- SSAFY 팀 프로젝트: AI 모의면접 서비스. BE(Spring)+WebRTC(LiveKit 화상면접)+`ai/`(RAG 기반 질문생성 FastAPI, GMS LLM 사용)가 이미 존재.
- 여기에 새로 추가하는 것이 `ai-evaluate/`(구 명칭 `ai-media`) — 면접 답변의 **표정**과 **음성**을 분석해 자신감/긴장도 점수를 매기는 별도 FastAPI 서비스.
- 배포 대상: EC2 16GB RAM, **GPU 없음**. 같은 서버에서 LiveKit(화상면접, CPU 많이 씀)도 돌아가야 하므로 CPU 예산이 항상 핵심 제약.
- 배포 위치(EC2 확정 여부)는 아직 미정 — 이식성 고려해서 설계함(storage 추상화 등).

## 2. 전체 아키텍처 핵심 결정

```
[표정]  브라우저: 카메라 → MediaPipe(JS)로 랜드마크/blendshape 추출
        → POST /analyses/face → 집계(116차원 벡터) + 경량 MLP → 점수 즉시 반환(수ms)
        ※ 영상 자체는 서버에 안 올라감

[음성]  브라우저: 녹음 → 소리 파일(바이트)
        → BE(Spring, @Async)가 바이트 그대로 전달
        → POST /analyses/voice → librosa/Praat로 38차원 피처 추출 + 경량 MLP → 점수 반환(2~3초)
```

결정 이유(순서대로 논의됨):
1. **표정을 서버가 아니라 브라우저에서 처리**: MediaPipe 추론이 전체 연산의 95%였는데, 이걸 브라우저 JS로 옮기면 서버는 벡터 집계+작은 MLP만 하면 되어 CPU 부담이 사실상 0. LiveKit과 CPU 경합 회피, 대역폭(수십MB 영상 vs 100KB 벡터) 절약, 개인정보(영상 미전송) 이점도 있음.
2. **음성은 서버에서 처리할 수밖에 없음**: Praat(parselmouth)과 librosa MFCC/온셋 계산은 브라우저 대체재가 없음.
3. **동기 처리로 설계**: BE가 이미 `@Async`로 별도 스레드에서 부르므로, ai-evaluate도 그 자리에서 처리해 결과를 바로 반환. Celery/Redis 큐는 `docker compose --profile queue`로 선택적으로만 켤 수 있게 남겨둠(기본은 API 컨테이너 하나만 뜸).
4. **동시성 제어**: `asyncio.Semaphore(voice_concurrency)` + 전용 `ThreadPoolExecutor`로 음성 분석 동시 실행 개수를 제한(기본 2개). 안 하면 LiveKit이 CPU 경합으로 끊김.
5. **distillation 구조(핵심)**: 무거운 사전학습 모델(teacher)을 학습 시점에만 오프라인으로 돌려 라벨을 만들고, 실제 서빙에는 그 라벨로 학습된 아주 작은 MLP(student)만 올린다. 무거운 모델은 서버에 절대 안 올라감.
6. **`core/` 패키지 공유**: 피처 집계 로직(표정 aggregator, 음성 feature_extractor)을 학습(`training/`)과 추론(`api/`, `worker/`)이 동일하게 import해서 training-serving skew를 원천 차단.
7. **답변 1개 = 벡터 1개 = 점수 1개**: 표정/음성 둘 다 "질문 하나에 대한 답변 전체"를 하나의 분석 단위로 삼는다. 음성 쪽 `--window` 옵션은 **학습 데이터 증강 전용**이며 서빙 경로에는 자르는 로직이 없음(항상 답변 전체를 통으로 분석).

## 3. Teacher 모델 최종 결정 (Hugging Face 리서치 결과)

여러 후보를 라이선스/출력형태/도메인(한국어·실제 면접)/검증도 기준으로 비교한 뒤 확정:

### 음성: `jungjongho/wav2vec2-xlsr-korean-speech-emotion-recognition2_data_rebalance`
- wav2vec2-large-xlsr-53(Meta AI) 기반 → 한국어 ASR로 1차 파인튜닝(`jungjongho/wav2vec2-large-xlsr-korean-demo-colab_epoch15`, 근데 이 중간 모델 카드가 "Training data: None", WER 0.38로 검증이 부실 — 개인 튜토리얼 프로젝트일 가능성 높음) → 6클래스 감정 분류(기쁨/당황/분노/불안/슬픔/중립)로 2차 파인튜닝.
- 검증 정확도 99.76%가 비정상적으로 높아 연기 발화 코퍼스일 가능성 있다는 의심을 유지 중.
- 대안이었던 `audeering/wav2vec2-large-robust-12-ft-emotion-msp-dim`(영어, MSP-Podcast, arousal/valence/dominance 연속값, 다운로드 89만+, 검증 탄탄)은 한국어가 아니라는 domain gap으로 보조/앙상블용으로만 코드에 남겨둠(`--teacher audeering` 옵션).
- **6클래스 확률 → confidence/tension 스칼라 매핑은 순수 휴리스틱**(`TENSION_WEIGHTS`, 반드시 우리 데이터로 검증 필요).

### 표정: `ElenaRyumina/face_emotion_recognition` (EMO-AffectNet)
- ResNet50(VGGFace2→AffectNet 파인튜닝, 66.4% acc) 백본 + LSTM(RAVDESS/CREMA-D/IEMOCAP/RAMAS/SAVEE/Aff-Wild2 각각 버전 존재, leave-one-corpus-out UAR 25~76%로 도메인 전이가 불안정).
- 대안이었던 `dima806/facial_emotions_image_detection`(정지 이미지 ViT, 91% acc, 라이선스 깨끗)은 "사진 한 장" 분류기라 우리의 "영상 흐름" 구조와 안 맞아 탈락. EMO-AffectNet은 CNN 프레임피처+LSTM 시간축 구조가 우리 목표(집계벡터→MLP)와 아키텍처상 가장 유사해서 채택.
- 6개 LSTM 버전 중 Aff-Wild2(유튜브 실제 반응 영상, 가장 자연스러움)를 기본값으로.
- 가중치 파일이 실제로 HF Hub에 state_dict(.pt)로 올라와 있어 `huggingface_hub.hf_hub_download`로 직접 받을 수 있음(Google Drive 수동 다운로드 불필요). 원 저장소의 `run_webcam.ipynb`에서 정확한 ResNet50/LSTM 클래스 정의와 전처리(VGGFace2 버전2 평균값 빼기: BGR 순서로 91.4953/103.8827/131.0912)를 확인해 그대로 재현함.
- 얼굴 검출은 원 저장소의 RetinaFace(GPU 의존 패키지 필요) 대신 이미 있는 MediaPipe FaceMesh로 대체(새 의존성 추가 없음).

### 공통 원칙
두 teacher 모두 **오프라인 학습 스크립트에서만** 무겁게 돌고 서빙에는 절대 안 올라간다. EMO-AffectNet의 ResNet50을 프레임마다 서버/브라우저에서 실시간으로 돌리는 건 표정을 브라우저로 옮긴 결정과 정면으로 배치되므로 명확히 배제함.

## 4. 파일 구조 (`ai-evaluate/`)

```
ai-evaluate/
├── config.py                 pydantic-settings 기반 설정
├── docker-compose.yml        api 컨테이너 기본, worker+redis는 --profile queue
├── Dockerfile                 torch CPU 전용 휠 설치
├── api/
│   ├── main.py
│   ├── routers/{health,analysis}.py
│   └── schemas/analysis.py    FaceResult(tension_score, confidence_score 등), VoiceResult(confidence_score, tension_score, speech_rate, pause_ratio)
├── core/                     학습·추론 공유, 도커 이미지 포함
│   ├── mlp.py                 표정·음성 공용 MLP 클래스 (in_dim/hidden_dims/out_dim 가변)
│   ├── face/
│   │   ├── landmark_metrics.py   EAR/MAR/이탈 계산 (JS가 동일 로직 포팅)
│   │   ├── aggregator.py         프레임벡터→116차원 집계(blendshape52 mean/std, EAR/MAR/deviation 통계, 깜빡임/시선이탈/시간변화피처)
│   │   ├── predictor.py          집계벡터→MLP→tension_score+confidence_score(=1-tension_score)
│   │   └── model/face_mlp.pt, face_scaler.json (학습 후 생성)
│   └── voice/
│       ├── feature_extractor.py  오디오→38차원 (F0 3 + RMS 2 + 휴지/속도 4 + jitter/shimmer/HNR 3 + MFCC 26, Praat이 원본 샘플레이트로 F0/jitter/shimmer/HNR 직접 계산, librosa 16kHz로 MFCC/에너지/온셋)
│       ├── predictor.py          피처→MLP→confidence_score+tension_score (out_dim=2 검증 포함)
│       └── model/voice_mlp.pt, voice_scaler.json
├── worker/                   Celery(음성 전용, 선택적 큐 경로)
├── training/                 학습 전용, 도커 이미지에서 제외
│   ├── trainer.py                공용 학습 루프(group-split, early stopping)
│   ├── face/
│   │   ├── extract_frames.py     파이썬 MediaPipe로 학습용 프레임 벡터 추출
│   │   ├── make_pseudo_labels.py [신규] EMO-AffectNet teacher로 영상→pseudo confidence_score, labels.csv와 동일 스키마로 출력
│   │   ├── build_dataset.py      프레임JSON+라벨→npz
│   │   ├── train_mlp.py, verify_parity.py, labels.csv
│   └── voice/
│       ├── make_pseudo_labels.py [--teacher jungjongho|audeering 지원] 오디오→pseudo-label CSV, AIHub 중첩폴더용 --recursive --filename-contains 지원
│       ├── build_dataset.py      [--teacher 플래그로 컬럼 스키마 분기]
│       └── train_mlp.py          [--teacher 플래그로 AXES/out_dim 분기, 기본 jungjongho(confidence,tension) out_dim=2]
├── frontend-sample/face-capture.js
├── docs/
│   ├── ARCHITECTURE.md        설계 이유 기록 (9절에 teacher 선정 근거 추가됨)
│   ├── SPRING_INTEGRATION.md  BE 연동 가이드 (Java DTO 등 confidence_score/tension_score로 갱신됨)
│   ├── GLOSSARY.md
│   └── CODE_REVIEW.md         v0.3.0 시점 스냅샷(상단에 이후 스키마 변경 안내 주석 추가됨)
└── tests/{test_aggregator,test_api}.py   torch 없이도 실행 가능한 스모크 테스트, 전체 통과 확인됨
```

## 5. 최근 반영한 코드 변경 (이번 세션)

1. `ai-media` → `ai-evaluate` 전체 리네임 (디렉토리, docker-compose container_name/celery app명/문서 내 hostname 전부 치환 확인).
2. `training/voice/make_pseudo_labels.py`: jungjongho용 커스텀 `Wav2Vec2ForSpeechClassification`(m3hrdadfi 패턴) 클래스 추가, `--teacher` 플래그로 audeering/jungjongho 선택, AIHub 중첩폴더 대응.
3. **음성 응답 스키마 전면 변경**: `arousal/valence/dominance`(3축, audeering 전용) → `confidence_score/tension_score`(2축, 표정과 통일). 연쇄 수정: `core/voice/predictor.py`(loss_name 기반 sigmoid/clip 자동분기 추가, out_dim=2 검증), `api/schemas/analysis.py`, `training/voice/build_dataset.py`/`train_mlp.py`(둘 다 --teacher 플래그), `docs/SPRING_INTEGRATION.md` Java DTO.
4. `FaceResult`에 `confidence_score` 필드 추가(표정도 음성과 축 통일), `core/face/predictor.py`에서 `1-tension_score`로 계산해 반환.
5. `training/face/make_pseudo_labels.py` 신규 작성: EMO-AffectNet(ResNet50+LSTM) state_dict를 HF Hub에서 다운로드해 로드, MediaPipe로 얼굴 크롭, win10/step5 슬라이딩 윈도우로 7클래스 확률 산출 후 `FACE_TENSION_WEIGHTS`로 confidence_score 매핑, `labels.csv`와 동일 스키마 출력.
6. 검증: torch 없는 환경에서 스모크 테스트(집계 10건, API 11건) 전체 통과 재확인. 새 로직(파일탐색, tension 가중치 계산, bbox 계산, 윈도우 슬라이싱)도 별도 검증함.
7. 문서 갱신: `README.md`의 "아직 정해지지 않은 것" 중 표정 MLP 출력 형태 항목을 "확정"으로 변경, `ARCHITECTURE.md`에 teacher 선정 근거 9절 추가.

## 6. 산출물

`ai-evaluate.zip`(전체 52개 파일)을 이번 세션 중 사용자에게 전달함(present_files). **실제 프로젝트 폴더(S15P11D202)에는 아직 반영 안 됨** — 사용자가 검수 후 직접 옮기는 방식으로 진행 중.

## 7. 이번 세션 주요 Q&A 핵심 결론 (재질문 대비 요약)

- **jungjongho 모델의 계보**: Meta의 wav2vec2-large-xlsr-53을 한국어 ASR로 먼저 파인튜닝한 중간 모델이 있는데, 그 모델 카드가 데이터 미기재+WER 0.38로 검증이 부실해 "공식 연구진"이라기보다 개인 튜토리얼 프로젝트일 가능성이 큼.
- **이 모델이 피치/떨림을 직접 재는 게 아님**: wav2vec2는 원본 파형을 그대로 넣는 end-to-end 블랙박스라 "피치·떨림"을 명시적으로 계산하지 않음. 피치(F0)·떨림(jitter/shimmer)·음질(HNR)을 실제로 직접 계산하는 건 우리 자체 파이프라인의 Praat(parselmouth)이고, 이미 38차원 피처에 포함돼 있음(정의가 명확한 DSP 계산이라 애초에 "모델"이 필요한 영역이 아님).
- **바이트만 넘기는 기존 설계와 호환되는가**: 됨. 어떤 음성모델도 압축 바이트(webm 등)를 그대로는 못 받고 디코딩(PCM 파형 변환)이 선행돼야 하는데, 이건 jungjongho 채택 여부와 무관하게 이미 우리 코드(librosa/ffmpeg)가 처리하고 있음. jungjongho는 애초에 서빙 경로에 관여하지 않고 학습 시점에만 쓰임.
- **"목소리 떨림+피치+말더듬으로 자신감 판단"하는 완제품 HF 모델은 없음**: 피치/떨림은 이미 우리가 직접 계산 중(모델 불필요). "말더듬"은 유창성장애(SEP-28k 등 임상 연구, 재사용 가능한 HF 모델 없음, 도메인도 안 맞음) vs 긴장으로 인한 hesitation(필러워드/멈춤)을 구분해야 하며, 후자는 이미 `pause_ratio`/`speech_rate`가 일부 대리하고 있고, 추가로 필요하면 한국어 ASR + 필러워드("음","어" 등) 카운팅을 새 피처로 추가하는 방향이 현실적(아직 미구현, 다음 후보 작업).

## 8. 다음에 이어서 할 만한 것 (미결)

- [ ] 필러워드/hesitation 탐지 피처 추가 스크립트 (ASR 기반)
- [ ] jungjongho `TENSION_WEIGHTS`, EMO-AffectNet `FACE_TENSION_WEIGHTS` 실제 데이터로 sanity check
- [ ] 팀 자체 모의면접 영상 촬영 + 라벨링 (가장 중요한 gold 데이터, 아직 미착수)
- [ ] AIHub 채용면접 음성 1301개 재라벨링(사람이 음성만 듣고 자신감/긴장도 평가) — 텍스트 기반 KoBERT 라벨은 못 씀
- [ ] `ai-evaluate.zip` 실제 프로젝트 폴더에 반영 여부 결정
