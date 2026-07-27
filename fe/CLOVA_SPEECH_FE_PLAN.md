# CLOVA Speech(STT) + CLOVA Voice(TTS) — FE 작업 계획서

> 루트 `CLOVA_SPEECH_PLAN.md`의 **Stage 3 (FE)** 를 실제 코드 기준으로 구체화한 프론트엔드 실행 계획.
> 전제: Stage 1(AI), Stage 2(BE)가 완료되어 아래 두 엔드포인트가 동작한다.
>
> - `POST /backend/api/ai-interviews/speech/stt` (multipart, part 이름 `media`) → `ApiResponse<{ text: string }>`
> - `POST /backend/api/ai-interviews/speech/tts` (JSON `{ text }`) → `ApiResponse<{ audioBase64: string, format: string }>`

## 0. 변경 요약

| 구분 | 파일 | 작업 |
|---|---|---|
| 신규 | `src/api/speech.ts` | STT/TTS API 모듈 |
| 신규 | `src/api/speech.test.ts` | API 모듈 테스트 |
| 재작성 | `src/components/interview/useVoiceAnswer.ts` | SpeechRecognition 제거 → Clova STT 배치 전사 |
| 재작성 | `src/components/interview/useQuestionSpeech.ts` | speechSynthesis → Clova TTS mp3 재생 + 캐시 + 폴백 |
| 수정 | `src/components/interview/VoiceAnswerPanel.tsx` | `interimTranscript`·`recognitionSupported` 제거, 재시도 버튼 추가 |
| 수정 | `src/pages/InterviewSessionPage.tsx` | 제거된 props 정리, `retryTranscription` 전달 |
| 수정 | `src/components/interview/useVoiceAnswer.test.ts` | Clova 흐름 기준으로 재작성 |
| 수정 | `src/components/interview/useQuestionSpeech.test.ts` | Audio/objectURL 스텁 기준으로 재작성 |
| 정리 | `src/types/web-speech.d.ts` | SpeechRecognition 참조가 전부 사라지면 삭제 |
| 무변경 | `src/api/ai-interviews.ts`(+test), `src/api/http.ts` | 기존 계약 유지 |

작업 순서는 **1) API 모듈 → 2) useVoiceAnswer → 3) VoiceAnswerPanel/페이지 → 4) useQuestionSpeech → 5) 테스트/정리** 순서를 권장한다. 각 단계가 독립적으로 타입체크·테스트 가능하다.

---

## 1. 신규 API 모듈 — `src/api/speech.ts`

`ai-interviews.ts`와 같은 결로 `backendRequest` 기반으로 작성한다. `ai-interviews.ts`는 건드리지 않는다(기존 테스트 유지 목적).

```ts
import { backendRequest } from '@/api/http'

export interface SttResponse {
  text: string
}

export interface TtsResponse {
  audioBase64: string
  format: string
}

interface TranscribeOptions {
  signal?: AbortSignal
}

// Blob mime에서 업로드 파일명을 추론한다 (Clova가 확장자로 컨테이너를 판별).
function inferFilename(blob: Blob) {
  return blob.type.includes('mp4') ? 'answer.mp4' : 'answer.webm'
}

// 답변 녹음 Blob을 BE 중계 경유로 Clova STT에 보내 전사 텍스트를 받는다.
export function transcribeAnswer(audio: Blob, { signal }: TranscribeOptions = {}) {
  const form = new FormData()
  form.append('media', audio, inferFilename(audio))
  return backendRequest<SttResponse>('/api/ai-interviews/speech/stt', {
    method: 'POST',
    body: form,
    signal,
  })
}

// 질문 텍스트를 Clova TTS mp3(base64)로 변환한다.
export function synthesizeQuestionSpeech(text: string, { signal }: TranscribeOptions = {}) {
  return backendRequest<TtsResponse>('/api/ai-interviews/speech/tts', {
    method: 'POST',
    body: JSON.stringify({ text }),
    signal,
  })
}

// base64 응답을 <audio>에서 재생 가능한 Blob으로 변환한다.
export function ttsResponseToBlob(res: TtsResponse): Blob {
  const binary = atob(res.audioBase64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: 'audio/mpeg' })
}
```

검증 포인트:

