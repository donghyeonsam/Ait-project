// 스터디 그룹 일정 조회·등록·수정·삭제 API 호출과 관련 타입을 모아둔 모듈.
import { backendRequest } from '@/api/http'

// 서버는 일정 한 건을 content 한 줄과 시작 시각으로만 저장한다. 소요 시간·출석 정보는 아직 스키마에 없다.
export interface StudyCalendar {
  calendarId: number
  content: string
  startTime: string
}

export interface StudyCalendarRequest {
  content: string
  startTime: string
}

export function getMonthlyStudyCalendars(
  groupId: number,
  year: number,
  month: number,
) {
  const query = new URLSearchParams({
    year: String(year),
    month: String(month),
  })
  return backendRequest<StudyCalendar[]>(
    `/api/study-groups/${groupId}/calendars?${query.toString()}`,
  )
}

export function getDailyStudyCalendars(groupId: number, date: string) {
  const query = new URLSearchParams({ date })
  return backendRequest<StudyCalendar[]>(
    `/api/study-groups/${groupId}/calendars/daily?${query.toString()}`,
  )
}

export function createStudyCalendar(
  groupId: number,
  request: StudyCalendarRequest,
) {
  return backendRequest<void>(`/api/study-groups/${groupId}/calendars`, {
    method: 'POST',
    body: JSON.stringify(request),
  })
}

export function updateStudyCalendar(
  groupId: number,
  calendarId: number,
  request: StudyCalendarRequest,
) {
  return backendRequest<void>(
    `/api/study-groups/${groupId}/calendars/${calendarId}`,
    { method: 'PUT', body: JSON.stringify(request) },
  )
}

export function deleteStudyCalendar(groupId: number, calendarId: number) {
  return backendRequest<void>(
    `/api/study-groups/${groupId}/calendars/${calendarId}`,
    { method: 'DELETE' },
  )
}
