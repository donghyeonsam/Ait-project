import { describe, expect, it } from 'vitest'
import type { PeerFeedback } from '@/api/peer-feedback'
import {
  averageEvaluationScores,
  toEvaluationScores,
} from '@/lib/peer-evaluation'

function createFeedback(overrides: Partial<PeerFeedback> = {}): PeerFeedback {
  return {
    id: 1,
    sessionId: 10,
    evaluatorId: 2,
    evaluateeId: 3,
    logicalScore: 8,
    communicationScore: 7,
    attitudeScore: 9,
    jobCompetencyScore: 6,
    confidenceScore: 5,
    scoreAvg: 7,
    feedback: null,
    ...overrides,
  }
}

describe('toEvaluationScores', () => {
  it('서버 점수 필드를 화면 평가 항목으로 옮긴다', () => {
    expect(toEvaluationScores(createFeedback())).toEqual({
      논리력: 8,
      표현력: 7,
      태도: 9,
      '직무 전문성': 6,
      자신감: 5,
    })
  })
})

describe('averageEvaluationScores', () => {
  it('받은 평가를 항목별로 평균 내고 소수 한 자리로 맞춘다', () => {
    const scores = averageEvaluationScores([
      createFeedback(),
      createFeedback({ id: 2, logicalScore: 7, confidenceScore: 6 }),
      createFeedback({ id: 3, logicalScore: 6, confidenceScore: 4 }),
    ])

    // 논리력 (8+7+6)/3 = 7, 자신감 (5+6+4)/3 = 5
    expect(scores.논리력).toBe(7)
    expect(scores.자신감).toBe(5)
    // 표현력은 모두 7이라 평균도 7이다.
    expect(scores.표현력).toBe(7)
  })

  it('나누어떨어지지 않는 평균은 소수 한 자리까지만 남긴다', () => {
    const scores = averageEvaluationScores([
      createFeedback({ logicalScore: 8 }),
      createFeedback({ id: 2, logicalScore: 7 }),
      createFeedback({ id: 3, logicalScore: 7 }),
    ])

    // (8+7+7)/3 = 7.333... → 7.3
    expect(scores.논리력).toBe(7.3)
  })

  it('평가가 없으면 모든 항목을 0으로 둔다', () => {
    const scores = averageEvaluationScores([])

    expect(scores.논리력).toBe(0)
    expect(scores['직무 전문성']).toBe(0)
  })
})
