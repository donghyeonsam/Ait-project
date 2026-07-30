# 코드 리뷰 & 동작 설명

> ⚠️ **이 문서는 v0.3.0 시점의 스냅샷이다.** 이후 teacher 모델을 jungjongho(음성)/EMO-AffectNet(표정)으로 확정하면서 음성 응답 필드가 `arousal/valence/dominance` → `confidence_score/tension_score` 로 바뀌었다(표정도 `confidence_score` 가 추가됨). 최신 스키마는 `api/schemas/analysis.py` 와 `docs/SPRING_INTEGRATION.md`를, teacher 선정 배경은 `docs/ARCHITECTURE.md` 9절을 참고할 것 - 아래 내용 중 응답 필드명이 언급된 부분은 이 스냅샷 당시 기준이다.

이 문서는 세 부분이다.

- **1부**: 요청 하나가 들어와서 응답이 나갈 때까지의 전체 흐름
- **2부**: 파일별로 코드가 무슨 일을 하는지 (줄 단위)
- **3부**: 리뷰하면서 발견한 문제와 고칠 방법

---

# 1부. 전체 흐름

## 1-1. 큰 그림 — 파일 3종류

```
┌─────────────────────────────────────────────────────────┐
│  api/     "요청을 받고 응답을 준다"                        │
│           - 값이 이상하면 여기서 걸러낸다                    │
│           - 계산은 직접 안 하고 core/ 에 시킨다              │
└──────────────────────┬──────────────────────────────────┘
                       │ 호출
┌──────────────────────▼──────────────────────────────────┐
│  core/    "실제 계산을 한다"                               │
│           - 숫자를 요약하고 모델에 넣는다                    │
│           - HTTP 를 전혀 모른다 (그래서 학습에서도 재사용 가능) │
└──────────────────────▲──────────────────────────────────┘
                       │ 같은 함수를 호출
┌──────────────────────┴──────────────────────────────────┐
│ training/ "모델을 만든다" (서버에 안 올라감, 노트북에서 실행)  │
└─────────────────────────────────────────────────────────┘
```

**핵심은 `core/` 를 가운데 둔 것이다.**
서버가 쓰는 계산과 학습이 쓰는 계산이 같은 코드여야 한다. 이게 갈라지면 "연습 문제는
다 맞는데 실전에서만 틀리는" 상황이 되고, 원인을 찾기가 극도로 어렵다.

## 1-2. 표정 분석 — 요청 하나를 끝까지 따라가기

```
① 브라우저
   카메라 영상에서 1초에 5장씩 뽑아 얼굴 인식(MediaPipe JS)
   각 장마다 → blendshape 52개 + ear + mar + deviation = 숫자 55개
   90초 답변이면 450장 × 55개
       │
       │  POST /analyses/face   { fps, duration_sec, frames: [...] }
       ▼
② api/schemas/analysis.py — 값 검사 (자동)
   blendshapes 가 정확히 52개인가?  아니면 → 422
   ear 이 0~2 범위인가?             아니면 → 422
   frames 가 5개 이상인가?          아니면 → 422
       │  통과
       ▼
③ api/routers/analysis.py :: analyze_face()
   프레임이 3000개를 넘나?  넘으면 → 413
       │
       ▼
④ core/face/aggregator.py :: aggregate_from_request()
   프레임 리스트 → numpy 배열 4개로 변환
       │
       ▼
   aggregate_from_frames()
   450개 프레임을 숫자 116개로 압축
     · blendshape 52개의 평균  → 52개
     · blendshape 52개의 변동폭 → 52개
     · 눈/입/시선의 평균·변동폭  → 6개
     · 분당 깜빡임, 시선이탈 비율 → 2개
     · 앞뒤 변화, 추세          → 3개
     · 답변 길이               → 1개
       │
       ▼
⑤ core/face/predictor.py :: predict_face()
   (첫 요청일 때만) 학습된 모델 파일을 메모리에 올림
   숫자 116개를 학습 때와 같은 기준으로 보정
   모델에 넣어 점수 하나를 얻음
       │
       ▼
⑥ 응답
   { "status": "succeeded",
     "face": { "tension_score": 0.63, "blink_per_minute": 24.1, ... } }
```

**걸리는 시간**: 전부 합쳐 수 밀리초. 무거운 얼굴 인식은 이미 브라우저에서 끝났다.

## 1-3. 음성 분석 — 요청 하나를 끝까지 따라가기

