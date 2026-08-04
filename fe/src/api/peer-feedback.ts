// 스터디 세션 상호평가 조회 API 호출과 관련 타입을 모아둔 모듈.
import { backendRequest } from '@/api/http'

export interface PeerFeedback {
  id: number
  sessionId: number
  evaluatorId: number
  evaluateeId: number
  logicalScore: number
  communicationScore: number
  attitudeScore: number
  jobCompetencyScore: number
  confidenceScore: number
  /** 다섯 항목 평균. 서버가 계산해 내려준다. */
  scoreAvg: number
  feedback: string | null
}

// 이 세션에서 내가 작성한 평가. 같은 참가자를 두 번 평가하지 않게 막는 데 쓴다.
export function getMyPeerFeedbacksInSession(sessionId: number) {
  return backendRequest<PeerFeedback[]>(`/api/peer-feedback/${sessionId}/me`)
}

export interface PeerFeedbackReceiveResult {
  /** 요약이 아직 생성되지 않았으면 null. */
  aiSummary: string | null
  details: PeerFeedback[]
}

// 이 세션에서 내가 받은 평가 전체와 AI 종합 요약. 평가자별로 나뉘어 오고, 평가자 신원은 화면에서 밝히지 않는다.
// 요약이 아직 생성 전인 세션에서는 서버가 실패 응답을 줄 수 있어, 요약 생성 이후 재조회하는 용도로도 쓰인다.
export function getReceivedPeerFeedbacksInSession(sessionId: number) {
  return backendRequest<PeerFeedbackReceiveResult>(
    `/api/peer-feedback/me/${sessionId}/received`,
  )
}

export interface PeerFeedbackCreateRequest {
  evaluateeId: number
  logicalScore: number
  communicationScore: number
  attitudeScore: number
  jobCompetencyScore: number
  confidenceScore: number
  feedback: string
}

// 참가자 한 명에 대한 평가를 등록한다. 세션당 한 사람씩 개별로 호출한다.
export function createPeerFeedback(sessionId: number, request: PeerFeedbackCreateRequest) {
  return backendRequest<PeerFeedback>(`/api/peer-feedback/${sessionId}/peer-feedbacks`, {
    method: 'POST',
    body: JSON.stringify(request),
  })
}

export interface PeerFeedbackSessionSummary {
  sessionId: number
  /** TODO: 실제 API 연동 필요 — 백엔드 응답에 아직 없는 필드라 그룹 필터·비교는 sessionTitle(그룹명)로 대체한다. */
  groupId?: number
  /** 세션이 속한 스터디 그룹명. 필드명은 세션 제목처럼 보이지만 서버가 그룹명을 내려준다. */
  sessionTitle: string
  createdAt: string
  scoreAvg: number
}

// 내가 평가를 받은 세션 목록. 세션별로 이미 집계된 평균만 내려오고, 세부 항목·코멘트는 세션별 상세 조회로 받는다.
export function getPeerFeedbackList() {
  return backendRequest<PeerFeedbackSessionSummary[]>('/api/peer-feedback/list/me')
}
