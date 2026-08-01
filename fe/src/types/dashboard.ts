// 대시보드 면접 기록·점수 추이 화면에서 공유하는 타입 정의.
export type InterviewType = '종합' | '직무' | '기술' | '포폴' | 'CS'
export type JobType = 'FE' | 'BE' | 'AI' | 'Data' | 'Infra' | '보안' | 'QA' | 'Mobile' | 'PM/PO'

export interface InterviewRecord {
  id: number
  date: string
  type: InterviewType
  // 서버 리포트 목록 응답에는 분야 정보가 없어 화면에서 만든 기록에만 존재한다.
  field?: JobType
  difficulty: '쉬움' | '보통' | '어려움'
  title: string
  score: number
  delta: number
  duration: string
  status?: 'analyzing' | 'completed'
}

export interface ScoreTrendPoint {
  date: string
  score: number
}
