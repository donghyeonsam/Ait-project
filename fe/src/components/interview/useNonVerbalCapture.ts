import { useCallback, useEffect, useRef, useState } from 'react'
import type { FaceLandmarker } from '@mediapipe/tasks-vision'
import { sendNonVerbalData, type NonVerbalFrame } from '@/api/ai-interviews'
import {
  frameMetrics,
  irisCenterPosition,
} from '@/components/interview/face-metrics'

// BE(AiInterviewAsyncServiceImpl.nonVerbalDataAnalysisAsync)가 프레임 벡터를 집계하는
// 주기와 맞춘다.
const SAMPLE_FPS = 5
// 캘리브레이션 없이 눈알만 굴렸을 때 실측 편차가 BE 임계값(0.4)에 못 미쳐서(최대 0.3대),
// 화면 중심(0.5) 기준 편차를 증폭해 화면 좌표로 환산한다. 값을 올릴수록 완전히 옆을 보지
// 않아도 이탈로 잡히지만, 정중앙 응시 시의 노이즈(약 0.10~0.14)도 같이 커져서 오탐 위험이
// 늘어난다 — 실측값(정중앙 0.10, 대각선 0.32) 기준으로 잡은 값.
const GAZE_SENSITIVITY_GAIN = 3
const WASM_PATH = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm'
// 학습 때 쓴 모델과 반드시 같은 파일이어야 한다(ai-evaluate/README.md 4-1 참고).
const DEFAULT_MODEL_ASSET_PATH =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'
const MODEL_ASSET_PATH =
  import.meta.env.VITE_FACE_LANDMARKER_MODEL_URL || DEFAULT_MODEL_ASSET_PATH

// 0.5(화면 중앙)를 기준으로 편차를 GAZE_SENSITIVITY_GAIN배 증폭한다. 0~1을 벗어나면
// 화면 밖 좌표가 되어버리니 가장자리에서 saturate 시킨다.
function amplifyAroundCenter(ratio: number, gain: number) {
  return Math.min(Math.max(0.5 + (ratio - 0.5) * gain, 0), 1)
}

export type NonVerbalCaptureStatus =
  | 'idle'
  | 'capturing'
  | 'sending'
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
    numFaces: 1,
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

// 답변 녹화 구간의 표정·시선 원시 프레임을 MediaPipe로 샘플링해 BE의 /non-verbal에 전송한다.
// BE가 이 프레임으로 시선 이탈 점수를 자체 계산하고, 표정은 ai-evaluate에 대신 물어봐서
// 점수를 받아 리포트에 반영한다 — 이 훅은 캡처와 전송만 책임지고 점수를 돌려받지 않는다.
export function useNonVerbalCapture(
  stream: MediaStream | null,
  aiInterviewId: number | null,
) {
  const [status, setStatus] = useState<NonVerbalCaptureStatus>('idle')
  const [error, setError] = useState<string | null>(null)

  const landmarkerPromiseRef = useRef<Promise<FaceLandmarker> | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const framesRef = useRef<NonVerbalFrame[]>([])
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
    if (status === 'capturing' || videoTracks.length === 0 || aiInterviewId === null) {
      return
    }

    const generation = generationRef.current + 1
    generationRef.current = generation
    framesRef.current = []
    setError(null)
    setStatus('capturing')

    const video = document.createElement('video')
    video.muted = true
    video.playsInline = true
    video.srcObject = new MediaStream(videoTracks)
    videoRef.current = video
    startedAtRef.current = performance.now()
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

          const { ear, mar } = frameMetrics(landmarks)
          const iris = irisCenterPosition(landmarks)
          // BE가 screen_width/height 기준의 유클리드 거리 비율로 시선 이탈을 계산하므로,
          // gaze_x/y도 같은 모니터 해상도 기준이어야 한다 — 웹캠 프레임 좌표를 쓰면 화면 중심 이탈을 잘못 판정한다.
          const amplifiedX = amplifyAroundCenter(iris.x, GAZE_SENSITIVITY_GAIN)
          const amplifiedY = amplifyAroundCenter(iris.y, GAZE_SENSITIVITY_GAIN)
          const gazeX = amplifiedX * window.screen.width
          const gazeY = amplifiedY * window.screen.height
          framesRef.current.push({
            timestamp: (performance.now() - startedAtRef.current) / 1000,
            gaze_x: gazeX,
            gaze_y: gazeY,
            blendshapes: blendshapeCategories.map((category) => category.score),
            ear,
            mar,
          })
        }, intervalMs)
      })
      .catch(() => {
        if (generationRef.current !== generation) return
        stopSampling()
        setStatus('error')
        setError('표정·시선 인식 모델을 불러오지 못했습니다.')
      })
  }, [aiInterviewId, ensureLandmarker, status, stopSampling, stream])

  const stopCapture = useCallback(() => {
    if (status !== 'capturing') return
    const generation = generationRef.current
    const videoWidth = videoRef.current?.videoWidth ?? 0
    const videoHeight = videoRef.current?.videoHeight ?? 0
    const durationSec = (performance.now() - startedAtRef.current) / 1000
    const frames = framesRef.current
    stopSampling()

    if (
      frames.length === 0 ||
      aiInterviewId === null ||
      videoWidth === 0 ||
      videoHeight === 0
    ) {
      setStatus('idle')
      return
    }

    setStatus('sending')
    sendNonVerbalData({
      aiInterviewId,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      fps: SAMPLE_FPS,
      durationSec,
      frames,
    })
      .then(() => {
        if (generationRef.current !== generation) return
        setStatus('done')
      })
      .catch(() => {
        if (generationRef.current !== generation) return
        setStatus('error')
        setError('행동 데이터 전송에 실패했습니다.')
      })
  }, [aiInterviewId, status, stopSampling])

  const reset = useCallback(() => {
    generationRef.current += 1
    stopSampling()
    framesRef.current = []
    setStatus('idle')
    setError(null)
  }, [stopSampling])

  return { status, error, startCapture, stopCapture, reset }
}
