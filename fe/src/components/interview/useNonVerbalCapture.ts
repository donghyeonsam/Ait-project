import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  FaceLandmarker,
  FaceLandmarkerResult,
  NormalizedLandmark,
} from '@mediapipe/tasks-vision'
import type {
  InterviewNonVerbalData,
  NonVerbalFrame,
} from '@/api/ai-interviews'

const TARGET_FPS = 5
const SAMPLE_INTERVAL_MS = 1000 / TARGET_FPS
const WASM_ASSET_URL =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm'
const FACE_LANDMARKER_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'

function distance(
  first: NormalizedLandmark,
  second: NormalizedLandmark,
) {
  return Math.hypot(first.x - second.x, first.y - second.y)
}

function ratio(value: number, first: number, second: number) {
  const minimum = Math.min(first, second)
  const maximum = Math.max(first, second)
  if (maximum === minimum) return 0.5
  return Math.min(1, Math.max(0, (value - minimum) / (maximum - minimum)))
}

function eyeAspectRatio(
  landmarks: NormalizedLandmark[],
  indices: [number, number, number, number, number, number],
) {
  const [outer, upperOuter, upperInner, inner, lowerInner, lowerOuter] =
    indices.map((index) => landmarks[index])
  if (
    !outer ||
    !upperOuter ||
    !upperInner ||
    !inner ||
    !lowerInner ||
    !lowerOuter
  ) {
    return 0
  }

  const width = distance(outer, inner)
  if (width === 0) return 0
  return (
    (distance(upperOuter, lowerOuter) +
      distance(upperInner, lowerInner)) /
    (2 * width)
  )
}

function gazeRatio(
  landmarks: NormalizedLandmark[],
  irisIndex: number,
  horizontalIndices: [number, number],
  verticalIndices: [number, number],
) {
  const iris = landmarks[irisIndex]
  const horizontalStart = landmarks[horizontalIndices[0]]
  const horizontalEnd = landmarks[horizontalIndices[1]]
  const verticalStart = landmarks[verticalIndices[0]]
  const verticalEnd = landmarks[verticalIndices[1]]
  if (
    !iris ||
    !horizontalStart ||
    !horizontalEnd ||
    !verticalStart ||
    !verticalEnd
  ) {
    return { x: 0.5, y: 0.5 }
  }

  return {
    x: ratio(iris.x, horizontalStart.x, horizontalEnd.x),
    y: ratio(iris.y, verticalStart.y, verticalEnd.y),
  }
}

function toNonVerbalFrame(
  result: FaceLandmarkerResult,
  timestamp: number,
  width: number,
  height: number,
): NonVerbalFrame | null {
  const landmarks = result.faceLandmarks[0]
  if (!landmarks) return null

  const rightGaze = gazeRatio(landmarks, 468, [33, 133], [159, 145])
  const leftGaze = gazeRatio(landmarks, 473, [362, 263], [386, 374])
  const rightEar = eyeAspectRatio(
    landmarks,
    [33, 160, 158, 133, 153, 144],
  )
  const leftEar = eyeAspectRatio(
    landmarks,
    [362, 385, 387, 263, 373, 380],
  )
  const mouthLeft = landmarks[61]
  const mouthRight = landmarks[291]
  const mouthUpper = landmarks[13]
  const mouthLower = landmarks[14]
  const mouthWidth =
    mouthLeft && mouthRight ? distance(mouthLeft, mouthRight) : 0
  const mar =
    mouthWidth > 0 && mouthUpper && mouthLower
      ? distance(mouthUpper, mouthLower) / mouthWidth
      : 0

  const blendshapeByIndex = new Map(
    (result.faceBlendshapes[0]?.categories ?? []).map((category) => [
      category.index,
      category.score,
    ]),
  )

  return {
    timestamp,
    gaze_x: ((rightGaze.x + leftGaze.x) / 2) * width,
    gaze_y: ((rightGaze.y + leftGaze.y) / 2) * height,
    blendshapes: Array.from(
      { length: 52 },
      (_, index) => blendshapeByIndex.get(index) ?? 0,
    ),
    ear: (rightEar + leftEar) / 2,
    mar,
  }
}