```
① 브라우저 → BE(Spring)
   녹음한 소리 파일을 byte[] 로 읽음
       │
       │  POST /analyses/voice   (multipart, 파일이름 필수)
       ▼
② api/routers/analysis.py :: analyze_voice()
   _check_suffix() : 확장자가 허용 목록에 있나?  없으면 → 400
   await file.read() : 바이트를 전부 읽음
   비어 있나?  → 400
       │
       ▼
③ 세마포어 — "주차 자리 잡기"
   이미 2개가 돌고 있으면 여기서 대기
       │  자리 확보
       ▼
④ asyncio.to_thread(_analyze_audio_bytes, ...)
   느린 작업을 별도 스레드로 넘김
   (이렇게 안 하면 2~3초 동안 서버 전체가 멈춘다)
       │
       ▼
⑤ _analyze_audio_bytes()
   바이트를 임시 파일로 저장  ← Praat/ffmpeg 가 "파일 위치"를 요구하기 때문
       │
       ▼
⑥ core/voice/feature_extractor.py :: extract_voice_features()

   같은 파일을 두 번 읽는다 (의도한 것)
   ┌─ librosa (16000Hz 로 변환) ─┐   ┌─ Praat (원본 그대로) ──────┐
   │  · 음량 평균/변동           │   │  · 목소리 높낮이 F0        │
   │  · 무음 비율, 쉬는 횟수      │   │  · 목소리 떨림 jitter      │
   │  · 발화 속도                │   │  · 음량 떨림 shimmer       │
   │  · 음색 MFCC 26개           │   │  · 맑기 HNR                │
   └────────────────────────────┘   └───────────────────────────┘
                    합쳐서 숫자 38개
       │
       ▼
⑦ core/voice/predictor.py :: predict_voice()
   보정 → 모델 → 3개 점수 (arousal / valence / dominance)
       │
       ▼
⑧ 임시 파일 삭제 (finally 블록, 실패해도 반드시 실행)
       │
       ▼
⑨ 응답 { arousal, valence, dominance, speech_rate, pause_ratio }
       │
       ▼
⑩ BE 가 Redis 에 저장
```

**걸리는 시간**: 2~3초. 대부분 Praat 계산이다.

---

# 2부. 파일별 설명

## `config.py` — 설정값 모음

```python
class Settings(BaseSettings):
    blink_ear_threshold: float = 0.21
```

`BaseSettings` 를 상속하면 **환경변수(.env)가 있으면 그 값을, 없으면 기본값을** 자동으로
쓴다. `.env` 에 `BLINK_EAR_THRESHOLD=0.25` 라고 쓰면 대문자/소문자를 알아서 맞춰준다.

```python
@lru_cache
def get_settings() -> Settings:
    return Settings()

settings = get_settings()
```

`Settings()` 를 부를 때마다 `.env` 파일을 다시 읽는다. `@lru_cache` 는 "한 번 계산한 건
기억해뒀다가 다음부터는 그거 줘" 라는 뜻이라, 사실상 하나만 만들어진다.
맨 아래 `settings = ...` 로 미리 만들어두면 다른 파일에서 `from config import settings`
한 줄로 갖다 쓸 수 있다.

**중요한 값 3개**

| 값 | 뜻 | 주의 |
|---|---|---|
| `blink_ear_threshold=0.21` | 이 값 아래면 눈 감은 것 | 사람마다 눈 크기가 달라 촬영 데이터로 조정 필요 |
| `voice_concurrency=2` | 음성 분석 동시 실행 개수 | 올리면 화상면접이 끊긴다 |
| `praat_pitch_ceiling=400` | 목소리 높낮이 탐색 상한 | 말소리는 400Hz 를 거의 안 넘는다 |

---

## `api/schemas/analysis.py` — 주고받을 데이터의 모양

여기 정의만 해두면 **FastAPI 가 자동으로 검사**해준다. 코드로 `if` 를 쓸 필요가 없다.

```python
blendshapes: list[float] = Field(
    ..., min_length=52, max_length=52)
```

- `...` = "이 값은 반드시 있어야 함"
- `min_length=52, max_length=52` = 정확히 52개여야 함

52개가 아닌 요청이 오면 우리 코드가 실행되기도 전에 **422 에러**로 거부된다.
잘못된 데이터가 모델까지 흘러들어가는 걸 막는 첫 번째 방어선이다.

```python
ear: float = Field(..., ge=0.0, le=2.0)
```

`ge` = greater or equal(이상), `le` = less or equal(이하).

```python
class TaskStatus(str, Enum):
    PENDING = "pending"
```

Celery 가 쓰는 단어(`PENDING`, `SUCCESS`)를 그대로 밖에 내보내지 않고 우리 말로 감쌌다.
나중에 Celery 를 안 쓰게 돼도 BE 코드는 안 바뀐다.

