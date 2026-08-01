export interface StudyParticipant {
  /** 화면 배치용 지역 번호. 본인은 0, 나머지는 처음 본 순서대로 1부터 붙는다. 서버 id가 아니다. */
  participantId: number
  /** 세션 참가자 목록으로 확인한 서버 사용자 id. 아직 조회되지 않았으면 null이다. */
  userId: number | null
  name: string
  isSelf: boolean
  role: 'HOST' | 'MEMBER' | null
  /** 제출한 이력서 id. 제출하지 않았으면 null이고, 이 경우 상세 조회 버튼을 비활성화한다. */
  resumeId: number | null
  /** 서류함에서 쓰는 것과 같은 자소서 제목. 목록 행에 이 제목만 짧게 보여준다. */
  coverLetterTitle: string
  /** 제출한 자소서 id. 제출하지 않았으면 null이고, 이 경우 상세 조회 버튼을 비활성화한다. */
  coverLetterId: number | null
}

// 스터디 세션 상호평가 탭의 평가 항목. 순발력은 논리력·표현력과 겹쳐 제외하고 5개로 유지한다.
export const studyEvaluationCategories = [
  '논리력',
  '표현력',
  '태도',
  '직무 전문성',
  '자신감',
] as const

export type StudyEvaluationCategory = (typeof studyEvaluationCategories)[number]
