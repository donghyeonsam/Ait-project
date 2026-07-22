export type InterviewType = '종합' | '직무' | '기술' | '포폴' | 'CS'
export type JobType =
  | 'FE'
  | 'BE'
  | 'AI'
  | 'Data'
  | 'Infra'
  | '보안'
  | 'QA'
  | 'Mobile'
  | 'PM/PO'

export interface InterviewRecord {
  id: number
  date: string
  type: InterviewType
  field: JobType
  difficulty: '쉬움' | '보통' | '어려움'
  title: string
  score: number
  delta: number
  duration: string
  /** 생략 시 분석이 완료된 기록으로 취급한다. */
  status?: 'analyzing' | 'completed'
}

export const scoreTrend = [
  { date: '07.09', score: 5.5 },
  { date: '07.13', score: 6.9 },
  { date: '07.15', score: 6.0 },
  { date: '07.18', score: 7.1 },
  { date: '07.19', score: 7.5 },
  { date: '07.21', score: 8.7 },
]

export const interviewRecords: InterviewRecord[] = [
  {
    id: 1,
    date: '2026. 07. 21',
    type: '직무',
    field: 'FE',
    difficulty: '쉬움',
    title: '프론트엔드 직무 면접',
    score: 8.7,
    delta: 1.2,
    duration: '24분 18초',
  },
  {
    id: 2,
    date: '2026. 07. 19',
    type: '기술',
    field: 'FE',
    difficulty: '보통',
    title: '프론트엔드 기술 면접',
    score: 7.5,
    delta: 0.4,
    duration: '21분 42초',
  },
  {
    id: 3,
    date: '2026. 07. 18',
    type: '포폴',
    field: 'FE',
    difficulty: '어려움',
    title: '프론트엔드 포트폴리오 면접',
    score: 7.1,
    delta: 1.1,
    duration: '19분 05초',
  },
  {
    id: 4,
    date: '2026. 07. 15',
    type: 'CS',
    field: 'BE',
    difficulty: '보통',
    title: '백엔드 CS 면접',
    score: 6.0,
    delta: -0.9,
    duration: '18분 37초',
  },
  {
    id: 5,
    date: '2026. 07. 13',
    type: '종합',
    field: 'AI',
    difficulty: '어려움',
    title: 'AI 엔지니어 종합 면접',
    score: 6.9,
    delta: 1.4,
    duration: '26분 14초',
  },
  {
    id: 6,
    date: '2026. 07. 09',
    type: '기술',
    field: 'Data',
    difficulty: '쉬움',
    title: '데이터 엔지니어 기술 면접',
    score: 5.5,
    delta: 0.5,
    duration: '20분 33초',
  },
  {
    id: 7,
    date: '2026. 07. 06',
    type: '직무',
    field: 'PM/PO',
    difficulty: '보통',
    title: 'PM/PO 직무 면접',
    score: 5.0,
    delta: -0.3,
    duration: '22분 08초',
  },
]

export const studyRecords = [
  {
    name: 'NAVER FE 스터디',
    date: '2026.07.21',
    field: 'FE' as const,
    logo: '/dashboard/study-logo-naver.svg',
  },
  {
    name: 'kakao FE 스터디',
    date: '2026.07.16',
    field: 'FE' as const,
    logo: '/dashboard/study-logo-kakao.svg',
  },
  {
    name: '삼성전자DX FE 스터디',
    date: '2026.07.11',
    field: 'FE' as const,
    logo: '/dashboard/study-logo-samsung.svg',
  },
]

export const upcomingStudies = [
  { name: 'kakao FE', date: '2026.07.24', remaining: 'D-2' },
  { name: '삼성전자DX FE', date: '2026.07.27', remaining: 'D-5' },
]

export const calendarStudySchedules: Record<number, string[]> = {
  9: ['NAVER FE 스터디'],
  13: ['kakao FE 스터디'],
  15: ['삼성전자DX FE 스터디'],
  18: ['FE 기술면접 스터디'],
  19: ['포트폴리오 피드백 스터디'],
  21: ['NAVER FE 스터디'],
  24: ['kakao FE 스터디'],
  27: ['삼성전자DX FE 스터디'],
}
