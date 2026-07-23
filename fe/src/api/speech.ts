import { backendRequest } from '@/api/http'

export interface SttResponse {
  text: string
}

export interface TtsResponse {
  audioBase64: string
  format: string
}

interface SpeechRequestOptions {
  signal?: AbortSignal
}

// Clova가 확장자로 오디오 컨테이너를 판별하므로 Blob mime에서 파일명을 추론한다.
function inferFilename(blob: Blob) {
  return blob.type.includes('mp4') ? 'answer.mp4' : 'answer.webm'
}

// 답변 녹음 Blob을 BE 중계 경유 Clova STT로 보내 전사 텍스트를 받는다.
export function transcribeAnswer(
  audio: Blob,
  { signal }: SpeechRequestOptions = {},
) {
  const form = new FormData()
  form.append('media', audio, inferFilename(audio))
  return backendRequest<SttResponse>('/api/ai-interviews/speech/stt', {
    method: 'POST',
    body: form,
    signal,
  })
}

// 질문 텍스트를 Clova TTS mp3(base64)로 변환한다.
export function synthesizeQuestionSpeech(
  text: string,
  { signal }: SpeechRequestOptions = {},
) {
  return backendRequest<TtsResponse>('/api/ai-interviews/speech/tts', {
    method: 'POST',
    body: JSON.stringify({ text }),
    signal,
  })
}

// base64 TTS 응답을 <audio>에서 재생 가능한 Blob으로 변환한다.
export function ttsResponseToBlob(res: TtsResponse): Blob {
  const binary = atob(res.audioBase64)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return new Blob([bytes], { type: 'audio/mpeg' })
}
