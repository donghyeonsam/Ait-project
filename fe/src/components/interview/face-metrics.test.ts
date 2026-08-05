import { describe, expect, it } from 'vitest'
import {
  frameMetrics,
  irisCenterPosition,
  type NormalizedPoint,
} from '@/components/interview/face-metrics'

// MediaPipe FaceLandmarker 인덱스에 맞춰, 계산에 쓰이는 지점만 채운 478개 랜드마크를 만든다.
function buildLandmarks(overrides: Record<number, NormalizedPoint>) {
  const landmarks: NormalizedPoint[] = Array.from({ length: 478 }, () => ({
    x: 0,
    y: 0,
  }))
  for (const [index, point] of Object.entries(overrides)) {
    landmarks[Number(index)] = point
  }
  return landmarks
}

describe('frameMetrics', () => {
  it('눈을 크게 뜨면 감았을 때보다 ear 값이 크다', () => {
    const openEyes = buildLandmarks({
      33: { x: 0, y: 0 },
      133: { x: 0.3, y: 0 },
      159: { x: 0.15, y: 0 },
      145: { x: 0.15, y: 0.2 },
      158: { x: 0.16, y: 0 },
      153: { x: 0.16, y: 0.2 },
      362: { x: 0.6, y: 0 },
      263: { x: 0.9, y: 0 },
      386: { x: 0.75, y: 0 },
      374: { x: 0.75, y: 0.2 },
      385: { x: 0.76, y: 0 },
      380: { x: 0.76, y: 0.2 },
      61: { x: 0.4, y: 0.5 },
      291: { x: 0.6, y: 0.5 },
      13: { x: 0.5, y: 0.5 },
      14: { x: 0.5, y: 0.5 },
      1: { x: 0.5, y: 0.5 },
    })
    const closedEyes = buildLandmarks({
      33: { x: 0, y: 0 },
      133: { x: 0.3, y: 0 },
      159: { x: 0.15, y: 0 },
      145: { x: 0.15, y: 0.02 },
      158: { x: 0.16, y: 0 },
      153: { x: 0.16, y: 0.02 },
      362: { x: 0.6, y: 0 },
      263: { x: 0.9, y: 0 },
      386: { x: 0.75, y: 0 },
      374: { x: 0.75, y: 0.02 },
      385: { x: 0.76, y: 0 },
      380: { x: 0.76, y: 0.02 },
      61: { x: 0.4, y: 0.5 },
      291: { x: 0.6, y: 0.5 },
      13: { x: 0.5, y: 0.5 },
      14: { x: 0.5, y: 0.5 },
      1: { x: 0.5, y: 0.5 },
    })

    expect(frameMetrics(openEyes).ear).toBeGreaterThan(
      frameMetrics(closedEyes).ear,
    )
  })

  it('입을 벌리면 다물었을 때보다 mar 값이 크다', () => {
    const base = {
      33: { x: 0, y: 0 },
      133: { x: 0.3, y: 0 },
      159: { x: 0.15, y: 0 },
      145: { x: 0.15, y: 0.1 },
      158: { x: 0.16, y: 0 },
      153: { x: 0.16, y: 0.1 },
      362: { x: 0.6, y: 0 },
      263: { x: 0.9, y: 0 },
      386: { x: 0.75, y: 0 },
      374: { x: 0.75, y: 0.1 },
      385: { x: 0.76, y: 0 },
      380: { x: 0.76, y: 0.1 },
      1: { x: 0.5, y: 0.5 },
    }
    const openMouth = buildLandmarks({
      ...base,
      61: { x: 0.4, y: 0.5 },
      291: { x: 0.6, y: 0.5 },
      13: { x: 0.5, y: 0.45 },
      14: { x: 0.5, y: 0.65 },
    })
    const closedMouth = buildLandmarks({
      ...base,
      61: { x: 0.4, y: 0.5 },
      291: { x: 0.6, y: 0.5 },
      13: { x: 0.5, y: 0.5 },
      14: { x: 0.5, y: 0.5 },
    })

    expect(frameMetrics(openMouth).mar).toBeGreaterThan(
      frameMetrics(closedMouth).mar,
    )
  })

})

describe('irisCenterPosition', () => {
  it('양쪽 눈 소켓 안에서 홍채가 치우친 비율(0~1)의 평균을 반환한다', () => {
    const landmarks = buildLandmarks({
      // 왼쪽 눈: 가로 [0.30, 0.40], 세로 [0.10, 0.20] 소켓 안에 홍채가 정중앙(0.5, 0.5)
      33: { x: 0.3, y: 0 },
      133: { x: 0.4, y: 0 },
      159: { x: 0.35, y: 0.1 },
      145: { x: 0.35, y: 0.2 },
      158: { x: 0.36, y: 0.1 },
      153: { x: 0.36, y: 0.2 },
      468: { x: 0.35, y: 0.15 },
      // 오른쪽 눈: 가로 [0.60, 0.70], 세로 [0.10, 0.20] 소켓 안에 홍채가 (0.8, 0.2) 위치
      362: { x: 0.6, y: 0 },
      263: { x: 0.7, y: 0 },
      386: { x: 0.65, y: 0.1 },
      374: { x: 0.65, y: 0.2 },
      385: { x: 0.66, y: 0.1 },
      380: { x: 0.66, y: 0.2 },
      473: { x: 0.68, y: 0.12 },
    })

    const result = irisCenterPosition(landmarks)
    // 왼쪽(0.5, 0.5)과 오른쪽(0.8, 0.2)의 평균
    expect(result.x).toBeCloseTo(0.65, 10)
    expect(result.y).toBeCloseTo(0.35, 10)
  })

  it('고개 위치와 무관하게 눈 소켓 안 상대 위치만 본다 — 얼굴이 프레임 반대편으로 이동해도 결과가 같다', () => {
    const makeLandmarks = (offsetX: number, offsetY: number) =>
      buildLandmarks({
        33: { x: 0.3 + offsetX, y: 0 + offsetY },
        133: { x: 0.4 + offsetX, y: 0 + offsetY },
        159: { x: 0.35 + offsetX, y: 0.1 + offsetY },
        145: { x: 0.35 + offsetX, y: 0.2 + offsetY },
        158: { x: 0.36 + offsetX, y: 0.1 + offsetY },
        153: { x: 0.36 + offsetX, y: 0.2 + offsetY },
        468: { x: 0.38 + offsetX, y: 0.18 + offsetY },
        362: { x: 0.6 + offsetX, y: 0 + offsetY },
        263: { x: 0.7 + offsetX, y: 0 + offsetY },
        386: { x: 0.65 + offsetX, y: 0.1 + offsetY },
        374: { x: 0.65 + offsetX, y: 0.2 + offsetY },
        385: { x: 0.66 + offsetX, y: 0.1 + offsetY },
        380: { x: 0.66 + offsetX, y: 0.2 + offsetY },
        473: { x: 0.68 + offsetX, y: 0.14 + offsetY },
      })

    const centered = irisCenterPosition(makeLandmarks(0, 0))
    const headMovedRight = irisCenterPosition(makeLandmarks(0.2, 0.1))

    expect(headMovedRight.x).toBeCloseTo(centered.x, 10)
    expect(headMovedRight.y).toBeCloseTo(centered.y, 10)
  })
})
