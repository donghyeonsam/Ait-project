export interface StudyParticipant {
  /** 화면 배치용 지역 번호. 본인은 0, 나머지는 처음 본 순서대로 1부터 붙는다. 서버 id가 아니다. */
  participantId: number
  /** 세션 참가자 목록으로 확인한 서버 사용자 id. 아직 조회되지 않았으면 null이다. */
  userId: number | null
  name: string
  isSelf: boolean
  role: 'HOST' | 'MEMBER' | null
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
