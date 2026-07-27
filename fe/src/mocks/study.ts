// TODO: 실제 API 연동 필요 — 세션 단건 조회 API(GET /api/study-sessions/{sessionId})가 없어
// 입장 전 화면의 세션 제목을 아직 실제 값으로 채울 수 없다.
export const mockPrejoinSessionTitle = '금융권 면접 PT 대비'

export interface StudyParticipant {
  participantId: number
  name: string
  isSelf: boolean
  resumeSummary: string
  /** 서류함에서 쓰는 것과 같은 자소서 제목. 목록 행에 이 제목만 짧게 보여준다. */
  coverLetterTitle: string
  coverLetterSummary: string
}

// 스터디 평가탭의 평가 항목. AI 모의면접 리포트 항목(docs/domain-rules.md)과 동일하게 맞춘다.
export const studyEvaluationCategories = [
  '논리력',
  '표현력',
  '순발력',
  '태도',
  '직무 전문성',
  '자신감',
] as const

export type StudyEvaluationCategory = (typeof studyEvaluationCategories)[number]
