import { describe, expect, it } from 'vitest'
import { frameMetrics, type NormalizedPoint } from '@/components/interview/face-metrics'

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

  it('코끝이 화면 중앙일 때 deviation은 0이다', () => {
    const landmarks = buildLandmarks({
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
      61: { x: 0.4, y: 0.5 },
      291: { x: 0.6, y: 0.5 },
      13: { x: 0.5, y: 0.5 },
      14: { x: 0.5, y: 0.5 },
      1: { x: 0.5, y: 0.5 },
    })

    expect(frameMetrics(landmarks).deviation).toBe(0)
  })

  it('코끝이 중앙에서 벗어난 만큼 deviation이 커진다', () => {
    const landmarks = buildLandmarks({
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
      61: { x: 0.4, y: 0.5 },
      291: { x: 0.6, y: 0.5 },
      13: { x: 0.5, y: 0.5 },
      14: { x: 0.5, y: 0.5 },
      1: { x: 0.8, y: 0.5 },
    })

    expect(frameMetrics(landmarks).deviation).toBeCloseTo(0.3, 5)
  })
})
