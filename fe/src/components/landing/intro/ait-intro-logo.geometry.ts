// 공식 가로형 로고를 파트별로 떼어내 애니메이션하기 위한 실측 좌표와 타임라인이다.

/** 실측 기준이 되는 원본 캔버스 크기(`primary/ait-logo-horizontal-2048.png`). */
export const LOGO_BOX = { width: 2048, height: 935 } as const

/** 인트로에서 쓰는 로고 이미지로, 랜딩 헤더와 같은 파일이라 캐시를 함께 쓴다. */
export const LOGO_SRC = '/Logo_Assets/web/ait-logo-horizontal.webp'

export interface LogoRect {
  x0: number
  y0: number
  x1: number
  y1: number
}

// 심볼·A·i·t는 완전히 투명한 열로, i의 머리와 몸통은 투명한 행으로 분리돼 있어
// 사각 클립만으로 원본 픽셀을 변형 없이 떼어낼 수 있다.
export const LOGO_PARTS = {
  symbol: { x0: 0, y0: 0, x1: 955, y1: 935 },
  letterA: { x0: 955, y0: 0, x1: 1530, y1: 935 },
  letterIHead: { x0: 1530, y0: 0, x1: 1700, y1: 392 },
  letterIBody: { x0: 1530, y0: 392, x1: 1700, y1: 935 },
  letterT: { x0: 1700, y0: 0, x1: 2048, y1: 935 },
  // 렌즈는 프레임 상단 갭 안에 떠 있어 주변 잉크와 닿지 않는다.
  lens: { x0: 425, y0: 0, x1: 605, y1: 247 },
  // 넥타이는 네이비 몸통 위에 얹힌 골드라 사각 클립에 몸통 네이비가 함께 들어온다.
  // 이 조각을 몸통 위에 겹쳐 두면 남는 네이비가 몸통과 같은 색이라 드러나지 않는다.
  tie: { x0: 1583, y0: 413, x1: 1646, y1: 580 },
} satisfies Record<string, LogoRect>

/** 웹캠 렌즈의 실측 원 정보로, 골드 원과 네이비 링을 SVG로 되짚어 그릴 때 쓴다. */
export const LENS = {
  cx: 515.3,
  cy: 156,
  goldRadius: 36.75,
  outerRadius: 79.5,
  /** 원본 렌즈만 정확히 덜어내고 프레임 잉크에는 닿지 않는 크기다. */
  holeRadius: 84,
} as const

/**
 * 웹캠 프레임 테두리의 실측 중심선이다. 두께는 55이고 외곽 모서리 반지름은 141.5다.
 * 상단 갭에는 렌즈가, 하단 갭에는 A의 두 다리가 지난다.
 */
export const FRAME = {
  left: 103,
  right: 909,
  top: 181.5,
  bottom: 760.5,
  radius: 114.2,
  topGap: { left: 415, right: 615 },
  /** 하단 갭 바로 옆, A의 다리가 테두리를 지나는 지점에서 원이 출발한다. */
  start: { left: 330, right: 684 },
} as const

/** 테두리를 타고 도는 동안 원은 테두리 두께 안에 들어오는 크기로 줄어든다. */
export const SPARK_TRACK_SCALE = 0.66

/** 넥타이가 매달리는 깃 지점으로, 매듭 상단 중앙이다. */
export const TIE_PIVOT = { x: 1614, y: 413 } as const

/** 심볼 잉크(x 76~936, y 77~858)의 중심으로, 확대·이동의 기준점이다. */
export const SYMBOL_CENTER = { x: 506, y: 467.5 } as const

/** 심볼 단독 노출 구간에서 심볼을 캔버스 중앙에 맞추기 위한 이동량이다. */
export const SYMBOL_SOLO_SHIFT = LOGO_BOX.width / 2 - SYMBOL_CENTER.x

/** 심볼 단독 노출 구간의 확대 배율이다. */
export const SYMBOL_SOLO_SCALE = 1.16

// 단계별 시작 시각(초)이며, 값을 조정하면 연출 호흡만 바뀌고 조립 좌표는 영향받지 않는다.
export const INTRO_TIMELINE = {
  symbolIn: { at: 0, duration: 0.32 },
  /** 원 2개가 A 다리 옆에서 출발해 테두리를 타고 상단 갭까지 돌아 렌즈 자리로 모인다. */
  travel: { at: 0.24, duration: 0.9 },
  /** 골드 원이 합쳐지며 네이비 링이 닫힌다. */
  lensForm: { at: 1.12, duration: 0.28 },
  /** 되짚어 그린 렌즈를 원본 렌즈 픽셀로 바꿔 끼운다. */
  lensSwap: { at: 1.44 },
  symbolSlide: { at: 1.48, duration: 0.52 },
  /** A·i·t를 한 번에 페이드인해 실제 화면까지 걸리는 시간을 줄인다. */
  letters: { at: 1.94, duration: 0.34 },
  tie: { at: 2.26, duration: 0.5 },
  /** 풀로고가 완성된 뒤 페이드 아웃으로 넘기는 시각이다. */
  complete: { at: 2.9 },
} as const

interface Point {
  x: number
  y: number
}

export interface TravelPath {
  x: number[]
  y: number[]
  times: number[]
}

const ARC_STEPS = 14
const PATH_SAMPLES = 32