---

## `api/routers/analysis.py` — 요청을 받는 곳

### 파일 맨 위

```python
_voice_semaphore = asyncio.Semaphore(settings.voice_concurrency)
```

**파일이 처음 읽힐 때 딱 한 번** 만들어진다. 서버가 사는 동안 계속 같은 걸 쓴다.
주차장 자리 2개짜리 표지판을 세워둔 것과 같다.

### 표정 처리

```python
@router.post("/face", response_model=FaceAnalyzeResponse)
async def analyze_face(payload: FaceAnalyzeRequest):
```

- `@router.post("/face")` = "POST 로 /analyses/face 가 오면 이 함수를 실행해라"
- `payload: FaceAnalyzeRequest` = 이 타입 표기만으로 FastAPI 가 JSON 을 검사하고 변환한다
- `response_model=` = 응답도 이 모양으로 검사해서 내보낸다

```python
    from core.face.aggregator import aggregate_from_request
    from core.face.predictor import predict_face
```

**함수 안에서 import 하는 이유**: 파일 맨 위에 쓰면 서버가 켜지는 순간 torch(무거움)가
메모리에 올라간다. 함수 안에 두면 첫 요청이 올 때 올라간다. 파이썬은 한 번 불러온 걸
기억하므로 두 번째 요청부터는 비용이 없다.

```python
    try:
        agg = aggregate_from_request(payload)
        result = predict_face(agg)
    except ValueError as e:
        → 400 (보낸 값이 잘못됨)
    except FileNotFoundError as e:
        → 503 (서버가 아직 준비 안 됨 = 모델 미학습)
    except Exception as e:
        logger.exception(...)
        → 500 (예상 못 한 오류)
```

에러 종류마다 다른 응답 코드를 주는 게 중요하다. BE 로그만 보고도
"우리가 값을 잘못 보냈나(400)" / "서버가 준비 안 됐나(503)" / "서버가 고장났나(500)"
를 구분할 수 있다.

`logger.exception` 은 `logger.error` 와 달리 **오류가 난 위치까지 전부** 로그에 남긴다.

### 음성 처리

```python
def _analyze_audio_bytes(data: bytes, suffix: str) -> dict:
```

앞에 `_` 가 붙은 건 "이 파일 안에서만 쓰는 함수" 라는 표시(관례).

```python
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(data)
        tmp_path = tmp.name
```

- `suffix=suffix` : 확장자를 유지해야 ffmpeg 가 "아 webm 이구나" 하고 알아본다
- `delete=False` : 자동 삭제를 끈다. 켜두면 `with` 를 벗어나는 순간 파일이 사라져서
  다음 줄에서 열 수 없다
- `tmp.name` : 실제 저장된 위치 (예: `/tmp/tmpab12cd.webm`)

```python
    try:
        feature, extras = extract_voice_features(tmp_path)
        result = predict_voice(feature)
        result.update(extras)
        return result
    finally:
        Path(tmp_path).unlink(missing_ok=True)
```

`finally` 는 **성공하든 실패하든 무조건 실행**된다. 여기서 임시 파일을 지운다.
없으면 서버 디스크가 소리 파일로 계속 차오른다.
`missing_ok=True` 는 "이미 없어도 에러 내지 마" 라는 뜻.

```python
    async with _voice_semaphore:
```

자리를 하나 잡는다. 자리가 없으면 **여기서 멈춰서 기다린다.**
`async with` 를 벗어나면 자동으로 자리를 반납한다.

```python
        result = await asyncio.wait_for(
            asyncio.to_thread(_analyze_audio_bytes, data, suffix),
            timeout=settings.voice_timeout_sec,
        )
```

- `asyncio.to_thread(함수, 인자들)` : 느린 함수를 별도 스레드로 보낸다.
  이게 없으면 2~3초 동안 서버 전체가 멈춰서 헬스체크조차 응답을 못 한다.
- `asyncio.wait_for(..., timeout=120)` : 120초 넘으면 포기한다.

---

## `core/face/aggregator.py` — 프레임 450개를 숫자 116개로

이 파일이 **표정 쪽의 심장**이다.

```python
FEATURE_DIM = BLENDSHAPE_COUNT * 2 + 2 + 2 + 2 + 2 + 3 + 1  # = 116
```

숫자를 직접 116 이라고 쓰지 않고 계산식으로 둔 이유: 나중에 항목을 추가하면
이 식만 고치면 되고, 실수로 안 맞으면 아래 검사에서 바로 잡힌다.

