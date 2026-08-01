import { describe, expect, it } from 'vitest'
import type { PeerFeedback } from '@/api/peer-feedback'
import { toEvaluationScores } from '@/lib/peer-evaluation'

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
