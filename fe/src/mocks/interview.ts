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

export interface ResumeOption {
  id: string
  title: string
  updatedAt: string
}

export const resumeOptions: ResumeOption[] = [
  { id: 'resume-hynix', title: '하이닉스 자소서입니다.', updatedAt: '2026. 07. 21' },
  { id: 'resume-samsung', title: '삼성전자DX 자소서입니다.', updatedAt: '2026. 07. 18' },
  { id: 'resume-kakao', title: '카카오 자소서입니다.', updatedAt: '2026. 07. 12' },
]

export interface RepositoryOption {
  id: string
  name: string
}

export const repositoryOptions: RepositoryOption[] = [
  { id: 'repo-1', name: 'Project 1' },
  { id: 'repo-2', name: 'Project 2' },
  { id: 'repo-3', name: 'Project 3' },
]