```python
    bs_mean = blendshapes.mean(axis=0)
    bs_std = blendshapes.std(axis=0)
```

`blendshapes` 는 (450, 52) 짜리 표다. 가로 450줄(프레임), 세로 52칸(근육).

- `axis=0` = "세로 방향으로 눌러라" → 450줄이 1줄로 합쳐져 52개가 남는다
- `mean` = 평균 → "이 답변 내내 이 근육이 얼마나 움직였나"
- `std` = 변동폭 → "표정이 얼마나 바뀌었나" (긴장하면 굳어서 작아지는 경향)

**왜 이 압축이 꼭 필요한가**: 답변 길이가 사람마다 다르다(30초/3분). 그런데 모델은
입력 개수가 항상 같아야 한다. 그래서 몇 프레임이 오든 116개로 만드는 것이다.

```python
    blink_count = int(np.sum((ear[:-1] >= th) & (ear[1:] < th)))
```

이 한 줄이 깜빡임을 센다. 풀어서 보면:

```
ear         = [0.30, 0.30, 0.10, 0.30, 0.30]   ← 3번째에서 눈 감음
ear[:-1]    = [0.30, 0.30, 0.10, 0.30]         ← 마지막 빼고
ear[1:]     =       [0.30, 0.10, 0.30, 0.30]   ← 첫 번째 빼고
                     ↑ 한 칸 밀어서 나란히 비교

(이전 >= 0.21) AND (지금 < 0.21)  →  [F, T, F, F]  →  합계 1
```

즉 **"떠 있다가 감기는 순간"** 만 센다.

단순히 "감긴 프레임 수" 를 세면, 3초 동안 눈을 감고 있던 사람이 여러 번 깜빡인 것처럼
잡힌다. 그래서 이 방식을 쓴다.

```python
    blink_per_min = blink_count / duration_sec * 60.0
```

프레임 개수가 아니라 **실제 흐른 시간**으로 나눈다. 저사양 기기는 초당 2장밖에 못 뽑을
수 있는데, 프레임 수로 나누면 그 사람의 깜빡임이 부당하게 적게 나온다.

```python
    third = max(1, n // 3)
    ear_delta = float(ear[-third:].mean() - ear[:third].mean())
    dev_slope = float(np.polyfit(np.arange(n), deviation, 1)[0])
```

- `ear[:third]` = 앞 1/3, `ear[-third:]` = 뒤 1/3
- 둘을 빼면 "후반에 늘었나 줄었나"
- `np.polyfit(..., 1)` 은 점들에 직선을 맞추는 것. `[0]` 이 기울기다

**왜 필요한가**: 평균만 쓰면 "처음엔 떨었지만 안정됐다" 와 "처음엔 괜찮다가 무너졌다"
가 **똑같은 숫자**가 된다. 면접 피드백으로는 이 차이가 중요한데 모델이 볼 수가 없다.

```python
    if vector.shape[0] != FEATURE_DIM:
        raise RuntimeError(...)
```

조립을 잘못했으면 **조용히 넘어가지 않고 그 자리에서 터뜨린다.**
이런 실수는 나중에 발견하면 원인 찾기가 매우 어렵다.

---

## `core/face/predictor.py` — 숫자를 모델에 넣어 점수 얻기

```python
_model = None
_mean = None
_std = None

def _load():
    global _model, _mean, _std
    if _model is not None:
        return
    ...
```

파일 바깥에 변수를 두고 **처음 한 번만** 채운다. 모델 파일을 매 요청마다 읽으면 느리다.

```python
    x = (agg.vector - _mean) / np.maximum(_std, 1e-6)
```

**가장 실수하기 쉬운 부분이다.**

학습할 때 "이 항목들의 평균은 이거고 퍼짐은 이만큼" 을 계산해 저장해뒀다.
추론할 때도 **반드시 그때 저장한 값**으로 보정해야 한다.

지금 들어온 데이터로 다시 평균을 내면? 데이터가 하나뿐이라 평균 = 자기 자신이 되어
전부 0이 된다. 완전히 다른 값이 모델에 들어가 예측이 무의미해진다.

`np.maximum(_std, 1e-6)` 은 0으로 나누는 걸 막는 안전장치다.

```python
    tensor = torch.from_numpy(x).float().unsqueeze(0)
```

모델은 "여러 개를 한꺼번에" 받도록 만들어져 있다. 우리는 하나뿐이라
`(116,)` → `(1, 116)` 으로 껍데기를 하나 씌운다. `unsqueeze(0)` 가 그 역할이다.

