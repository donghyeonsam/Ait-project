// 대시보드 메인 요약 조회 API 호출과 관련 타입을 모아둔 모듈.
import {
  toInterviewRecords,
  type ReportListItemResponse,
} from '@/api/ai-interviews'
import { backendRequest } from '@/api/http'
import type { PeerFeedbackSessionSummary } from '@/api/peer-feedback'
import type { InterviewRecord } from '@/types/dashboard'

export interface DashboardStudyCalendarItem {
  calendarId: number
  groupId: number
  groupTitle: string
  content: string
  startTime: string
}

// BE 응답 원형. 목록·지표가 없으면 null로 내려올 수 있어 화면 모델로 정규화해 쓴다.
interface DashboardRawResponse {
  interviewCount: number | null
  interviewScore: number | null
  studyCount: number | null
  reportList: ReportListItemResponse[] | null
  peerFeedbackList: PeerFeedbackSessionSummary[] | null
  myStudyCalendarList: DashboardStudyCalendarItem[] | null
}

export interface DashboardSummary {
  /** 최근 7일 동안 완료한 모의면접 횟수. */
  interviewCount: number
  /** 가장 최근 모의면접 종합점수. 완료된 면접이 없으면 null. */
  interviewScore: number | null
  /** 평가를 받은 스터디 세션 누적 횟수. */
  studyCount: number
  /** 최신순 면접 기록. */
  interviewRecords: InterviewRecord[]
  /** 최신순 스터디 상호평가 요약. */
  studyFeedbacks: PeerFeedbackSessionSummary[]
  /** 시작 시간 오름차순 스터디 일정(이번 달~다음 달). */
  studyCalendars: DashboardStudyCalendarItem[]
}

// 요약 지표·면접 기록·상호평가·스터디 일정을 한 번에 조회한다.
export async function getDashboardSummary(): Promise<DashboardSummary> {
  // BE 컨트롤러 매핑이 트레일링 슬래시까지 포함하므로 경로를 정확히 맞춘다.
  const raw = await backendRequest<DashboardRawResponse>('/api/dashboard/')
  const interviewRecords = toInterviewRecords(raw.reportList ?? [])

  return {
    interviewCount: raw.interviewCount ?? 0,
    interviewScore: interviewRecords.length ? raw.interviewScore : null,
    studyCount: raw.studyCount ?? 0,
    interviewRecords,
    studyFeedbacks: [...(raw.peerFeedbackList ?? [])].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    ),
    studyCalendars: [...(raw.myStudyCalendarList ?? [])].sort((a, b) =>
      a.startTime.localeCompare(b.startTime),
    ),
  }
}
