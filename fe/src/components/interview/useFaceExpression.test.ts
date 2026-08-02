import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const detectForVideo = vi.fn()
const close = vi.fn()
const forVisionTasks = vi.fn().mockResolvedValue({})
const createFromOptions = vi.fn().mockResolvedValue({ detectForVideo, close })

vi.mock('@mediapipe/tasks-vision', () => ({
  FilesetResolver: { forVisionTasks },
  FaceLandmarker: { createFromOptions },
}))

const analyzeFaceExpression = vi.fn()
vi.mock('@/api/face-analysis', () => ({
  analyzeFaceExpression: (...args: unknown[]) => analyzeFaceExpression(...args),
}))

const { useFaceExpression } = await import('@/components/interview/useFaceExpression')

class MockMediaStream {
  private readonly tracks: MediaStreamTrack[]
  constructor(tracks: MediaStreamTrack[] = []) {
    this.tracks = tracks
  }
  getVideoTracks() {
    return this.tracks
  }
}

const SAMPLE_INTERVAL_MS = 200 // SAMPLE_FPS(5)와 동일

function detectionResult() {
  return {
    faceLandmarks: [Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5 }))],
    faceBlendshapes: [
      { categories: Array.from({ length: 52 }, (_, i) => ({ score: i / 52 })) },
    ],
  }
}

describe('useFaceExpression', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('MediaStream', MockMediaStream)
    detectForVideo.mockReturnValue(detectionResult())
    forVisionTasks.mockClear().mockResolvedValue({})
    createFromOptions.mockClear().mockResolvedValue({ detectForVideo, close })
    analyzeFaceExpression.mockReset()

    vi.spyOn(document, 'createElement').mockImplementation(
      ((tag: string) => {
        const element = Document.prototype.createElement.call(document, tag)
        if (tag === 'video') {
          Object.defineProperty(element, 'readyState', {
            value: 2,
            configurable: true,
          })
          Object.defineProperty(element, 'play', {
            value: () => Promise.resolve(),
            configurable: true,
          })
        }
        return element
      }) as typeof document.createElement,
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  function trackStream() {
    return new MockMediaStream([{} as MediaStreamTrack]) as unknown as MediaStream
  }

  it('영상 트랙이 없으면 캡처를 시작하지 않는다', () => {
    const { result } = renderHook(() => useFaceExpression(null))

    act(() => {
      result.current.startCapture()
    })

    expect(result.current.status).toBe('idle')
    expect(createFromOptions).not.toHaveBeenCalled()
  })

  it('녹화 구간 동안 프레임을 모아 분석 결과 점수를 받는다', async () => {
    analyzeFaceExpression.mockResolvedValue({ score: 8.4 })
    const { result } = renderHook(() => useFaceExpression(trackStream()))

    act(() => {
      result.current.startCapture()
    })
    expect(result.current.status).toBe('capturing')

    // FaceLandmarker 로딩(Promise 체인)을 흘려보내고 샘플링 간격을 5회 진행한다.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(SAMPLE_INTERVAL_MS * 5)
    })
    expect(detectForVideo).toHaveBeenCalled()

    await act(async () => {
      await result.current.stopCapture()
    })

    expect(analyzeFaceExpression).toHaveBeenCalledTimes(1)
    const [payload] = analyzeFaceExpression.mock.calls[0] as [
      { fps: number; frames: unknown[] },
    ]
    expect(payload.fps).toBe(5)
    expect(payload.frames.length).toBeGreaterThanOrEqual(5)
    expect(result.current.status).toBe('done')
    expect(result.current.score).toBe(8.4)
  })

  it('검출된 프레임이 너무 적으면 분석을 요청하지 않고 idle로 돌아간다', async () => {
    const { result } = renderHook(() => useFaceExpression(trackStream()))

    act(() => {
      result.current.startCapture()
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(SAMPLE_INTERVAL_MS)
    })

    await act(async () => {
      await result.current.stopCapture()
    })

    expect(analyzeFaceExpression).not.toHaveBeenCalled()
    expect(result.current.status).toBe('idle')
  })

  it('분석 요청이 실패하면 error 상태와 메시지를 남긴다', async () => {
    analyzeFaceExpression.mockRejectedValue(new Error('network down'))
    const { result } = renderHook(() => useFaceExpression(trackStream()))

    act(() => {
      result.current.startCapture()
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(SAMPLE_INTERVAL_MS * 5)
    })
    await act(async () => {
      await result.current.stopCapture()
    })

    expect(result.current.status).toBe('error')
    expect(result.current.error).toBeTruthy()
  })

  it('모델 로딩에 실패하면 error 상태가 된다', async () => {
    createFromOptions.mockRejectedValue(new Error('gpu unavailable'))
    const { result } = renderHook(() => useFaceExpression(trackStream()))

    act(() => {
      result.current.startCapture()
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(result.current.status).toBe('error')
  })

  it('reset을 호출하면 idle 상태로 돌아가고 점수가 사라진다', async () => {
    analyzeFaceExpression.mockResolvedValue({ score: 5 })
    const { result } = renderHook(() => useFaceExpression(trackStream()))

    act(() => {
      result.current.startCapture()
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(SAMPLE_INTERVAL_MS * 5)
    })
    await act(async () => {
      await result.current.stopCapture()
    })
    expect(result.current.score).toBe(5)

    act(() => {
      result.current.reset()
    })

    expect(result.current.status).toBe('idle')
    expect(result.current.score).toBeNull()
  })
})
