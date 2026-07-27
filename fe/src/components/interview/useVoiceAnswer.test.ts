import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { transcribeAnswer } from '@/api/speech'
import {
  getSupportedAudioMimeType,
  useVoiceAnswer,
} from '@/components/interview/useVoiceAnswer'

vi.mock('@/api/speech', () => ({
  transcribeAnswer: vi.fn(),
}))

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

function createStreamWithTrack() {
  return new MockMediaStream([
    {} as MediaStreamTrack,
  ]) as unknown as MediaStream
}

describe('useVoiceAnswer', () => {
  beforeEach(() => {
    vi.mocked(transcribeAnswer).mockReset()
    vi.stubGlobal('MediaStream', MockMediaStream)
    vi.stubGlobal('MediaRecorder', MockMediaRecorder)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('녹음 종료 후 STT 전사 결과를 검토 상태로 만든다', async () => {
    let resolveTranscription: (value: { text: string }) => void = () => {}
    vi.mocked(transcribeAnswer).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveTranscription = resolve
        }),
    )

    const { result } = renderHook(() => useVoiceAnswer(createStreamWithTrack()))

    act(() => result.current.startRecording())
    expect(result.current.status).toBe('recording')
    expect(getSupportedAudioMimeType()).toBe('audio/webm;codecs=opus')

    act(() => result.current.stopRecording())
    expect(result.current.status).toBe('processing')
    expect(transcribeAnswer).toHaveBeenCalledTimes(1)
    expect(vi.mocked(transcribeAnswer).mock.calls[0]?.[0]?.size).toBeGreaterThan(0)

    await act(async () => {
      resolveTranscription({ text: '테스트 답변입니다' })
    })

    expect(result.current.status).toBe('review')
    expect(result.current.transcript).toBe('테스트 답변입니다')
    expect(result.current.audioBlob?.size).toBeGreaterThan(0)
    expect(result.current.error).toBeNull()
  })

  it('전사가 실패해도 review로 진입해 수동 입력 경로를 남긴다', async () => {
    vi.mocked(transcribeAnswer).mockRejectedValue(new Error('stt failed'))

    const { result } = renderHook(() => useVoiceAnswer(createStreamWithTrack()))

    act(() => result.current.startRecording())
    await act(async () => result.current.stopRecording())

    expect(result.current.status).toBe('review')
    expect(result.current.transcript).toBe('')
    expect(result.current.audioBlob?.size).toBeGreaterThan(0)
    expect(result.current.error).toContain('직접 입력')
  })

  it('retryTranscription은 보관된 Blob으로 전사를 다시 시도한다', async () => {
    vi.mocked(transcribeAnswer).mockRejectedValueOnce(new Error('stt failed'))
    vi.mocked(transcribeAnswer).mockResolvedValueOnce({ text: '재시도 성공' })

    const { result } = renderHook(() => useVoiceAnswer(createStreamWithTrack()))

    act(() => result.current.startRecording())
    await act(async () => result.current.stopRecording())
    expect(result.current.error).not.toBeNull()

    const recordedBlob = result.current.audioBlob
    await act(async () => result.current.retryTranscription())

    expect(transcribeAnswer).toHaveBeenCalledTimes(2)
    expect(vi.mocked(transcribeAnswer).mock.calls[1]?.[0]).toBe(recordedBlob)
    expect(result.current.status).toBe('review')
    expect(result.current.transcript).toBe('재시도 성공')
    expect(result.current.error).toBeNull()
  })

  it('전사 대기 중 reset하면 요청을 중단하고 idle을 유지한다', async () => {
    let resolveTranscription: (value: { text: string }) => void = () => {}
    let receivedSignal: AbortSignal | undefined
    vi.mocked(transcribeAnswer).mockImplementation(
      (_blob, options) =>
        new Promise((resolve) => {
          receivedSignal = options?.signal
          resolveTranscription = resolve
        }),
    )

    const { result } = renderHook(() => useVoiceAnswer(createStreamWithTrack()))

    act(() => result.current.startRecording())
    act(() => result.current.stopRecording())
    expect(result.current.status).toBe('processing')

    act(() => result.current.reset())
    expect(receivedSignal?.aborted).toBe(true)

    await act(async () => {
      resolveTranscription({ text: '늦게 도착한 응답' })
    })

    expect(result.current.status).toBe('idle')
    expect(result.current.transcript).toBe('')
  })

  it('마이크 트랙이 없으면 사용자가 해결할 수 있는 오류를 표시한다', () => {
    const stream = new MockMediaStream() as unknown as MediaStream
    const { result } = renderHook(() => useVoiceAnswer(stream))

    act(() => result.current.startRecording())

    expect(result.current.status).toBe('error')
    expect(result.current.error).toContain('마이크 권한과 장치 연결')
  })
})