```python
    with torch.no_grad():
        out = _model(tensor)
```

`no_grad()` = "학습용 준비 작업은 하지 마". 추론만 할 거라 메모리와 속도가 좋아진다.

`model.eval()` 은 `load_checkpoint` 안에서 이미 했다. 둘은 다른 것이고 **추론에는 둘 다
필요**하다.

- `eval()` : dropout(학습 중 뉴런을 무작위로 끄는 장치)을 끈다. 안 끄면 **같은 입력에
  매번 다른 답**이 나온다
- `no_grad()` : 속도/메모리 최적화

```python
    if _ckpt["loss_name"] == "bce":
        score = float(torch.sigmoid(out).squeeze().item())
    else:
        score = float(np.clip(out.squeeze().item(), 0.0, 1.0))
```

학습할 때 쓴 방식에 따라 후처리가 달라져야 한다. 사람이 기억해서 맞추면 반드시 틀리므로,
**모델 파일에 학습 방식을 같이 저장해두고 자동으로 분기**하게 만들었다.

---

## `core/voice/feature_extractor.py` — 소리를 숫자 38개로

```python
    y, sr = librosa.load(path, sr=settings.voice_sample_rate, mono=True)
```

- `sr=16000` : 1초에 16000번 기록하는 형태로 변환
- `mono=True` : 좌우 채널을 하나로 합침
- `y` : 소리의 파형이 숫자 배열로 들어온다

```python
    snd = parselmouth.Sound(path)   # ← 원본 그대로 다시 읽는다
```

**같은 파일을 두 번 읽는 게 의도한 동작이다.**

- librosa 쪽(16000Hz): 음색·음량 계산용. 학습에 쓴 teacher 모델과 조건을 맞추려고
- Praat 쪽(원본 48000Hz): 목소리 떨림 계산용

떨림은 주기 길이의 아주 미세한 변화(백만분의 50초 수준)를 재는데,
16000Hz 는 눈금 하나가 백만분의 62초라 **측정하려는 것보다 눈금이 크다.**
그래서 이쪽만 원본을 쓴다.

```python
    point_process = praat_call(snd, "To PointProcess (periodic, cc)", floor, ceiling)
```

성대가 닫히는 순간들의 목록을 만든다. 목소리 떨림은 "이 순간들 사이 간격이 얼마나
들쭉날쭉한가" 라서 이 목록이 반드시 필요하다.

```python
    jitter = _clean(praat_call(
        point_process, "Get jitter (local)", 0, 0, 0.0001, 0.02, 1.3))
```

숫자들의 뜻:
- `0, 0` : 전체 구간
- `0.0001, 0.02` : 유효한 주기 길이 범위
- `1.3` : 인접한 두 주기 길이가 1.3배 넘게 차이 나면 **계산에서 뺀다**.
  피치를 절반/두 배로 잘못 잡는 오류가 거대한 떨림으로 둔갑하는 걸 막는 장치

```python
def _clean(v) -> float:
    ...
    return 0.0 if (np.isnan(f) or np.isinf(f)) else f
```

Praat 은 계산이 불가능하면 NaN(숫자 아님)을 준다. NaN 은 **뭐랑 더해도 NaN** 이라
하나만 섞여도 모델 출력 전체가 망가진다. 반드시 걸러야 한다.

```python
    intervals = librosa.effects.split(y, top_db=30)
    pause_ratio = 1.0 - (voiced_len / max(len(y), 1))
    pause_count = max(0, len(intervals) - 1)
```

`split` 은 "소리가 있는 구간" 목록을 준다. 구간이 3개면 사이 간격은 2개 → 쉰 횟수 2회.

```python
    onsets = librosa.onset.onset_detect(y=y, sr=sr, units="frames")
    speech_rate = float(len(onsets) / max(duration, 1e-6))
```

정확한 음절 수를 세려면 음성인식(STT)이 필요하다. 대신 "소리가 새로 시작하는 지점" 개수를
음절 대용으로 쓴다. 절대값은 부정확하지만 **같은 방식끼리 비교**하는 데는 충분하다.

---

## `core/mlp.py` — 모델 구조

```python
layers.append(nn.Linear(prev, h))      # 숫자를 섞는다
layers.append(nn.BatchNorm1d(h))       # 값 크기를 고르게 만든다
layers.append(nn.ReLU())               # 음수를 0으로 (비선형)
layers.append(nn.Dropout(dropout))     # 학습 중 일부를 무작위로 끈다
```

