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

interface MockRecognitionResult extends Array<{
  transcript: string
  confidence: number
}> {
  isFinal: boolean
}

interface MockRecognitionEvent extends Event {
  resultIndex: number
  results: MockRecognitionResult[]
}

interface MockRecognitionErrorEvent extends Event {
  error: string
}

class MockSpeechRecognition {
  static instances: MockSpeechRecognition[] = []

  lang = ''
  continuous = false
  interimResults = false
  maxAlternatives = 0
  onresult: ((event: MockRecognitionEvent) => void) | null = null
  onerror: ((event: MockRecognitionErrorEvent) => void) | null = null
  onend: (() => void) | null = null
  start = vi.fn()
  stop = vi.fn(() => this.onend?.())
  abort = vi.fn()

  constructor() {
    MockSpeechRecognition.instances.push(this)
  }

  emitResult(transcript: string, isFinal: boolean) {
    const result = [{ transcript, confidence: 0.9 }] as MockRecognitionResult
    result.isFinal = isFinal
    this.onresult?.({
      resultIndex: 0,
      results: [result],
    } as MockRecognitionEvent)
  }

  emitEnd() {
    this.onend?.()
  }
}

function createStreamWithTrack() {
  return new MockMediaStream([
    {} as MediaStreamTrack,
  ]) as unknown as MediaStream
}

describe('useVoiceAnswer', () => {
  beforeEach(() => {
    MockSpeechRecognition.instances = []
    vi.stubGlobal('MediaStream', MockMediaStream)
    vi.stubGlobal('MediaRecorder', MockMediaRecorder)
    vi.stubGlobal('SpeechRecognition', MockSpeechRecognition)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('브라우저 음성 인식의 중간 결과와 최종 결과를 답변에 반영한다', () => {
    const { result } = renderHook(() => useVoiceAnswer(createStreamWithTrack()))

    act(() => result.current.startRecording())

    const recognition = MockSpeechRecognition.instances[0]
    expect(result.current.status).toBe('recording')
    expect(getSupportedAudioMimeType()).toBe('audio/webm;codecs=opus')
    expect(recognition.lang).toBe('ko-KR')
    expect(recognition.continuous).toBe(true)
    expect(recognition.interimResults).toBe(true)
    expect(recognition.maxAlternatives).toBe(1)

    act(() => recognition.emitResult('테스트', false))
    expect(result.current.transcript).toBe('테스트')

    act(() => recognition.emitResult('테스트 답변입니다', true))
    expect(result.current.transcript).toBe('테스트 답변입니다')

    act(() => result.current.stopRecording())
    expect(result.current.status).toBe('review')
    expect(result.current.audioBlob?.size).toBeGreaterThan(0)
    expect(result.current.error).toBeNull()
  })

  it('녹음 중 인식기가 종료되면 기본 API로 자동 재시작한다', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useVoiceAnswer(createStreamWithTrack()))

    act(() => result.current.startRecording())
    const recognition = MockSpeechRecognition.instances[0]
    expect(recognition.start).toHaveBeenCalledTimes(1)

    act(() => recognition.emitEnd())
    act(() => vi.advanceTimersByTime(150))

    expect(recognition.start).toHaveBeenCalledTimes(2)
    expect(result.current.status).toBe('recording')
  })

  it('음성 인식 미지원 브라우저에서도 녹음 후 직접 입력할 수 있다', () => {
    vi.stubGlobal('SpeechRecognition', undefined)
    vi.stubGlobal('webkitSpeechRecognition', undefined)
    const { result } = renderHook(() => useVoiceAnswer(createStreamWithTrack()))

    act(() => result.current.startRecording())
    expect(result.current.status).toBe('recording')
    expect(result.current.error).toContain('직접 입력')

    act(() => result.current.stopRecording())
    expect(result.current.status).toBe('review')
    expect(result.current.audioBlob?.size).toBeGreaterThan(0)
  })

  it('reset하면 진행 중인 인식을 중단하고 초기 상태로 돌아간다', () => {
    const { result } = renderHook(() => useVoiceAnswer(createStreamWithTrack()))

    act(() => result.current.startRecording())
    const recognition = MockSpeechRecognition.instances[0]

    act(() => result.current.reset())

    expect(recognition.abort).toHaveBeenCalledTimes(1)
    expect(result.current.status).toBe('idle')
    expect(result.current.transcript).toBe('')
    expect(result.current.audioBlob).toBeNull()
  })

  it('마이크 트랙이 없으면 사용자가 해결할 수 있는 오류를 표시한다', () => {
    const stream = new MockMediaStream() as unknown as MediaStream
    const { result } = renderHook(() => useVoiceAnswer(stream))

    act(() => result.current.startRecording())

    expect(result.current.status).toBe('error')
    expect(result.current.error).toContain('마이크 권한과 장치 연결')
  })
})
