// 면접 설문에서 쓰는 선택지 타입과 목업 옵션 목록. 화면 구성용이며 실제 API 데이터가 아니다.
export type InterviewGoalType = '직무 면접' | 'CS 면접' | '기술 면접' | '포폴 면접' | '종합'

export type CsTopic =
  | '알고리즘 / 자료구조'
  | '운영 체제'
  | '네트워크'
  | 'WEB'
  | '데이터베이스'
  | '보안'
  | '소프트웨어 공학'
  | 'AI'
  | '언어 · 프레임워크'

export type Difficulty = '쉬움' | '보통' | '어려움'
export type InterviewStyle = '평화형' | '밸런스형' | '압박형'

export interface InterviewGoalOption {
  type: InterviewGoalType
  description: string
}

export const interviewGoalOptions: InterviewGoalOption[] = [
  { type: '직무 면접', description: '지원 직무의 지식과 문제 해결 역량 확인' },
  { type: 'CS 면접', description: '논리적 발표 구성과 전달' },
  { type: '기술 면접', description: '가치관/경험 중심으로 연습' },
  { type: '포폴 면접', description: '포트폴리오 기반의 질의응답' },
  { type: '종합', description: '모든 유형 균형있게' },
]

export const csTopicOptions: CsTopic[] = [
  '알고리즘 / 자료구조',
  '운영 체제',
  '네트워크',
  'WEB',
  '데이터베이스',
  '보안',
  '소프트웨어 공학',
  'AI',
  '언어 · 프레임워크',
]

export const difficultyOptions: Difficulty[] = ['쉬움', '보통', '어려움']
export const interviewStyleOptions: InterviewStyle[] = ['평화형', '밸런스형', '압박형']

