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
