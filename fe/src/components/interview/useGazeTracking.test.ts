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

const { useGazeTracking } = await import(
  '@/components/interview/useGazeTracking'
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

// 눈 소켓 공통 좌표 + 홍채를 중앙에 둬 '화면을 보고 있음'으로 판정되는 프레임.
function onScreenLandmarks() {
  const landmarks = Array.from({ length: 478 }, () => ({ x: 0, y: 0 }))
  Object.assign(landmarks, {
    33: { x: 0.3, y: 0.4 },
    133: { x: 0.36, y: 0.4 },
    159: { x: 0.33, y: 0.38 },
    145: { x: 0.33, y: 0.42 },
    468: { x: 0.33, y: 0.4 },
    263: { x: 0.64, y: 0.4 },
    362: { x: 0.7, y: 0.4 },
    386: { x: 0.67, y: 0.38 },
    374: { x: 0.67, y: 0.42 },
    473: { x: 0.67, y: 0.4 },
  })
  return landmarks
}

// 같은 눈 소켓에서 홍채만 한쪽 끝으로 몰아 '화면을 벗어남'으로 판정되는 프레임.
function offScreenLandmarks() {
  const landmarks = onScreenLandmarks()
  landmarks[468] = { x: 0.3, y: 0.4 }
  landmarks[473] = { x: 0.64, y: 0.4 }
  return landmarks
}

describe('useGazeTracking', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('MediaStream', MockMediaStream)
    detectForVideo.mockReturnValue({ faceLandmarks: [onScreenLandmarks()] })
    forVisionTasks.mockClear().mockResolvedValue({})
    createFromOptions.mockClear().mockResolvedValue({ detectForVideo, close })

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
    const { result } = renderHook(() => useGazeTracking(null))

    act(() => {
      result.current.startCapture()
    })

    expect(result.current.status).toBe('idle')
    expect(createFromOptions).not.toHaveBeenCalled()
  })

  it('계속 화면을 보고 있으면 onScreenRatio가 1에 가깝다', async () => {
    const { result } = renderHook(() => useGazeTracking(trackStream()))

    act(() => {
      result.current.startCapture()
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(SAMPLE_INTERVAL_MS * 5)
    })
    act(() => {
      result.current.stopCapture()
    })

    expect(result.current.status).toBe('done')
    expect(result.current.onScreenRatio).toBe(1)
  })

  it('계속 화면을 벗어나 있으면 onScreenRatio가 0에 가깝다', async () => {
    detectForVideo.mockReturnValue({ faceLandmarks: [offScreenLandmarks()] })
    const { result } = renderHook(() => useGazeTracking(trackStream()))

    act(() => {
      result.current.startCapture()
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(SAMPLE_INTERVAL_MS * 5)
    })
    act(() => {
      result.current.stopCapture()
    })

    expect(result.current.onScreenRatio).toBe(0)
  })

  it('얼굴이 한 번도 검출되지 않으면 idle로 돌아간다', async () => {
    detectForVideo.mockReturnValue({ faceLandmarks: [] })
    const { result } = renderHook(() => useGazeTracking(trackStream()))

    act(() => {
      result.current.startCapture()
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(SAMPLE_INTERVAL_MS * 3)
    })
    act(() => {
      result.current.stopCapture()
    })

    expect(result.current.status).toBe('idle')
    expect(result.current.onScreenRatio).toBeNull()
  })

  it('모델 로딩에 실패하면 error 상태가 된다', async () => {
    createFromOptions.mockRejectedValue(new Error('gpu unavailable'))
    const { result } = renderHook(() => useGazeTracking(trackStream()))

    act(() => {
      result.current.startCapture()
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(result.current.status).toBe('error')
  })

  it('reset을 호출하면 idle 상태로 돌아가고 비율이 사라진다', async () => {
    const { result } = renderHook(() => useGazeTracking(trackStream()))

    act(() => {
      result.current.startCapture()
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(SAMPLE_INTERVAL_MS * 5)
    })
    act(() => {
      result.current.stopCapture()
    })
    expect(result.current.onScreenRatio).toBe(1)

    act(() => {
      result.current.reset()
    })

    expect(result.current.status).toBe('idle')
    expect(result.current.onScreenRatio).toBeNull()
  })
})
