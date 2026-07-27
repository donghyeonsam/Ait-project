# CLOVA Speech(STT) + CLOVA Voice(TTS) 고도화 계획

> AI 모의면접의 음성 처리(STT/TTS)를 브라우저 API에서 Naver Cloud CLOVA 기반으로 고도화하는 구현 계획 문서.

## 1. 배경 및 현재 상태

현재 음성 처리는 전부 브라우저 API에 의존한다.

| 구분 | 현재 구현 | 문제점 |
|---|---|---|
| STT | `SpeechRecognition` (`fe/src/components/interview/useVoiceAnswer.ts`) | Chrome 계열만 지원, 정확도 편차 큼 |
| TTS | `speechSynthesis` (`fe/src/components/interview/useQuestionSpeech.ts`) | 기기별 음질 편차 큼 |
| 녹음 | `MediaRecorder`로 Blob 생성 | 서버로 전송되지 않고 버려짐 |

## 2. 확정 방향

1. **STT: Clova 배치 단독** — 브라우저 SpeechRecognition 완전 제거. 답변 녹음 종료 후 Blob을 업로드해 **CLOVA Speech 장문 인식 API**(completion=sync)로 전사. 답변 중 실시간 자막은 제공하지 않음. (CSR API는 60초 제한이라 면접 답변에 부적합 → 미사용)
2. **연동 위치: AI(FastAPI) 서비스** — 기존 아키텍처(FE → BE → AI, FE는 AI 직접 호출 금지) 유지. BE는 중계 엔드포인트만 추가.
3. **TTS: CLOVA Voice Premium 온디맨드 + 클라이언트 캐시** — 질문 표시 시 mp3 생성·재생, 같은 질문은 캐시 재사용, 실패 시 speechSynthesis 폴백.

### 데이터 흐름

```
[STT] FE 녹음 Blob
  → POST /backend/api/ai-interviews/speech/stt (multipart)
  → BE 중계 → AI POST /api/v1/speech/stt
  → CLOVA Speech {invoke_url}/recognizer/upload (completion=sync)
  → 전사 텍스트 JSON으로 역방향 반환

[TTS] FE 질문 텍스트
  → POST /backend/api/ai-interviews/speech/tts (JSON)
  → BE 중계 → AI POST /api/v1/speech/tts
  → CLOVA Voice Premium → AI가 audio/mpeg 바이트 반환
  → BE가 base64 JSON으로 FE에 반환 → FE가 Blob 변환 후 <audio> 재생
```

> TTS를 base64 JSON으로 반환하는 이유: FE의 `backendRequest`(ApiResponse unwrap·Bearer·401 재발급)가 전부 JSON 전제라 바이너리 스트리밍보다 단순하고, 질문 1개 mp3는 수십 KB라 base64 오버헤드(+33%)가 무시 가능.

### 작업 순서

**Stage 1(AI) → Stage 2(BE) → Stage 3(FE)** — 각 단계가 curl로 독립 검증 가능하고, Stage 1에서 webm 포맷 go/no-go를 먼저 판정한다.

---

## 3. Stage 1 — AI 서비스 (FastAPI)

### 3.1 설정
- `ai/config.py` `Settings`에 추가:
  - `clova_speech_invoke_url`, `clova_speech_secret` (X-CLOVASPEECH-API-KEY)
  - `clova_voice_client_id`, `clova_voice_client_secret` (X-NCP-APIGW-API-KEY-ID/-KEY)
  - `clova_voice_url` (기본 `https://naveropenapi.apigw.ntruss.com/tts-premium/v1/tts`)
  - `clova_voice_speaker`(기본 `vdain`), `clova_voice_speed=0`, `clova_voice_format="mp3"`
  - `clova_stt_timeout=120.0`, `clova_tts_timeout=30.0`
- `ai/.env.example`에 CLOVA 섹션 추가 (시크릿 4개 + 선택 오버라이드)
- `ai/requirements.txt`: **`python-multipart` 추가 필수** (FastAPI `UploadFile` 파싱에 필요, 현재 없음)

### 3.2 Clova 클라이언트 — 신규 `ai/core/clova_client.py`
`ai/core/gms_client.py` 구조 미러링 (단일 예외 클래스, tenacity 재시도, 하단 싱글턴):
- `ClovaError(Exception)` — 라우터가 잡는 유일한 예외 (→ HTTP 502), `GMSError`와 동일 계약
- `ClovaSpeechClient.recognize(audio: bytes, filename, content_type) -> str`
  - `POST {invoke_url}/recognizer/upload`, httpx multipart: `media` 파일 + `params` JSON(`{"language":"ko-KR","completion":"sync","fullText":true}`)
  - 응답 `result == "COMPLETED"`이면 `text` 반환, 아니면 Clova `message` 포함 `ClovaError`
- `ClovaVoiceClient.synthesize(text, *, speaker, speed, fmt) -> bytes` — form-urlencoded body, `resp.content` 반환
- 재시도: gms_client와 동일하되 **STT는 4xx 재시도 금지** (수 MB 업로드를 결정적 400에 재전송하는 낭비 방지) — TransportError + 5xx만 재시도

