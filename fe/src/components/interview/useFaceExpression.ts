import { useCallback, useEffect, useRef, useState } from 'react'
import type { FaceLandmarker } from '@mediapipe/tasks-vision'
import { analyzeFaceExpression, type FaceFrame } from '@/api/face-analysis'
import { frameMetrics } from '@/components/interview/face-metrics'

// 학습 시 사용한 샘플링 fps와 맞춘다(ai-evaluate training/face/extract_frames.py의 SAMPLE_FPS).
const SAMPLE_FPS = 5
// ai-evaluate FaceAnalyzeRequest.frames의 min_length와 동일하다.
const MIN_ANALYZABLE_FRAMES = 5
const WASM_PATH = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm'
// 학습 때 쓴 모델과 반드시 같은 파일이어야 한다(ai-evaluate/README.md 4-1 참고).
const DEFAULT_MODEL_ASSET_PATH =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'
const MODEL_ASSET_PATH =
  import.meta.env.VITE_FACE_LANDMARKER_MODEL_URL || DEFAULT_MODEL_ASSET_PATH

export type FaceExpressionStatus =
  | 'idle'
  | 'capturing'
  | 'analyzing'
  | 'done'
  | 'error'

async function createFaceLandmarker() {
  const { FilesetResolver, FaceLandmarker: FaceLandmarkerClass } = await import(
    '@mediapipe/tasks-vision'
  )
  const fileset = await FilesetResolver.forVisionTasks(WASM_PATH)
  const options = {
    outputFaceBlendshapes: true,
    outputFacialTransformationMatrixes: false,
    // 1인 촬영 전제(연산량 절감).
    numFaces: 1,
    // VIDEO 모드: 프레임 간 추적으로 IMAGE 모드보다 안정적이다. timestamp는 단조 증가해야 한다.
    runningMode: 'VIDEO' as const,
  }
  try {
    return await FaceLandmarkerClass.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODEL_ASSET_PATH, delegate: 'GPU' },
      ...options,
    })
  } catch {
    // GPU 델리게이트를 지원하지 않는 저사양/구형 기기를 위한 CPU 폴백.
    return FaceLandmarkerClass.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODEL_ASSET_PATH, delegate: 'CPU' },
      ...options,
    })
  }
}

// 답변 녹화 구간의 표정을 MediaPipe로 샘플링해 ai-evaluate 표정 점수를 얻는다.
// 카메라 프레임은 브라우저 밖으로 나가지 않고, 프레임별 수치 벡터만 서버로 전송한다.
export function useFaceExpression(stream: MediaStream | null) {
  const [status, setStatus] = useState<FaceExpressionStatus>('idle')
  const [score, setScore] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const landmarkerPromiseRef = useRef<Promise<FaceLandmarker> | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const framesRef = useRef<FaceFrame[]>([])
  const startedAtRef = useRef(0)
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
    framesRef.current = []
    setScore(null)
    setError(null)
    setStatus('capturing')

    const video = document.createElement('video')
    video.muted = true
    video.playsInline = true
    video.srcObject = new MediaStream(videoTracks)
    videoRef.current = video
    startedAtRef.current = performance.now()
    // jsdom 등 play()가 Promise를 반환하지 않는 환경도 있어 안전하게 처리한다.
    void Promise.resolve(video.play()).catch(() => {})

    ensureLandmarker()
      .then((landmarker) => {
        if (generationRef.current !== generation) return
        const intervalMs = 1000 / SAMPLE_FPS
        timerRef.current = setInterval(() => {
          if (generationRef.current !== generation || video.readyState < 2) return

          const result = landmarker.detectForVideo(video, performance.now())
          const landmarks = result.faceLandmarks?.[0]
          const blendshapeCategories = result.faceBlendshapes?.[0]?.categories
          // 얼굴 미검출 프레임은 버린다(ai-evaluate 파이썬 쪽과 동일한 처리).
          if (!landmarks || !blendshapeCategories) return

          framesRef.current.push({
            ...frameMetrics(landmarks),
            // categories 순서(index 순)를 그대로 유지해야 학습된 모델과 축이 맞는다.
            blendshapes: blendshapeCategories.map((category) => category.score),
          })
        }, intervalMs)
      })
      .catch(() => {
        if (generationRef.current !== generation) return
        stopSampling()
        setStatus('error')
        setError('표정 인식 모델을 불러오지 못했습니다.')
      })
  }, [ensureLandmarker, status, stopSampling, stream])

  const stopCapture = useCallback(async () => {
    if (status !== 'capturing') return
    const generation = generationRef.current
    const durationSec = (performance.now() - startedAtRef.current) / 1000
    const frames = framesRef.current
    stopSampling()

    if (frames.length < MIN_ANALYZABLE_FRAMES) {
      setStatus('idle')
      return
    }

    setStatus('analyzing')
    try {
      const result = await analyzeFaceExpression({
        fps: SAMPLE_FPS,
        duration_sec: durationSec,
        frames,
      })
      if (generationRef.current !== generation) return
      setScore(result.score)
      setStatus('done')
    } catch {
      if (generationRef.current !== generation) return
      setStatus('error')
      setError('표정 분석 요청에 실패했습니다.')
    }
  }, [status, stopSampling])

  const reset = useCallback(() => {
    generationRef.current += 1
    stopSampling()
    framesRef.current = []
    setStatus('idle')
    setScore(null)
    setError(null)
  }, [stopSampling])

  return { status, score, error, startCapture, stopCapture, reset }
}
