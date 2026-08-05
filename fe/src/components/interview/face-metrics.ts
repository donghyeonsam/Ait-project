// MediaPipe FaceLandmarker 프레임 1장에서 EAR/MAR/deviation을 계산한다.
// ⚠️ ai-evaluate의 core/face/landmark_metrics.py와 인덱스·수식이 정확히 같아야 한다.
// 바꿀 일이 있다면 양쪽을 함께 고치고 training/face/verify_parity.py로 일치 여부를 확인할 것.

export interface NormalizedPoint {
  x: number
  y: number
}

const LEFT_EYE = [33, 133, 159, 145, 158, 153]
const RIGHT_EYE = [362, 263, 386, 374, 385, 380]
const MOUTH = [61, 291, 13, 14]
const LEFT_IRIS_CENTER = 468
const RIGHT_IRIS_CENTER = 473

function dist(a: NormalizedPoint, b: NormalizedPoint) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

// 눈/입의 열린 정도. 수직거리 평균을 수평거리로 나눠 카메라와의 거리에 무관하게 만든다.
function aspectRatio(points: NormalizedPoint[], indexes: number[]) {
  const horizontal = dist(points[indexes[0]], points[indexes[1]])
  if (horizontal < 1e-6) return 0
  let vertical = dist(points[indexes[2]], points[indexes[3]])
  if (indexes.length >= 6) {
    vertical = (vertical + dist(points[indexes[4]], points[indexes[5]])) / 2
  }
  return vertical / horizontal
}

export interface FrameMetrics {
  ear: number
  mar: number
}

export function frameMetrics(landmarks: NormalizedPoint[]): FrameMetrics {
  const ear =
    (aspectRatio(landmarks, LEFT_EYE) + aspectRatio(landmarks, RIGHT_EYE)) / 2
  const mar = aspectRatio(landmarks, MOUTH)
  return { ear, mar }
}

// BE가 시선 이탈 점수를 계산할 gaze_x/gaze_y의 재료. 코끝은 고개를 돌리거나 눈만 움직여도
// 거의 이동하지 않아 시선 대리 지표로 부적합해서, 실제 눈동자가 향하는 홍채 중심 좌표를 쓴다.
export function irisCenterPosition(landmarks: NormalizedPoint[]): NormalizedPoint {
  const left = landmarks[LEFT_IRIS_CENTER]
  const right = landmarks[RIGHT_IRIS_CENTER]
  return { x: (left.x + right.x) / 2, y: (left.y + right.y) / 2 }
}