- `http.ts:92`에서 `body instanceof FormData`이면 `Content-Type`을 설정하지 않으므로 브라우저가 boundary 포함 multipart 헤더를 자동 부여한다 — **수동으로 `Content-Type: multipart/form-data`를 넣으면 안 된다** (boundary 누락으로 BE 파싱 실패).
- Bearer 토큰·401 재발급·`ApiResponse` unwrap은 `backendRequest`가 처리하므로 모듈에서 신경 쓸 것 없음.

---

## 2. `useVoiceAnswer.ts` 재작성

### 2.1 제거

- `SpeechRecognition` 관련 전부: `recognitionRef`, `recognitionSupported`, `interimTranscript`, `appendTranscript`, `window.SpeechRecognition ?? window.webkitSpeechRecognition` 분기, recognition 이벤트 핸들러
- 반환값에서 `interimTranscript`, `recognitionSupported` 삭제

### 2.2 유지

- `getSupportedAudioMimeType()`과 `AUDIO_MIME_TYPES` (webm/opus → webm → mp4 우선순위)
- status 머신: `idle | recording | processing | review | error` (타입 변경 없음)
- `generationRef` guard 패턴 — 전사 요청까지 이 generation으로 보호
- MediaRecorder 셋업, `recorder.start(250)` 청크 수집, 마이크 트랙 검사·에러 메시지

### 2.3 새 흐름

```
startRecording ──▶ recording ──stopRecording──▶ processing
                                                  │ recorder.onstop → Blob 생성
                                                  │ transcribeAnswer(blob)
                                    성공 ─────────┤ setTranscript(text) + setAudioBlob(blob) → review
                                    실패 ─────────┘ setAudioBlob(blob) + error 메시지 → review  ← dead-end 금지
```

핵심 구현 사항:

- `abortRef = useRef<AbortController | null>(null)` 추가. 전사 요청 직전 생성, `reset()`과 unmount cleanup에서 `abort()`.
- 전사 함수를 내부 헬퍼로 추출해 `retryTranscription()`에서 재사용:

```ts
const runTranscription = useCallback(async (blob: Blob, generation: number) => {
  abortRef.current?.abort()
  const controller = new AbortController()
  abortRef.current = controller
  setStatus('processing')
  setError(null)
  try {
    const { text } = await transcribeAnswer(blob, { signal: controller.signal })
    if (generationRef.current !== generation) return
    setTranscript(text)
    setStatus('review')
  } catch (err) {
    if (generationRef.current !== generation) return
    if (err instanceof DOMException && err.name === 'AbortError') return
    // 실패해도 review로 진입시켜 수동 입력 escape hatch를 보존한다.
    setStatus('review')
    setError('음성을 텍스트로 변환하지 못했습니다. 다시 시도하거나 답변을 직접 입력해주세요.')
  }
}, [])
```

- `recorder.onstop`: Blob 생성 → `setAudioBlob(blob)` → `void runTranscription(blob, generation)`. (기존처럼 바로 `review`로 가지 않는다.)
- `retryTranscription()`: `status === 'review' && audioBlob`일 때만 보관된 Blob으로 `runTranscription` 재실행. 반환 객체에 추가.
- `reset()`: 기존 정리 + `abortRef.current?.abort()`.
- abort 에러(`AbortError`)는 사용자에게 노출하지 않고 조용히 무시 — reset/unmount 경로에서 발생.

### 2.4 반환 시그니처 (변경 후)

```ts
return {
  status,
  transcript,
  audioBlob,
  error,
  setTranscript,
  startRecording,
  stopRecording,
  retryTranscription,   // 신규
  reset,
}
```

---

## 3. 소비자 업데이트

### 3.1 `VoiceAnswerPanel.tsx`

- props에서 `interimTranscript`, `recognitionSupported` 제거. 신규 props: `onRetryTranscription: () => void`, `canRetryTranscription: boolean`.
- `interimTranscript` 표시 블록(현재 123~127행) 삭제.
- `processing` 문구를 "답변을 텍스트로 변환하고 있어요…"로 변경 (기존: "녹음 파일과 음성 인식 결과를 정리하고 있습니다.").
- Textarea placeholder를 단일 문구로 통일: "인식된 답변을 확인하고 필요한 부분을 수정해주세요." (`recognitionSupported` 분기 제거).
- `review` 상태 + `error` 존재 + `audioBlob` 존재 시 에러 영역에 **"변환 다시 시도" secondary 버튼** 추가 → `onRetryTranscription`. (Primary는 답변 제출 버튼 하나 유지 — 화면당 Primary 1개 규칙.)
- 안내 문구 정리: "브라우저 음성 인식 사용 시 해당 브라우저 제공업체의 처리 정책이 적용될 수 있습니다." → 녹음 파일이 음성 인식 처리를 위해 서버로 전송된다는 사실에 맞게 수정. 예: "녹음 파일은 음성 인식 처리를 위해 서버로 전송되며, 별도로 저장되지 않습니다."

