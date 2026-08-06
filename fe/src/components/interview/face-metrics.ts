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

// 눈 소켓(눈꼬리~눈꺼풀) 테두리 안에서 홍채가 얼마나 치우쳤는지를 0~1 비율로 구한다.
// 홍채의 프레임 절대 좌표를 쓰면 고개 위치에 압도돼 눈알만 굴리는 움직임이 거의 안 잡히므로,
// 같은 눈의 코너·눈꺼풀 랜드마크 대비 상대 위치로 정규화해 고개 위치와 무관하게 만든다.
function relativeIrisPosition(
  points: NormalizedPoint[],
  eyeIndexes: number[],
  irisIndex: number,
): NormalizedPoint {
  const [outer, inner, topA, bottomA, topB, bottomB] = eyeIndexes.map(
    (index) => points[index],
  )
  const iris = points[irisIndex]

  const minX = Math.min(outer.x, inner.x)
  const maxX = Math.max(outer.x, inner.x)
  const width = maxX - minX

  const ys = [topA.y, bottomA.y, topB.y, bottomB.y]
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const height = maxY - minY

  return {
    x: width < 1e-6 ? 0.5 : (iris.x - minX) / width,
    y: height < 1e-6 ? 0.5 : (iris.y - minY) / height,
  }
}

// BE가 시선 이탈 점수를 계산할 gaze_x/gaze_y의 재료. 좌우 눈의 상대 홍채 위치 비율을 평균낸다.
export function irisCenterPosition(landmarks: NormalizedPoint[]): NormalizedPoint {
  const left = relativeIrisPosition(landmarks, LEFT_EYE, LEFT_IRIS_CENTER)
  const right = relativeIrisPosition(landmarks, RIGHT_EYE, RIGHT_IRIS_CENTER)
  return { x: (left.x + right.x) / 2, y: (left.y + right.y) / 2 }
}

// 홍채 상대 위치(irisCenterPosition)는 고개 위치와 무관하도록 설계돼 있어서, 얼굴 자체가
// 화면 옆으로 치우쳐도 잡히지 않는다. 이 함수는 반대로 "얼굴이 프레임 중앙에서 벗어났는지"를
// 보기 위한 것으로, 랜드마크 전체의 바운딩 박스 중심을 얼굴 위치로 근사한다.
// BE로 전송하지 않는 FE 전용 UI 판단용이라 ai-evaluate와 수식을 맞출 필요는 없다.
export function faceCenterPosition(landmarks: NormalizedPoint[]): NormalizedPoint {
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (const point of landmarks) {
    if (point.x < minX) minX = point.x
    if (point.x > maxX) maxX = point.x
    if (point.y < minY) minY = point.y
    if (point.y > maxY) maxY = point.y
  }
  return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 }
}
