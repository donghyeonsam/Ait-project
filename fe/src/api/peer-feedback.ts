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

// 내가 받은 평가 전체. 세션 구분 없이 한 번에 내려오고, 집계는 화면에서 한다.
export function getReceivedPeerFeedbacks() {
  return backendRequest<PeerFeedback[]>('/api/peer-feedback/me/received')
}