### 3.3 스키마/라우터 — 신규 `ai/schemas/speech.py`, `ai/routers/speech.py`
- `SttResponse: {text: str}` / `TtsRequest: {text: 1~2000자, speaker?, speed?}`
- `APIRouter(prefix="/api/v1/speech")`, 에러 처리는 `ai/routers/interview.py` 패턴 복사:
  - `POST /stt` — `UploadFile`, 빈 파일/50MB 초과 → 400, 성공 시 `SttResponse`, `ClovaError` → 502, 기타 → 500
  - `POST /tts` — `TtsRequest`, 성공 시 `Response(content=mp3, media_type="audio/mpeg")`
- `ai/main.py`에 라우터 등록

### 3.4 테스트 — 신규 `ai/tests/test_speech_router.py`
- pytest + pytest-asyncio 추가 (dev 의존성). Clova 클라이언트를 mock — 실제 Clova 호출 금지
- 케이스: STT multipart 성공 / 파일 누락 422 / ClovaError 502 / TTS audio-mpeg 반환 / 2000자 초과 422
- 주의: `main.app` import 시 Chroma/임베딩 lifespan 로딩 → speech 라우터만 include한 최소 `FastAPI()`로 테스트

### 3.5 Stage 1 검증 (webm go/no-go 게이트)
```bash
curl -F "media=@sample.webm" http://localhost:8000/api/v1/speech/stt
# → 한국어 전사 텍스트 기대

curl -X POST http://localhost:8000/api/v1/speech/tts \
  -H "Content-Type: application/json" -d '{"text":"자기소개를 해주세요"}' -o out.mp3
# → out.mp3 재생 확인
```
- **최대 리스크: CLOVA Speech의 webm/opus 컨테이너 수용 여부** (공식 포맷 목록에 webm 명시 없음). 거부되거나 빈 전사가 오면: `ai/Dockerfile`에 ffmpeg 설치 + `routers/speech.py`에서 subprocess로 mp3 변환 후 전달 (FE/BE 계약 불변). 통과하면 스킵.

---

## 4. Stage 2 — BE (Spring Boot)

### 4.1 신규 패키지 `be/.../speech/` (`aiInterview` 레이아웃 미러)
- **Controller** `speech/controller/SpeechController.java` — `@RequestMapping("/api/ai-interviews/speech")`
  - `POST /stt`: `@AuthenticationPrincipal Long userId`, `@RequestPart("media") MultipartFile` → `ApiResponse<SttResponse>`
  - `POST /tts`: `@RequestBody @Valid TtsRequest`(`@NotBlank @Size(max=2000)`) → `ApiResponse<TtsResponse>`
- **DTO**: `SttResponse(String text)`, `TtsRequest(String text)`, `TtsResponse(String audioBase64, String format)`, 내부용 `FastSttResponse(String text)`
- **Service** `SpeechService` + `SpeechServiceImpl` — `fastApiRestClient` 주입:
  - `transcribe`: `MultipartBodyBuilder`로 `builder.part("media", media.getResource())` (원본 filename 보존), 요청별 `.contentType(MediaType.MULTIPART_FORM_DATA)`로 기본 JSON 헤더 오버라이드, 에러 → `BusinessException(ErrorCode.STT_FAILED)`
  - `synthesize`: JSON `{text}` 전송 → `.body(byte[].class)` 수신 → Base64 인코딩, 에러 → `TTS_FAILED`

### 4.2 공통 변경
- `global/exception/ErrorCode.java` 추가:
  - `STT_FAILED(500, "SPEECH_001", "음성 인식 처리 중 오류가 발생했습니다.")`
  - `TTS_FAILED(500, "SPEECH_002", "질문 음성 생성 중 오류가 발생했습니다.")`
  - `INVALID_AUDIO_FILE(400, "SPEECH_003", "유효하지 않은 음성 파일입니다.")`
- `global/config/RestClientConfig.java`: 로깅 인터셉터가 요청 body를 통째로 문자열 로깅 중 → **multipart일 때 body 길이만 로깅** (수 MB 바이너리 로그 방지)
- `application.yaml`: `spring.servlet.multipart.max-file-size: 20MB`, `max-request-size: 25MB`
- Security 변경 불필요 (`permitAll` + JWT 필터로 principal 주입되는 기존 구조)

### 4.3 Stage 2 검증
BE+AI 기동, JWT 발급 후 curl로 `/api/ai-interviews/speech/stt`(multipart) → `ApiResponse{data:{text}}`, `/tts` → base64 디코드 재생. AI 컨테이너 중단 후 SPEECH_001/002 에러 응답 확인.

---

## 5. Stage 3 — FE (React)

### 5.1 신규 API 모듈 `fe/src/api/speech.ts` (+ `speech.test.ts`)
`ai-interviews.ts`는 무변경 (기존 테스트 유지):
- `transcribeAnswer(audio: Blob, {signal?})`: `FormData`에 `form.append('media', audio, 'answer.webm'|'answer.mp4')`(Blob mime에서 파일명 추론) → `backendRequest<{text}>()`
  - `http.ts:92`가 FormData면 JSON Content-Type을 건너뛰므로 그대로 동작 (검증 완료)
