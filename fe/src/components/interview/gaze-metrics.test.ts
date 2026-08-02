import { describe, expect, it } from 'vitest'
import {
  GAZE_OFFSCREEN_THRESHOLD,
  gazeFrameMetrics,
  isLookingOnScreen,
  type NormalizedPoint,
} from '@/components/interview/gaze-metrics'

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

// 두 눈 소켓(코너·눈꺼풀)을 공통으로 두고, 홍채 위치만 바꿔 케이스를 만든다.
const EYE_SOCKETS = {
  33: { x: 0.3, y: 0.4 },
  133: { x: 0.36, y: 0.4 },
  159: { x: 0.33, y: 0.38 },
  145: { x: 0.33, y: 0.42 },
  263: { x: 0.64, y: 0.4 },
  362: { x: 0.7, y: 0.4 },
  386: { x: 0.67, y: 0.38 },
  374: { x: 0.67, y: 0.42 },
}

describe('gazeFrameMetrics', () => {
  it('홍채가 눈 소켓 중앙에 있으면 offset이 0이다', () => {
    const landmarks = buildLandmarks({
      ...EYE_SOCKETS,
      468: { x: 0.33, y: 0.4 },
      473: { x: 0.67, y: 0.4 },
    })

    const metrics = gazeFrameMetrics(landmarks)

    expect(metrics.horizontal).toBeCloseTo(0.5, 5)
    expect(metrics.vertical).toBeCloseTo(0.5, 5)
    expect(metrics.offset).toBeCloseTo(0, 5)
    expect(isLookingOnScreen(metrics)).toBe(true)
  })

  it('홍채가 눈 소켓 한쪽 끝에 몰리면 offset이 임계값을 넘는다', () => {
    const landmarks = buildLandmarks({
      ...EYE_SOCKETS,
      468: { x: 0.3, y: 0.4 },
      473: { x: 0.64, y: 0.4 },
    })

    const metrics = gazeFrameMetrics(landmarks)

    expect(metrics.horizontal).toBeCloseTo(0, 5)
    expect(metrics.offset).toBeGreaterThan(GAZE_OFFSCREEN_THRESHOLD)
    expect(isLookingOnScreen(metrics)).toBe(false)
  })

  it('두 눈의 비율을 평균낸다', () => {
    const landmarks = buildLandmarks({
      ...EYE_SOCKETS,
      // 한쪽은 완전히 중앙(0.5), 다른 쪽은 완전히 왼쪽 끝(0) -> 평균 0.25
      468: { x: 0.33, y: 0.4 },
      473: { x: 0.64, y: 0.4 },
    })

    const metrics = gazeFrameMetrics(landmarks)

    expect(metrics.horizontal).toBeCloseTo(0.25, 5)
  })
})