**ReLU 가 왜 필요한가**: 없이 `Linear` 만 쌓으면 아무리 층을 쌓아도 결국 하나의 `Linear`
로 합쳐진다. 층을 쌓는 의미가 사라진다. 중간에 "구부러지는" 걸 넣어야 복잡한 관계를
배울 수 있다.

**Dropout 이 왜 필요한가**: 데이터가 적으면 모델이 이해하는 대신 외워버린다. 학습 중에
일부 뉴런을 무작위로 꺼서 "특정 몇 개에만 의존하지 못하게" 만든다.

```python
layers.append(nn.Linear(prev, out_dim))   # 마지막 층엔 활성함수 없음
```

마지막에 아무것도 안 붙이는 게 맞다. 붙일 거면 손실함수 쪽에서 처리하는 게 계산이
안정적이다.

---

## `training/trainer.py` — 학습 반복문

```python
for epoch in range(1, epochs + 1):
    for xb, yb in train_loader:
        optimizer.zero_grad()   # ①
        pred = model(xb)        # ②
        loss = criterion(pred, yb)  # ③
        loss.backward()         # ④
        optimizer.step()        # ⑤
```

이 5줄이 학습의 전부다.

1. **`zero_grad()`** — 지난번 계산 흔적을 지운다.
   파이토치는 흔적을 **쌓도록** 만들어져 있어서, 안 지우면 계속 누적되어 학습이
   엉뚱하게 흘러간다. **가장 많이 하는 실수다.**
2. **`model(xb)`** — 답을 내본다
3. **`criterion(...)`** — 정답과 얼마나 틀렸는지 잰다
4. **`backward()`** — "어느 손잡이를 어느 방향으로 돌려야 덜 틀릴지" 계산
5. **`step()`** — 실제로 손잡이를 돌린다

```python
        best_state = {k: v.detach().clone() for k, v in model.state_dict().items()}
```

`.clone()` 이 **반드시** 필요하다. 없으면 "가장 좋았던 시점" 을 저장한 게 아니라
그 값을 가리키는 이름표만 저장한 셈이 되고, 이후 학습이 그 값을 덮어써버린다.
결과적으로 마지막 상태가 저장되어 조기종료가 무의미해진다.

```python
    mean = X_train.mean(axis=0)
    std = np.maximum(X_train.std(axis=0), 1e-6)
```

**`X_train` 만 쓴다는 게 핵심이다.** 채점용으로 숨겨둔 데이터까지 포함해서 계산하면,
숨긴 데이터의 정보가 학습에 새어 들어가 점수가 실제보다 좋게 나온다.

```python
    if groups is not None:
        ... 그룹 단위로 나눈다
```

같은 사람이 찍은 영상이 학습용과 채점용에 나뉘어 들어가면, 모델이 긴장도가 아니라
**그 사람 얼굴을 외워서** 맞힐 수 있다. 사람 단위로 나눠야 "처음 보는 사람에게도
통하는가" 를 제대로 잰다.

---

# 3부. 리뷰 결과 — 발견한 문제

심각한 순서대로 정리했다.

> **✅ 아래 8개는 모두 반영 완료됐다(v0.3.0).**
> 어떤 문제였고 왜 그렇게 고쳤는지 기록으로 남겨둔다.
> 3번만은 구조적 한계라 완전 해결이 아니라 '피해를 가둔' 형태이므로 꼭 읽어둘 것.

## ✅ 🔴 1. 여러 요청이 동시에 올 때 모델 로딩이 꼬일 수 있다 — 수정됨

**위치**: `core/voice/predictor.py`, `core/face/predictor.py` 의 `_load()`

**문제**

```python
    _model = model        # ← 여기서 먼저 채워짐
    _mean = np.array(...)  # ← 아직 안 채워짐
    _std = np.array(...)
```

음성 분석은 **여러 스레드에서 동시에** 돌아간다(`asyncio.to_thread`).
두 요청이 같은 순간에 들어오면 이런 일이 생길 수 있다.

```
스레드 A: _model = model  실행
          (여기서 잠깐 멈춤)
스레드 B: "_model 이 채워져 있네? 로딩 끝났구나" → 그냥 진행
스레드 B: _mean 을 쓰려는데... 아직 None → 에러
```

**고치는 법** — 자물쇠를 걸고, 채우는 순서를 뒤집는다.

```python
import threading
_load_lock = threading.Lock()

def _load():
    global _model, _mean, _std
    if _model is not None:
        return
    with _load_lock:              # 한 번에 하나만 들어오게 한다
        if _model is not None:    # 기다리는 사이 다른 스레드가 끝냈을 수 있다
            return
        ...
        _mean = np.array(scaler["mean"], dtype=np.float32)
        _std = np.array(scaler["std"], dtype=np.float32)
        _model = model            # ← 맨 마지막에 채운다
```

