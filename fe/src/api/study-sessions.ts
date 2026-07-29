// 스터디 세션 생성과 LiveKit 접속 정보(토큰·서버 URL 등) 발급을 담당하는 API 모듈.
import { backendRequest } from '@/api/http'

export type StudySessionParticipantRole = 'HOST' | 'MEMBER'

export type StudySessionStatus = 'WAITING' | 'IN_PROGRESS' | 'ENDED'

export interface StudySessionCreateResult {
  sessionId: number
  groupId: number
  liveKitRoomName: string
  status: StudySessionStatus
  maxParticipants: number
  createdAt: string
}

export interface StudySessionConnection {
  sessionId: number
  groupId: number
  roomName: string
  serverUrl: string
  participantToken: string
  participantIdentity: string
  participantName: string
  role: StudySessionParticipantRole
}

export function createStudySession(groupId: number) {
  return backendRequest<StudySessionCreateResult>(
    `/api/study-groups/${groupId}/sessions`,
    { method: 'POST' },
  )
}

export function createStudySessionConnection(sessionId: number) {
  return backendRequest<StudySessionConnection>(
    `/api/study-sessions/${sessionId}/connection`,
    { method: 'POST' },
  )
}

export interface StudySessionParticipantJoinRequest {
  coverLetterId: number | null
}

// 응답 필드가 아직 백엔드와 확정되지 않아, 참가자 등록 성공 여부만 사용하고 값은 소비하지 않는다.
export function joinStudySessionParticipant(
  sessionId: number,
  request: StudySessionParticipantJoinRequest,
) {
  return backendRequest<unknown>(
    `/api/study-sessions/${sessionId}/participants/me/join`,
    { method: 'POST', body: JSON.stringify(request) },
  )
}
