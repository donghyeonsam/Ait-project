import { backendRequest } from '@/api/http'

// BE가 byte[]를 내려주며 JSON 직렬화 과정에서 base64 문자열이 된다.
export interface TtsResponse {
  audioData: string
}

interface SpeechRequestOptions {
  signal?: AbortSignal
}

// 질문 텍스트를 서버 TTS(OpenAI gpt-4o-mini-tts) mp3(base64)로 변환한다.
export function synthesizeQuestionSpeech(
  text: string,
  { signal }: SpeechRequestOptions = {},
) {
  return backendRequest<TtsResponse>('/api/tts', {
    method: 'POST',
    body: JSON.stringify({ question: text }),
    signal,
  })
}

// base64 TTS 응답을 <audio>에서 재생 가능한 Blob으로 변환한다.
export function ttsResponseToBlob(res: TtsResponse): Blob {
  const binary = atob(res.audioData)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return new Blob([bytes], { type: 'audio/mpeg' })
}
