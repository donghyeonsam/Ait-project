import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getSupportedAudioMimeType,
  useVoiceAnswer,
} from '@/components/interview/useVoiceAnswer'

class MockMediaStream {
  private readonly audioTracks: MediaStreamTrack[]

  constructor(audioTracks: MediaStreamTrack[] = []) {
    this.audioTracks = audioTracks
  }

  getAudioTracks() {
    return this.audioTracks
  }
}

class MockMediaRecorder {
  static isTypeSupported(mimeType: string) {
    return mimeType.startsWith('audio/webm')
  }

  state: RecordingState = 'inactive'
  readonly mimeType: string
  ondataavailable: ((event: BlobEvent) => void) | null = null
  onerror: (() => void) | null = null
  onstop: (() => void) | null = null

  constructor(
    _stream: MediaStream,
    options?: MediaRecorderOptions,
  ) {
    this.mimeType = options?.mimeType ?? 'audio/webm'
  }

  start() {
    this.state = 'recording'
  }

  stop() {
    this.state = 'inactive'
    this.ondataavailable?.({
      data: new Blob(['recorded-audio'], { type: this.mimeType }),
    } as BlobEvent)
    this.onstop?.()
  }
}

const recognitionInstances: MockSpeechRecognition[] = []

class MockSpeechRecognition implements AitSpeechRecognition {
  continuous = false
  interimResults = false
  lang = ''
  onresult: ((event: AitSpeechRecognitionEvent) => void) | null = null
  onerror: ((event: AitSpeechRecognitionErrorEvent) => void) | null = null
  onend: (() => void) | null = null

  constructor() {
    recognitionInstances.push(this)
  }

  start() {}

  stop() {
    this.onend?.()
  }

  abort() {}
}

describe('useVoiceAnswer', () => {
  beforeEach(() => {
    recognitionInstances.length = 0
    vi.stubGlobal('MediaStream', MockMediaStream)
    vi.stubGlobal('MediaRecorder', MockMediaRecorder)
    vi.stubGlobal('SpeechRecognition', MockSpeechRecognition)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('마이크 음성을 녹음하고 STT 결과와 Blob을 검토 상태로 만든다', () => {
    const stream = new MockMediaStream([
      {} as MediaStreamTrack,
    ]) as unknown as MediaStream
    const { result } = renderHook(() => useVoiceAnswer(stream))

    act(() => result.current.startRecording())
    expect(result.current.status).toBe('recording')
    expect(getSupportedAudioMimeType()).toBe('audio/webm;codecs=opus')

    act(() => {
      recognitionInstances[0]?.onresult?.({
        resultIndex: 0,
        results: {
          0: {
            0: { transcript: '테스트 답변입니다', confidence: 0.9 },
            isFinal: true,
            length: 1,
          },
          length: 1,
        },
      } as unknown as AitSpeechRecognitionEvent)
      result.current.stopRecording()
    })

    expect(result.current.status).toBe('review')
    expect(result.current.transcript).toBe('테스트 답변입니다')
    expect(result.current.audioBlob?.size).toBeGreaterThan(0)
  })

  it('마이크 트랙이 없으면 사용자가 해결할 수 있는 오류를 표시한다', () => {
    const stream = new MockMediaStream() as unknown as MediaStream
    const { result } = renderHook(() => useVoiceAnswer(stream))

    act(() => result.current.startRecording())

    expect(result.current.status).toBe('error')
    expect(result.current.error).toContain('마이크 권한과 장치 연결')
  })
})
