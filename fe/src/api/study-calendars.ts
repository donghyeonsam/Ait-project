import { backendRequest } from '@/api/http'

export interface StudyCalendarItem {
  calendarId: number
  content: string
  startTime: string
}

export interface StudyCalendarRequest {
  content: string
  startTime: string
}

export function getStudyCalendars(
  groupId: number,
  year: number,
  month: number,
) {
  return backendRequest<StudyCalendarItem[]>(
    `/api/study-groups/${groupId}/calendars?year=${year}&month=${month}`,
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
    {
      method: 'PUT',
      body: JSON.stringify(request),
    },
  )
}

export function deleteStudyCalendar(groupId: number, calendarId: number) {
  return backendRequest<void>(
    `/api/study-groups/${groupId}/calendars/${calendarId}`,
    { method: 'DELETE' },
  )
}