// 좌표에 가감속을 미리 반영해 두고 keyframe 간격은 균등하게 둔다.
// framer-motion은 keyframe 구간마다 easing을 되풀이하므로, 이렇게 해야 코너에서 속도가 튀지 않는다.
const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2

function arcPoints(
  center: Point,
  radius: number,
  fromDegree: number,
  toDegree: number,
): Point[] {
  const points: Point[] = []
  for (let step = 0; step <= ARC_STEPS; step += 1) {
    const radian =
      ((fromDegree + ((toDegree - fromDegree) * step) / ARC_STEPS) * Math.PI) / 180
    points.push({
      x: center.x + radius * Math.cos(radian),
      y: center.y + radius * Math.sin(radian),
    })
  }
  return points
}

/** 꺾은선을 길이 기준으로 다시 뽑아, 균등한 시간 간격의 keyframe으로 만든다. */
function resamplePath(points: Point[]): TravelPath {
  const lengths = [0]
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1]
    const current = points[index]
    lengths.push(
      lengths[index - 1] + Math.hypot(current.x - previous.x, current.y - previous.y),
    )
  }

  const total = lengths[lengths.length - 1]
  const path: TravelPath = { x: [], y: [], times: [] }

  for (let sample = 0; sample <= PATH_SAMPLES; sample += 1) {
    const time = sample / PATH_SAMPLES
    const target = easeInOutCubic(time) * total

    let segment = 1
    while (segment < lengths.length - 1 && lengths[segment] < target) {
      segment += 1
    }

    const from = points[segment - 1]
    const to = points[segment]
    const span = lengths[segment] - lengths[segment - 1] || 1
    const ratio = (target - lengths[segment - 1]) / span

    path.x.push(Number((from.x + (to.x - from.x) * ratio).toFixed(2)))
    path.y.push(Number((from.y + (to.y - from.y) * ratio).toFixed(2)))
    path.times.push(time)
  }

  return path
}

// 하단 갭 옆에서 출발해 모서리를 돌아 테두리를 타고 올라간 뒤, 상단 갭 끝에서 렌즈로 들어간다.
function traceBorder(side: 'left' | 'right'): TravelPath {
  const isLeft = side === 'left'
  const nearX = isLeft ? FRAME.left : FRAME.right
  const cornerX = isLeft ? FRAME.left + FRAME.radius : FRAME.right - FRAME.radius
  const gapX = isLeft ? FRAME.topGap.left : FRAME.topGap.right
  const startX = isLeft ? FRAME.start.left : FRAME.start.right

  return resamplePath([
    { x: startX, y: FRAME.bottom },
    { x: cornerX, y: FRAME.bottom },
    ...arcPoints(
      { x: cornerX, y: FRAME.bottom - FRAME.radius },
      FRAME.radius,
      90,
      isLeft ? 180 : 0,
    ),
    { x: nearX, y: FRAME.top + FRAME.radius },
    ...arcPoints(
      { x: cornerX, y: FRAME.top + FRAME.radius },
      FRAME.radius,
      isLeft ? 180 : 0,
      isLeft ? 270 : -90,
    ),
    { x: gapX, y: FRAME.top },
    { x: LENS.cx, y: LENS.cy },
  ])
}

/** 좌우 원이 각각 따라갈 테두리 경로다. */
export const TRAVEL_PATHS = {
  left: traceBorder('left'),
  right: traceBorder('right'),
} as const

const percentX = (value: number) => (value / LOGO_BOX.width) * 100
const percentY = (value: number) => (value / LOGO_BOX.height) * 100

/** 사각 좌표를 캔버스 비율 기준 `clip-path: inset()` 문자열로 바꾼다. */
export function clipRect({ x0, y0, x1, y1 }: LogoRect) {
  const top = percentY(y0)
  const right = percentX(LOGO_BOX.width - x1)
  const bottom = percentY(LOGO_BOX.height - y1)
  const left = percentX(x0)
  return `inset(${top}% ${right}% ${bottom}% ${left}%)`
}

/**
 * 심볼에서 렌즈 자리만 비워 두는 마스크다.
 * 배경색 원으로 덮으면 배경이 단색일 때만 통하므로, 아예 픽셀을 덜어낸다.
 * 캔버스 비율이 고정이라 타원 반지름을 축별 비율로 주면 정원이 된다.
 */
export function lensHoleMask() {
  const radiusX = percentX(LENS.holeRadius)
  const radiusY = percentY(LENS.holeRadius)
  return `radial-gradient(ellipse ${radiusX}% ${radiusY}% at ${percentX(LENS.cx)}% ${percentY(LENS.cy)}%, transparent 99%, #000 100%)`
}

/** 캔버스 좌표를 `transform-origin` 문자열로 바꾼다. */
export function originAt({ x, y }: { x: number; y: number }) {
  return `${percentX(x)}% ${percentY(y)}%`
}

// transform의 translate 비율은 각각 요소의 폭·높이를 기준으로 하므로 축별로 나눠 쓴다.

/** 캔버스 가로 길이를 `transform: translateX()`에 넘길 비율 문자열로 바꾼다. */
export function shiftX(value: number) {
  return `${percentX(value)}%`
}

/** 캔버스 세로 길이를 `transform: translateY()`에 넘길 비율 문자열로 바꾼다. */
export function shiftY(value: number) {
  return `${percentY(value)}%`
}
