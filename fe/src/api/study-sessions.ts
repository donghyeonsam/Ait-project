import { backendRequest } from '@/api/http'

export type StudySessionParticipantRole = 'HOST' | 'MEMBER'

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

export function createStudySessionConnection(sessionId: number) {
  return backendRequest<StudySessionConnection>(
    `/api/study-sessions/${sessionId}/connection`,
    { method: 'POST' },
  )
}