`_model` 을 마지막에 채우는 게 핵심이다. 다른 스레드가 보는 신호등이기 때문이다.

## ✅ 🔴 2. 소리 파일 크기 제한이 없다 — 수정됨

**위치**: `api/routers/analysis.py :: analyze_voice()`

```python
    data = await file.read()   # 크기 제한 없이 통째로 메모리에 올린다
```

표정 쪽은 `max_face_frames` 로 막아뒀는데 음성 쪽엔 대응하는 장치가 없다.
누군가 2GB 파일을 보내면 서버 메모리가 터진다. 실수로 영상 파일을 통째로 보내는
경우에도 마찬가지다.

**고치는 법**

```python
# config.py
max_audio_bytes: int = 30 * 1024 * 1024   # 30MB (90초 오디오는 1MB 안팎)

# analysis.py
data = await file.read()
if len(data) > settings.max_audio_bytes:
    raise HTTPException(413, f"파일이 너무 큽니다({len(data)//1024//1024}MB)")
```

## ⚠️ 🟠 3. 시간 초과가 나도 작업이 실제로 멈추지 않는다 — 완화만 함

**위치**: `analysis.py` 의 `asyncio.wait_for(asyncio.to_thread(...))`

**문제**: 파이썬은 실행 중인 스레드를 강제로 죽일 수 없다.
`wait_for` 는 "기다리기를 포기" 할 뿐, 스레드는 계속 돈다.

```
120초 초과 → BE 에는 504 응답
             하지만 그 분석은 백그라운드에서 계속 CPU 를 먹는다
             세마포어 자리는 반납되어 새 요청이 들어옴
             → 실제로는 3개, 4개가 동시에 도는 상태가 됨
```

Celery 는 프로세스를 죽여서 이걸 해결했는데, 지금 구조에는 그 수단이 없다.

**적용한 대응 (완전 해결은 아니다)**

파이썬으로는 이 문제를 완전히 없앨 수 없다. 대신 **피해 범위를 가뒀다.**

```python
_voice_executor = ThreadPoolExecutor(
    max_workers=settings.voice_concurrency,   # 일할 수 있는 스레드 개수를 못 박음
    thread_name_prefix="voice-analysis",
)
```

전용 스레드 묶음을 만들고 개수를 `voice_concurrency` 로 고정했다. 이렇게 하면
멈춘 작업이 스레드를 계속 붙잡고 있어도 **새 작업이 그 위에 얹혀 돌지 못한다.**
CPU 사용량이 정해진 선을 넘지 않으므로 화상면접이 죽는 최악의 상황은 막는다.

대신 멈춘 작업이 쌓이면 새 요청이 처리되지 못하고 대기하게 된다. CPU 가 녹는 것보다는
낫다는 판단이다. 시간 초과 로그를 남겨뒀으니 **이 로그가 반복되면 조사해야 한다.**

```
[voice][42-3] 시간 초과 (120초) - 해당 작업은 백그라운드에서 계속 실행됩니다
```

완전 해결이 필요하면 스레드 대신 별도 프로세스(`ProcessPoolExecutor`)로 돌리면 된다.
프로세스는 강제 종료가 가능하다. 대신 데이터를 프로세스 간에 복사해야 해서 구조가
복잡해지고, 모델도 프로세스마다 따로 올라간다. 지금 단계에서는 과하다고 봤다.

## ✅ 🟠 4. 답변 길이를 클라이언트 말만 믿는다 — 수정됨

**위치**: `core/face/aggregator.py`

```python
blink_per_min = blink_count / duration_sec * 60.0
```

`duration_sec` 은 브라우저가 보낸 값이다. 프론트에 버그가 있어서 450프레임인데
`duration_sec=1.0` 을 보내면, 분당 깜빡임이 수천 회로 계산되어 모델에 들어간다.
에러는 안 나고 **점수만 이상해진다.**

**고치는 법** — 프레임 수로 계산한 길이와 크게 다르면 거부한다.

```python
expected = len(payload.frames) / payload.fps
if not (0.5 * expected <= payload.duration_sec <= 3.0 * expected):
    raise ValueError(
        f"duration_sec({payload.duration_sec:.1f})과 프레임 수로 계산한 길이"
        f"({expected:.1f})가 너무 다릅니다")
```

얼굴이 안 잡힌 프레임은 버려지므로 여유를 넉넉히 뒀다.