### 3.2 `InterviewSessionPage.tsx`

- `VoiceAnswerPanel`에 넘기던 `interimTranscript`·`recognitionSupported` 제거, `onRetryTranscription={voiceAnswer.retryTranscription}`, `canRetryTranscription={Boolean(voiceAnswer.audioBlob)}` 전달.
- `primaryActionDisabled`·`handlePrimaryAction`·space 키 처리 로직은 status 타입이 그대로라 무변경.
- 답변 저장/followup 연동 TODO(311행)는 이번 범위 밖 — 주석 유지.

### 3.3 `src/types/web-speech.d.ts`

`AitSpeechRecognition`, `window.SpeechRecognition` 참조가 코드베이스에서 전부 사라졌는지 grep으로 확인 후 파일 삭제. (테스트 mock에서도 제거되므로 삭제 가능해야 정상.)

---

## 4. `useQuestionSpeech.ts` 재작성

공개 API를 그대로 유지해 페이지 시그니처를 바꾸지 않는다:
`useQuestionSpeech({ text, volume, muted, enabled })` → `{ isSpeaking, error, replay }`

### 4.1 구조

```ts
const cacheRef = useRef<Map<string, string>>(new Map())   // 질문 텍스트 → objectURL
const audioRef = useRef<HTMLAudioElement | null>(null)    // 단일 Audio 엘리먼트 재사용
const generationRef = useRef(0)
```

### 4.2 재생 흐름 (`speak`)

1. generation 증가, 재생 중 오디오 pause, `setError(null)`. `muted || !enabled`면 종료.
2. **캐시 히트**: `cacheRef.current.get(text)` 있으면 즉시 해당 URL로 재생 (네트워크 요청 없음).
3. **캐시 미스**: `synthesizeQuestionSpeech(text)` → `ttsResponseToBlob` → `URL.createObjectURL` → 캐시에 저장 → 재생. fetch 완료 시 generation 검사(응답 대기 중 질문이 넘어간 경우 재생하지 않되 **캐시에는 저장** — 다음 히트 대비).
4. 재생 직전 `audio.volume = Math.min(1, Math.max(0, volume / 100))`. `isSpeaking`은 `play` 성공/`ended`/`pause` 이벤트로 토글.
5. `audio.play()` rejection 처리:
   - **NotAllowedError**(autoplay 차단, 주로 첫 질문): "질문 다시 듣기를 눌러 질문을 들어주세요." 소프트 에러. replay 클릭은 user gesture라 성공한다.
   - 그 외 실패 및 **TTS API 실패**: `speakWithSynthesis()` 폴백 실행.
6. **폴백 `speakWithSynthesis(text)`**: 기존 speechSynthesis 구현을 별도 함수로 추출해 유지 (utterance 생성, generation guard, `isSpeaking` 이벤트, ko-KR). 폴백조차 불가하면 기존 에러 문구 노출.

### 4.3 반응형 동작

- `volume` 변경: 재생 중이면 `audioRef.current.volume` 즉시 반영 (별도 effect).
- `muted` true 전환: pause + `setIsSpeaking(false)` (기존 effect 패턴 유지).
- `text`/`enabled` 변경: 기존처럼 `setTimeout(speak, 0)` effect 유지 — 질문 전환 시 자동 재생.
- unmount: pause + `cacheRef`의 objectURL 전부 `URL.revokeObjectURL` 후 Map clear.

### 4.4 과금 상한 확인 기준

유니크 질문당 `/tts` 1회. replay·재렌더·volume 변경은 추가 요청 0회 — 네트워크 탭과 테스트 양쪽에서 검증한다.

---

## 5. 테스트

실행: `npm run test` (Vitest). API mock은 `vi.mock('@/api/speech')`로 통일 — fetch 레벨 mock 금지 (http.ts 계약은 `speech.test.ts`에서만 검증).

### 5.1 신규 `src/api/speech.test.ts`

`my-page.test.ts`/`ai-interviews.test.ts`의 fetch 스텁 패턴을 따른다.

