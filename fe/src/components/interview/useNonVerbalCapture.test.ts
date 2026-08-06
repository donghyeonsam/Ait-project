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

const sendNonVerbalData = vi.fn()
vi.mock('@/api/ai-interviews', () => ({
  sendNonVerbalData: (...args: unknown[]) => sendNonVerbalData(...args),
}))

const { useNonVerbalCapture } = await import(
  '@/components/interview/useNonVerbalCapture'
)

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
const VIDEO_WIDTH = 640
const VIDEO_HEIGHT = 480
const SCREEN_WIDTH = 1920
const SCREEN_HEIGHT = 1080

function detectionResult(faceCenter: { x: number; y: number } = { x: 0.5, y: 0.5 }) {
  return {
    faceLandmarks: [Array.from({ length: 478 }, () => faceCenter)],
    faceBlendshapes: [
      { categories: Array.from({ length: 52 }, (_, i) => ({ score: i / 52 })) },
    ],
  }
}

describe('useNonVerbalCapture', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('MediaStream', MockMediaStream)
    detectForVideo.mockReturnValue(detectionResult())
    forVisionTasks.mockClear().mockResolvedValue({})
    createFromOptions.mockClear().mockResolvedValue({ detectForVideo, close })
    sendNonVerbalData.mockReset()

    Object.defineProperty(window.screen, 'width', {
      value: SCREEN_WIDTH,
      configurable: true,
    })
    Object.defineProperty(window.screen, 'height', {
      value: SCREEN_HEIGHT,
      configurable: true,
    })

    vi.spyOn(document, 'createElement').mockImplementation(
      ((tag: string) => {
        const element = Document.prototype.createElement.call(document, tag)
        if (tag === 'video') {
          Object.defineProperty(element, 'readyState', {
            value: 2,
            configurable: true,
          })
          Object.defineProperty(element, 'videoWidth', {
            value: VIDEO_WIDTH,
            configurable: true,
          })
          Object.defineProperty(element, 'videoHeight', {
            value: VIDEO_HEIGHT,
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
    const { result } = renderHook(() => useNonVerbalCapture(null, 1))

    act(() => {
      result.current.startCapture()
    })

    expect(result.current.status).toBe('idle')
    expect(createFromOptions).not.toHaveBeenCalled()
  })

  it('aiInterviewId가 없으면 캡처를 시작하지 않는다', () => {
    const { result } = renderHook(() => useNonVerbalCapture(trackStream(), null))

    act(() => {
      result.current.startCapture()
    })

    expect(result.current.status).toBe('idle')
    expect(createFromOptions).not.toHaveBeenCalled()
  })

  it('녹화 구간 동안 프레임을 모아 BE의 /non-verbal로 전송한다', async () => {
    sendNonVerbalData.mockResolvedValue(undefined)
    const { result } = renderHook(() => useNonVerbalCapture(trackStream(), 42))

    act(() => {
      result.current.startCapture()
    })
    expect(result.current.status).toBe('capturing')

    await act(async () => {
      await vi.advanceTimersByTimeAsync(SAMPLE_INTERVAL_MS * 5)
    })
    expect(detectForVideo).toHaveBeenCalled()

    act(() => {
      result.current.stopCapture()
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(sendNonVerbalData).toHaveBeenCalledTimes(1)
    const [payload] = sendNonVerbalData.mock.calls[0] as [
      {
        aiInterviewId: number
        screenWidth: number
        screenHeight: number
        fps: number
        frames: Array<{
          gaze_x: number
          gaze_y: number
          blendshapes: number[]
          ear: number
          mar: number
        }>
      },
    ]
    expect(payload.aiInterviewId).toBe(42)
    expect(payload.screenWidth).toBe(SCREEN_WIDTH)
    expect(payload.screenHeight).toBe(SCREEN_HEIGHT)
    expect(payload.fps).toBe(5)
    expect(payload.frames.length).toBeGreaterThan(0)
    // 양쪽 홍채 중심이 정규화 좌표 (0.5, 0.5)이므로 모니터 해상도 기준으로는 정중앙 좌표가 된다.
    expect(payload.frames[0].gaze_x).toBeCloseTo(SCREEN_WIDTH * 0.5, 5)
    expect(payload.frames[0].gaze_y).toBeCloseTo(SCREEN_HEIGHT * 0.5, 5)
    expect(payload.frames[0].blendshapes).toHaveLength(52)
    expect(result.current.status).toBe('done')
  })

  it('검출된 프레임이 없으면 전송하지 않고 idle로 돌아간다', async () => {
    detectForVideo.mockReturnValue({ faceLandmarks: [] })
    const { result } = renderHook(() => useNonVerbalCapture(trackStream(), 42))

    act(() => {
      result.current.startCapture()
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(SAMPLE_INTERVAL_MS)
    })
    act(() => {
      result.current.stopCapture()
    })

    expect(sendNonVerbalData).not.toHaveBeenCalled()
    expect(result.current.status).toBe('idle')
  })

  it('전송이 실패하면 error 상태와 메시지를 남긴다', async () => {
    sendNonVerbalData.mockRejectedValue(new Error('network down'))
    const { result } = renderHook(() => useNonVerbalCapture(trackStream(), 42))

    act(() => {
      result.current.startCapture()
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(SAMPLE_INTERVAL_MS * 5)
    })
    act(() => {
      result.current.stopCapture()
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(result.current.status).toBe('error')
    expect(result.current.error).toBeTruthy()
  })

  it('모델 로딩에 실패하면 error 상태가 된다', async () => {
    createFromOptions.mockRejectedValue(new Error('gpu unavailable'))
    const { result } = renderHook(() => useNonVerbalCapture(trackStream(), 42))

    act(() => {
      result.current.startCapture()
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(result.current.status).toBe('error')
  })

  it('얼굴이 중앙에서 많이 벗어나면 isFaceOffCenter가 켜지고, 녹화가 끝나면 꺼진다', async () => {
    // 바운딩 박스가 (0.9, 0.5) 한 점이므로 중앙(0.5, 0.5)과의 거리는 0.4로 진입 임계값(0.22)을 넘는다.
    detectForVideo.mockReturnValue(detectionResult({ x: 0.9, y: 0.5 }))
    sendNonVerbalData.mockResolvedValue(undefined)
    const { result } = renderHook(() => useNonVerbalCapture(trackStream(), 42))

    act(() => {
      result.current.startCapture()
    })
    expect(result.current.isFaceOffCenter).toBe(false)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(SAMPLE_INTERVAL_MS)
    })
    expect(result.current.isFaceOffCenter).toBe(true)

    act(() => {
      result.current.stopCapture()
    })
    expect(result.current.isFaceOffCenter).toBe(false)
  })

  it('reset을 호출하면 idle 상태로 돌아간다', async () => {
    sendNonVerbalData.mockResolvedValue(undefined)
    const { result } = renderHook(() => useNonVerbalCapture(trackStream(), 42))

    act(() => {
      result.current.startCapture()
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(SAMPLE_INTERVAL_MS * 5)
    })
    act(() => {
      result.current.stopCapture()
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(result.current.status).toBe('done')

    act(() => {
      result.current.reset()
    })

    expect(result.current.status).toBe('idle')
    expect(result.current.error).toBeNull()
  })
})