## ✅ 🟡 5. `api/main.py` 설명이 옛날 내용이다 — 수정됨

```python
  음성: ... 수 초가 걸리므로 Celery 워커가 백그라운드로 처리하고 BE 는 폴링한다.
```

동기 방식으로 바꿨는데 설명이 안 바뀌었다. 다음 사람이 읽으면 헷갈린다.

또 33~34줄의 "음성 모델은 worker 프로세스에서 로드된다" 도 이제 사실이 아니다.
지금은 api 프로세스에서 로드된다.

## ✅ 🟡 6. 로그에 누구 요청인지 안 남는다 — 수정됨

요청이 여러 개 동시에 들어오면 로그가 이렇게 섞인다.

```
[voice] 분석 시작 (.webm, 812.3KB)
[voice] 분석 시작 (.webm, 934.1KB)
[voice] 분석 완료          ← 둘 중 어느 것?
```

**고치는 법**: 선택 항목으로 식별자를 받아 로그에 넣는다.

```python
async def analyze_voice(
    file: UploadFile = File(...),
    interview_id: str | None = Form(None),
):
    logger.info("[voice][%s] 분석 시작 (%s, %.1fKB)",
                interview_id or "-", suffix, len(data) / 1024)
```

## ✅ 🟡 7. "분석 시작" 로그가 자리 잡기 전에 찍힌다 — 수정됨

```python
logger.info("[voice] 분석 시작 ...")   # ← 여기
async with _voice_semaphore:           # ← 실제 시작은 여기
```

10개가 대기 중이어도 로그엔 10개 다 "시작" 으로 보인다.
`async with` 안쪽으로 옮기거나, "접수" / "시작" 을 나누는 게 좋다.

## ✅ 🟢 8. 임시 파일이 아주 드물게 남을 수 있다 — 수정됨

```python
with tempfile.NamedTemporaryFile(...) as tmp:
    tmp.write(data)      # 여기서 실패하면 (디스크 꽉 참 등)
    tmp_path = tmp.name
try:
    ...
finally:
    unlink(tmp_path)     # 여기까지 못 온다
```

`tmp_path` 를 먼저 정하고 `try` 를 위로 올리면 해결된다. 발생 확률은 낮다.

---

# 잘 되어 있는 부분

리뷰하면서 확인한, 유지할 가치가 있는 결정들.

- **`core/` 를 학습과 추론이 공유** — 이게 이 프로젝트에서 가장 잘한 구조 결정이다.
  집계 방식이 어긋나서 생기는 버그는 찾기가 극도로 어려운데, 애초에 갈라질 수가 없다.
- **차원 검사를 세 곳에 걸어둠** — 집계 직후, 모델 로딩 시, 응답 스키마.
  집계 방식을 바꾸고 재학습을 잊으면 서버 시작 직후 바로 잡힌다.
- **학습 방식을 모델 파일에 함께 저장** — `loss_name` 을 보고 후처리를 자동 분기하므로
  사람이 기억할 필요가 없다.
- **에러를 종류별로 다른 코드로 응답** — 400/413/503/504/500 구분이 명확해서
  BE 로그만 봐도 원인을 좁힐 수 있다.
- **NaN 방어** — Praat 출력에 `_clean`, 최종 벡터에 `nan_to_num`. 이중으로 막아뒀다.
- **주석이 "무엇" 이 아니라 "왜" 를 설명** — 코드만 봐도 알 수 있는 건 안 쓰고,
  판단의 근거를 남겼다.


---

# 부록. v0.3.0 에서 실제로 바뀐 것

| 파일 | 변경 |
|---|---|
| `core/face/predictor.py` | 자물쇠 추가, `_model` 을 마지막에 채우도록 순서 변경 |
| `core/voice/predictor.py` | 위와 동일 |
| `core/face/aggregator.py` | `duration_sec` 이 프레임 수와 맞는지 검사 추가 |
| `api/routers/analysis.py` | 파일 크기 제한(413), 전용 스레드 묶음, `request_id`, 로그 분리, 임시파일 처리 개선 |
| `api/main.py` | 낡은 설명 전면 수정, 버전 0.3.0 |
| `config.py` | `max_audio_bytes` 추가 |
| `tests/` | 새 검증 3건에 대한 테스트 추가 |

## 확인한 것

```
tests/test_aggregator.py   10항목 통과 (duration 검증 포함)
tests/test_api.py          11항목 통과 (413, request_id 포함)
동시 로딩 시뮬레이션        스레드 30개 → 로딩 1회, 오류 0건
OpenAPI 생성               엔드포인트 7개 정상
```
