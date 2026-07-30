export interface StudyParticipant {
  participantId: number
  name: string
  isSelf: boolean
  resumeSummary: string
  /** 서류함에서 쓰는 것과 같은 자소서 제목. 목록 행에 이 제목만 짧게 보여준다. */
  coverLetterTitle: string
  coverLetterSummary: string
}

// 스터디 세션 상호평가 탭의 평가 항목. 순발력은 논리력·표현력과 겹쳐 제외하고 5개로 유지한다.
// TODO: 실제 API 연동 필요 — 세션 종료 후 다른 참가자들의 평가를 모아 평균 낸 값을
// 대시보드에 펜타곤 그래프로 보여줄 예정이나, 집계·저장 기능은 아직 구현 전이다.
export const studyEvaluationCategories = [
  '논리력',
  '표현력',
  '태도',
  '직무 전문성',
  '자신감',
] as const

export type StudyEvaluationCategory = (typeof studyEvaluationCategories)[number]
