// MediaPipe FaceLandmarker의 홍채 랜드마크(468~477)로 눈동자가 눈 안 어디에 있는지를 계산한다.
// 인덱스는 @mediapipe/tasks-vision의 FaceLandmarker.FACE_LANDMARKS_*_EYE/_IRIS 상수에서 확인한
// 실제 값이다(468/473 = 각 눈 홍채 중심, 나머지는 홍채 테두리 4점).

export interface NormalizedPoint {
  x: number
  y: number
}

interface EyeIndexes {
  outerCorner: number
  innerCorner: number
  upperLid: number
  lowerLid: number
  irisCenter: number
}

const EYE_A: EyeIndexes = {
  outerCorner: 33,
  innerCorner: 133,
  upperLid: 159,
  lowerLid: 145,
  irisCenter: 468,
}
const EYE_B: EyeIndexes = {
  outerCorner: 263,
  innerCorner: 362,
  upperLid: 386,
  lowerLid: 374,
  irisCenter: 473,
}

// 눈 소켓 안에서 홍채 중심의 상대 위치(0~1). 0.5에 가까울수록 눈 중앙 = 정면에 가깝다.
function eyeGazeRatio(points: NormalizedPoint[], eye: EyeIndexes) {
  const outer = points[eye.outerCorner]
  const inner = points[eye.innerCorner]
  const upper = points[eye.upperLid]
  const lower = points[eye.lowerLid]
  const iris = points[eye.irisCenter]

  const width = Math.abs(outer.x - inner.x)
  const height = Math.abs(lower.y - upper.y)
  const minX = Math.min(outer.x, inner.x)
  const minY = Math.min(upper.y, lower.y)

  return {
    horizontal: width < 1e-6 ? 0.5 : (iris.x - minX) / width,
    vertical: height < 1e-6 ? 0.5 : (iris.y - minY) / height,
  }
}

export interface GazeFrameMetrics {
  horizontal: number
  vertical: number
  /** 눈 소켓 중심(0.5, 0.5) 대비 홍채 위치의 이탈 거리. */
  offset: number
}

export function gazeFrameMetrics(landmarks: NormalizedPoint[]): GazeFrameMetrics {
  const a = eyeGazeRatio(landmarks, EYE_A)
  const b = eyeGazeRatio(landmarks, EYE_B)
  const horizontal = (a.horizontal + b.horizontal) / 2
  const vertical = (a.vertical + b.vertical) / 2
  return {
    horizontal,
    vertical,
    offset: Math.hypot(horizontal - 0.5, vertical - 0.5),
  }
}

// 실측 데이터로 튜닝이 필요한 경험적 기본값(ai-evaluate의 임계값들과 같은 성격).
export const GAZE_OFFSCREEN_THRESHOLD = 0.2

export function isLookingOnScreen(metrics: GazeFrameMetrics) {
  return metrics.offset <= GAZE_OFFSCREEN_THRESHOLD
}