// 면접 카메라에서 얼굴 랜드마크를 5fps로 추출하고 종료 시 전송 가능한 데이터로 묶는다.
export function useNonVerbalCapture(stream: MediaStream | null) {
  const [error, setError] = useState<string | null>(null)
  const framesRef = useRef<NonVerbalFrame[]>([])
  const startedAtRef = useRef<number | null>(null)
  const lastSampleAtRef = useRef(0)
  const frameRequestRef = useRef<number | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const landmarkerRef = useRef<FaceLandmarker | null>(null)
  const finishedDataRef = useRef<InterviewNonVerbalData | null>(null)
  const isFinishedRef = useRef(false)
  const generationRef = useRef(0)

  const stopFrameLoop = useCallback(() => {
    if (frameRequestRef.current !== null) {
      cancelAnimationFrame(frameRequestRef.current)
      frameRequestRef.current = null
    }
  }, [])

  const finishCapture = useCallback(() => {
    if (finishedDataRef.current) return finishedDataRef.current
    isFinishedRef.current = true
    stopFrameLoop()

    const startedAt = startedAtRef.current
    const video = videoRef.current
    if (startedAt === null || !video || framesRef.current.length === 0) {
      return null
    }

    const durationSec = Math.max((performance.now() - startedAt) / 1000, 0.2)
    const data: InterviewNonVerbalData = {
      screen_width: video.videoWidth || window.innerWidth,
      screen_height: video.videoHeight || window.innerHeight,
      fps: framesRef.current.length / durationSec,
      duration_sec: durationSec,
      frames: [...framesRef.current],
    }
    finishedDataRef.current = data
    return data
  }, [stopFrameLoop])

  useEffect(() => {
    const videoTracks = stream?.getVideoTracks() ?? []
    if (videoTracks.length === 0) return

    const generation = generationRef.current + 1
    generationRef.current = generation
    framesRef.current = []
    finishedDataRef.current = null
    isFinishedRef.current = false
    lastSampleAtRef.current = 0
    startedAtRef.current = performance.now()

    const video = document.createElement('video')
    video.muted = true
    video.playsInline = true
    video.srcObject = new MediaStream(videoTracks)
    videoRef.current = video

    const startCapture = async () => {
      try {
        const { FaceLandmarker, FilesetResolver } = await import(
          '@mediapipe/tasks-vision'
        )
        const fileset = await FilesetResolver.forVisionTasks(WASM_ASSET_URL)
        const landmarker = await FaceLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: FACE_LANDMARKER_MODEL_URL },
          runningMode: 'VIDEO',
          numFaces: 1,
          outputFaceBlendshapes: true,
          minFaceDetectionConfidence: 0.5,
          minFacePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        })
        if (generationRef.current !== generation) {
          landmarker.close()
          return
        }

        landmarkerRef.current = landmarker
        await video.play()
        if (
          generationRef.current !== generation ||
          isFinishedRef.current
        ) {
          return
        }
        setError(null)

        const captureFrame = (now: number) => {
          if (
            generationRef.current !== generation ||
            isFinishedRef.current
          ) {
            return
          }
          if (
            video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
            now - lastSampleAtRef.current >= SAMPLE_INTERVAL_MS
          ) {
            lastSampleAtRef.current = now
            try {
              const result = landmarker.detectForVideo(video, now)
              const frame = toNonVerbalFrame(
                result,
                (now - (startedAtRef.current ?? now)) / 1000,
                video.videoWidth || window.innerWidth,
                video.videoHeight || window.innerHeight,
              )
              if (frame) framesRef.current.push(frame)
            } catch {
              setError(
                '카메라 표정 분석이 중단되었습니다. 음성 면접은 계속 진행할 수 있습니다.',
              )
              return
            }
          }
          frameRequestRef.current = requestAnimationFrame(captureFrame)
        }

        frameRequestRef.current = requestAnimationFrame(captureFrame)
      } catch {
        if (generationRef.current === generation) {
          setError(
            '카메라 표정 분석을 시작하지 못했습니다. 음성 면접은 계속 진행할 수 있습니다.',
          )
        }
      }
    }

    void startCapture()

    return () => {
      generationRef.current += 1
      stopFrameLoop()
      landmarkerRef.current?.close()
      landmarkerRef.current = null
      video.pause()
      video.srcObject = null
      if (videoRef.current === video) videoRef.current = null
    }
  }, [stopFrameLoop, stream])

  return { error, finishCapture }
}
