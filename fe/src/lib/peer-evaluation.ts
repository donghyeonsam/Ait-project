// 서버 상호평가 점수 필드와 화면이 쓰는 한국어 평가 항목 사이를 옮기는 변환 모음.
import type { PeerFeedback, PeerFeedbackCreateRequest } from '@/api/peer-feedback'
import type { StudyEvaluationScores } from '@/components/study/StudyEvaluationRadar'
import {
  studyEvaluationCategories,
  type StudyEvaluationCategory,
} from '@/mocks/study'

const scoreFieldByCategory: Record<
  StudyEvaluationCategory,
  keyof Pick<
    PeerFeedback,
    | 'logicalScore'
    | 'communicationScore'
    | 'attitudeScore'
    | 'jobCompetencyScore'
    | 'confidenceScore'
  >
> = {
  논리력: 'logicalScore',
  표현력: 'communicationScore',
  태도: 'attitudeScore',
  '직무 전문성': 'jobCompetencyScore',
  자신감: 'confidenceScore',
}

export function toEvaluationScores(feedback: PeerFeedback) {
  return studyEvaluationCategories.reduce<StudyEvaluationScores>(
    (result, category) => {
      result[category] = feedback[scoreFieldByCategory[category]]
      return result
    },
    {} as StudyEvaluationScores,
  )
}

// 서버가 세션 단위 항목별 집계를 내려주지 않아, 받은 평가를 프론트에서 항목별로 평균 낸다.
// 소수 한 자리까지만 남겨 축 라벨과 그래프가 흔들리지 않게 한다.
export function averageEvaluationScores(feedbacks: PeerFeedback[]) {
  return studyEvaluationCategories.reduce<StudyEvaluationScores>(
    (result, category) => {
      if (feedbacks.length === 0) {
        result[category] = 0
        return result
      }

      const total = feedbacks.reduce(
        (sum, feedback) => sum + feedback[scoreFieldByCategory[category]],
        0,
      )
      result[category] = Math.round((total / feedbacks.length) * 10) / 10
      return result
    },
    {} as StudyEvaluationScores,
  )
}

export function toPeerFeedbackCreateRequest(
  evaluateeId: number,
  scores: StudyEvaluationScores,
  feedback: string,
): PeerFeedbackCreateRequest {
  return {
    evaluateeId,
    logicalScore: scores.논리력,
    communicationScore: scores.표현력,
    attitudeScore: scores.태도,
    jobCompetencyScore: scores['직무 전문성'],
    confidenceScore: scores.자신감,
    feedback,
  }
}
