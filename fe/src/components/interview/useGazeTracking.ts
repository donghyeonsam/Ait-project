import { useCallback, useEffect, useRef, useState } from 'react'
import type { FaceLandmarker } from '@mediapipe/tasks-vision'
import {
  gazeFrameMetrics,
  isLookingOnScreen,
} from '@/components/interview/gaze-metrics'

// 학습 파이프라인이 따로 없어 표정 캡처(useFaceExpression)와 같은 샘플링 fps를 쓴다.
const SAMPLE_FPS = 5
const WASM_PATH = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm'
const DEFAULT_MODEL_ASSET_PATH =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'
const MODEL_ASSET_PATH =
  import.meta.env.VITE_FACE_LANDMARKER_MODEL_URL || DEFAULT_MODEL_ASSET_PATH

export type GazeTrackingStatus = 'idle' | 'capturing' | 'done' | 'error'

async function createFaceLandmarker() {
  const { FilesetResolver, FaceLandmarker: FaceLandmarkerClass } = await import(
    '@mediapipe/tasks-vision'
  )
  const fileset = await FilesetResolver.forVisionTasks(WASM_PATH)
  const options = {
    outputFaceBlendshapes: false,
    outputFacialTransformationMatrixes: false,
    numFaces: 1,
    runningMode: 'VIDEO' as const,
  }
  try {
    return await FaceLandmarkerClass.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODEL_ASSET_PATH, delegate: 'GPU' },
      ...options,
    })
  } catch {
    return FaceLandmarkerClass.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODEL_ASSET_PATH, delegate: 'CPU' },
      ...options,
    })
  }
}

// 답변 구간 동안 홍채 위치를 샘플링해 화면(카메라)을 응시한 프레임 비율을 계산한다.
// ai-evaluate에는 아직 시선 전용 분석 엔드포인트가 없어 서버로 전송하지 않는다(행동 데이터
// 전송 로직 티켓에서 다룬다) — 이 훅은 브라우저 안에서 계산까지만 책임진다.
export function useGazeTracking(stream: MediaStream | null) {
  const [status, setStatus] = useState<GazeTrackingStatus>('idle')
  const [onScreenRatio, setOnScreenRatio] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const landmarkerPromiseRef = useRef<Promise<FaceLandmarker> | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const onScreenCountRef = useRef(0)
  const sampledCountRef = useRef(0)
  const generationRef = useRef(0)

  const stopSampling = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    videoRef.current?.pause()
    videoRef.current = null
  }, [])

  useEffect(() => {
    return () => {
      generationRef.current += 1
      stopSampling()
      landmarkerPromiseRef.current
        ?.then((landmarker) => landmarker.close())
        .catch(() => {})
      landmarkerPromiseRef.current = null
    }
  }, [stopSampling])

  const ensureLandmarker = useCallback(() => {
    if (!landmarkerPromiseRef.current) {
      landmarkerPromiseRef.current = createFaceLandmarker()
    }
    return landmarkerPromiseRef.current
  }, [])

  const startCapture = useCallback(() => {
    const videoTracks = stream?.getVideoTracks() ?? []
    if (status === 'capturing' || videoTracks.length === 0) return

    const generation = generationRef.current + 1
    generationRef.current = generation
    onScreenCountRef.current = 0
    sampledCountRef.current = 0
    setOnScreenRatio(null)
    setError(null)
    setStatus('capturing')

    const video = document.createElement('video')
    video.muted = true
    video.playsInline = true
    video.srcObject = new MediaStream(videoTracks)
    videoRef.current = video
    void Promise.resolve(video.play()).catch(() => {})

    ensureLandmarker()
      .then((landmarker) => {
        if (generationRef.current !== generation) return
        const intervalMs = 1000 / SAMPLE_FPS
        timerRef.current = setInterval(() => {
          if (generationRef.current !== generation || video.readyState < 2) return

          const result = landmarker.detectForVideo(video, performance.now())
          const landmarks = result.faceLandmarks?.[0]
          if (!landmarks) return

          sampledCountRef.current += 1
          if (isLookingOnScreen(gazeFrameMetrics(landmarks))) {
            onScreenCountRef.current += 1
          }
        }, intervalMs)
      })
      .catch(() => {
        if (generationRef.current !== generation) return
        stopSampling()
        setStatus('error')
        setError('시선 추적 모델을 불러오지 못했습니다.')
      })
  }, [ensureLandmarker, status, stopSampling, stream])

  const stopCapture = useCallback(() => {
    if (status !== 'capturing') return
    stopSampling()

    if (sampledCountRef.current === 0) {
      setStatus('idle')
      return
    }
    setOnScreenRatio(onScreenCountRef.current / sampledCountRef.current)
    setStatus('done')
  }, [status, stopSampling])

  const reset = useCallback(() => {
    generationRef.current += 1
    stopSampling()
    onScreenCountRef.current = 0
    sampledCountRef.current = 0
    setStatus('idle')
    setOnScreenRatio(null)
    setError(null)
  }, [stopSampling])

  return { status, onScreenRatio, error, startCapture, stopCapture, reset }
}