- `synthesizeQuestionSpeech(text)` → `backendRequest<{audioBase64, format}>()`
- `ttsResponseToBlob(res)`: base64 → `Blob({type:'audio/mpeg'})`

### 5.2 `useVoiceAnswer.ts` 재작성
- **제거**: SpeechRecognition 전체, `interimTranscript`, `recognitionSupported`, `appendTranscript` (미사용화되면 `fe/src/types/web-speech.d.ts`도 정리)
- **유지**: `getSupportedAudioMimeType`, status 머신(`idle|recording|processing|review|error`), generation guard 패턴
- **새 흐름**: `stopRecording` → `processing` → `recorder.onstop`에서 Blob 생성 → `transcribeAnswer(blob)` (AbortController ref 보관)
  - 성공: `setTranscript(text)` + `setAudioBlob(blob)` → `review`
  - 실패: **`review`로 진입** + `audioBlob` 유지 + 에러 메시지 — Clova 장애가 면접을 dead-end시키지 않도록 수동 입력 escape hatch 보존. `retryTranscription()` 노출 (보관된 Blob 재전송)
- `reset()`에 진행 중 전사 요청 abort 추가

### 5.3 소비자 업데이트
- `VoiceAnswerPanel.tsx`: `interimTranscript`·`recognitionSupported` props/분기 제거, `processing` 문구 "답변을 텍스트로 변환하고 있어요…", `review`+에러 시 재시도 버튼
- `InterviewSessionPage.tsx`: 제거된 props 정리, `retryTranscription` 전달. 답변 저장/followup TODO는 이번 범위 밖

### 5.4 `useQuestionSpeech.ts` 재작성
공개 API(`{isSpeaking, error, replay}`, options `{text, volume, muted, enabled}`) 동일 유지 → 페이지 시그니처 무변경:
- `cacheRef: Map<질문텍스트, objectURL>`, 단일 `Audio` 엘리먼트 재사용, generation guard로 fetch 중 질문 전환 방지
- 캐시 히트 → 즉시 재생 / 미스 → `synthesizeQuestionSpeech` → `URL.createObjectURL` → 캐시 → 재생. `audio.volume = volume/100` (재생 중 슬라이더 변경 즉시 반영)
- `audio.play()` 거부(첫 질문 autoplay 차단) 시 "질문 다시 듣기" 유도 소프트 에러 — replay 클릭은 user gesture라 성공
- **폴백**: TTS API 실패 시 기존 speechSynthesis 경로(`speakWithSynthesis()`로 추출) 실행
- unmount 시 pause + 캐시의 objectURL 전부 revoke

### 5.5 FE 테스트 업데이트
- `useVoiceAnswer.test.ts`: SpeechRecognition mock 삭제, `vi.mock('@/api/speech')`. stop→processing→resolve→review / 실패→review+에러+retry / in-flight 중 reset 시 idle 유지
- `useQuestionSpeech.test.ts`: `Audio` 스텁 + `URL.createObjectURL/revokeObjectURL` 스텁. fetch→재생 / 동일 텍스트 캐시(API 1회) / TTS 실패→폴백 / muted pause / unmount revoke
- `ai-interviews.test.ts`: 무변경

---

## 6. 최종 검증 (E2E)

1. `ai/`: pytest 통과 + 실제 키 curl 검증 (webm 게이트)
2. `be/`: 빌드 + curl 중계 검증 + AI 다운 시 에러코드 확인
3. `fe/`: `npm run test`, 타입체크, 브라우저 E2E
   - 면접 시작 → 질문 mp3 재생 (네트워크 탭에서 유니크 질문당 `/tts` 1회, replay는 무요청)
   - 녹음 → 정지 → 변환 스피너 → Clova 전사 결과 편집 가능 → 제출
   - AI 컨테이너 중단 상태에서 TTS 폴백·STT 재시도/수동입력 동작 확인

## 7. 리스크 요약

| 리스크 | 대응 |
|---|---|
| CLOVA Speech의 webm/opus 미지원 | Stage 1 curl로 최우선 판정; 실패 시 AI 컨테이너에 ffmpeg 변환 추가 (FE/BE 계약 불변) |
| sync STT 지연 (오디오 길이에 비례) | AI 120s / BE read 180s 타임아웃으로 커버, FE `processing` UI. 3분+ 답변 상시화 시 async+폴링 재검토 |
| TTS 2000자 제한 | FE(질문 짧음)·BE `@Size`·AI pydantic 3중 검증 |
| autoplay 차단 | replay 버튼(user gesture) 복구 경로 |
| Clova 과금 | TTS 클라이언트 캐시로 유니크 질문당 1회, STT 답변당 1회로 상한 |
| 시크릿 관리 | 키 전부 `ai/.env`(gitignore)만; BE/FE 미노출 |

## 8. 사전 준비 (코드 외)

Naver Cloud 콘솔에서 다음이 선행되어야 한다.

1. **CLOVA Speech** 도메인 생성 (장문 인식) → Invoke URL + Secret Key 발급
2. **CLOVA Voice Premium** 이용 신청 → Client ID / Client Secret 발급