- `transcribeAnswer`: FormData body로 호출되고 `media` part 파일명이 mime에 따라 `answer.webm`/`answer.mp4`로 추론되는지, `Content-Type` 헤더를 직접 설정하지 않는지
- `synthesizeQuestionSpeech`: JSON body `{ text }` 전송, `data` unwrap 확인
- `ttsResponseToBlob`: base64 → Blob 크기·`audio/mpeg` 타입 확인

### 5.2 `useVoiceAnswer.test.ts` 재작성

SpeechRecognition mock 전부 삭제. MediaRecorder mock은 유지.

| 케이스 | 기대 |
|---|---|
| stop → onstop | `processing` 진입, `transcribeAnswer` 1회 호출 |
| 전사 성공 | `transcript` 반영 + `review` |
| 전사 실패 | `review` 진입 + `audioBlob` 유지 + `error` 메시지 |
| 실패 후 `retryTranscription()` | 같은 Blob으로 재호출, 성공 시 에러 해제 |
| in-flight 중 `reset()` | abort 호출, 이후 resolve돼도 `idle` 유지·상태 오염 없음 |

### 5.3 `useQuestionSpeech.test.ts` 재작성

`Audio` 생성자 스텁(이벤트 수동 트리거 가능하게) + `URL.createObjectURL/revokeObjectURL` 스텁.

| 케이스 | 기대 |
|---|---|
| text 설정 | `synthesizeQuestionSpeech` 호출 → play → `isSpeaking` true/false 토글 |
| 동일 텍스트 replay | API 총 1회 (캐시 히트) |
| TTS API 실패 | `speechSynthesis.speak` 폴백 호출 |
| play가 NotAllowedError로 reject | 소프트 에러 노출, replay로 복구 |
| muted 전환 | pause + `isSpeaking` false |
| unmount | 캐시 objectURL 전부 revoke |

### 5.4 무변경 확인

`ai-interviews.test.ts`, `http.test.ts` 그대로 통과해야 한다.

---

## 6. 검증 체크리스트

1. `npx tsc -b` 타입체크 통과 (제거된 props·d.ts 잔여 참조 확인)
2. `npm run lint`, `npm run test` 통과
3. 브라우저 E2E (BE+AI 기동 상태):
   - [ ] 면접 시작 → 질문 mp3 재생. 네트워크 탭에서 유니크 질문당 `/tts` 1회, replay는 무요청
   - [ ] 첫 질문 autoplay 차단 시 "질문 다시 듣기" 안내 노출 → replay로 재생 성공
   - [ ] 녹음 → 정지 → "답변을 텍스트로 변환하고 있어요…" 스피너 → Clova 전사 결과가 Textarea에 표시·편집 가능 → 제출
   - [ ] 볼륨 슬라이더가 재생 중 즉시 반영, 음소거 시 재생 정지
4. 장애 시나리오 (AI 컨테이너 중단):
   - [ ] TTS 실패 → speechSynthesis 폴백으로 질문 음성 재생
   - [ ] STT 실패 → review 진입 + 에러 + "변환 다시 시도" 버튼 + 수동 입력으로 제출 가능 (면접이 막히지 않음)
   - [ ] 전사 대기 중 다음 질문/reset 시 이전 응답이 화면을 오염시키지 않음

## 7. FE 리스크 및 대응

| 리스크 | 대응 |
|---|---|
| autoplay 정책으로 첫 질문 무음 | NotAllowedError를 폴백이 아닌 소프트 에러로 구분 처리, replay(user gesture) 복구 경로 |
| STT 지연(sync, 오디오 길이 비례) | `processing` UI 유지, AbortController로 이탈 시 정리. 버튼은 `processing` 동안 비활성(기존 로직) |
| Clova 장애 시 면접 dead-end | STT 실패 → review + 수동 입력, TTS 실패 → speechSynthesis 폴백 |
| objectURL 누수 | 캐시 Map 기반 일괄 revoke를 unmount cleanup에 배치 |
| 과금 증가 | TTS 캐시로 유니크 질문당 1회, STT는 답변당 1회 + 실패 시에만 수동 재시도 |

## 8. 범위 밖 (이번 작업에서 하지 않음)

- 답변 녹음 Blob의 서버 저장 / followup 질문 연동 (`InterviewSessionPage.tsx`의 기존 TODO 유지)
- 답변 중 실시간 자막 (Clova 배치 전사 확정으로 미제공)
- async STT + 폴링 전환 (3분+ 답변이 상시화되면 재검토)
