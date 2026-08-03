// 스터디 세션 생성·조회와 LiveKit 접속 정보(토큰·서버 URL 등) 발급을 담당하는 API 모듈.
import { backendRequest } from '@/api/http'
import type { CoverLetterDetail } from '@/api/cover-letters'

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

export interface StudyGroupActiveSession {
  hasActiveSession: boolean
  sessionId: number | null
}

// 세션에 참가 등록된 사람과 각자 입장 시 제출한 서류 번호. LiveKit 참가자 목록과 달리
// 아직 화상 연결 전인 사람도 포함되고, identity 문자열 대신 서버가 확인한 userId를 준다.
export interface StudySessionMember {
  userId: number
  nickname: string
  role: StudySessionParticipantRole
  resumeId: number | null
  coverLetterId: number | null
}

export function getStudySessionMembers(sessionId: number) {
  return backendRequest<StudySessionMember[]>(
    `/api/study-sessions/${sessionId}/members`,
  )
}

export interface StudySessionStatusInfo {
  sessionId: number
  status: StudySessionStatus
  ended: boolean
  endedAt: string | null
}

// AI 상호평가 요약은 세션이 완전히 종료된 뒤에만 생성할 수 있어, 요청 전에 상태를 먼저 확인한다.
export function getStudySessionStatus(sessionId: number) {
  return backendRequest<StudySessionStatusInfo>(
    `/api/study-sessions/${sessionId}/status`,
  )
}

// TODO: 백엔드 미배포 — 세션 참가자의 자소서는 본인 소유가 아니면 /api/cover-letters/{id}에서
// 404로 걸러지므로, 세션 소속 여부로 대신 검증하는 이 엔드포인트가 별도로 필요하다. 배포 전까지는 404가 난다.
export function getStudySessionCoverLetter(coverLetterId: number) {
  return backendRequest<CoverLetterDetail>(
    `/api/study-sessions/${coverLetterId}`,
  )
}

export function createStudySession(groupId: number) {
  return backendRequest<StudySessionCreateResult>(
    `/api/study-groups/${groupId}/sessions`,
    { method: 'POST' },
  )
}

// 세션 생성은 그룹장만 가능하고 활성 세션이 있으면 거절되므로, 진입 전에 이 조회로 기존 세션을 먼저 찾는다.
export function getStudyGroupActiveSession(groupId: number) {
  return backendRequest<StudyGroupActiveSession>(
    `/api/study-groups/${groupId}/sessions/active`,
  )
}

export function createStudySessionConnection(sessionId: number) {
  return backendRequest<StudySessionConnection>(
    `/api/study-sessions/${sessionId}/connection`,
    { method: 'POST' },
  )
}

// 방장만 호출할 수 있고, 자기 자신은 강퇴할 수 없다.
export function kickStudySessionParticipant(sessionId: number, targetUserId: number) {
  return backendRequest<void>(
    `/api/study-sessions/${sessionId}/participants/${targetUserId}`,
    { method: 'DELETE' },
  )
}

// 방장만 호출할 수 있고, 호출하면 모든 참가자의 연결이 종료된다.
export function endStudySession(sessionId: number) {
  return backendRequest<void>(`/api/study-groups/${sessionId}/end`, {
    method: 'POST',
  })
}

export interface StudySessionParticipantJoinRequest {
  resumeId: number
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
