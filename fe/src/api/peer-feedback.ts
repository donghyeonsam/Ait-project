// 스터디 세션 상호평가 조회 API 호출과 관련 타입을 모아둔 모듈.
import { backendRequest } from '@/api/http'
import type { StudyRecord } from '@/types/dashboard'

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

export interface PeerFeedbackUpdateRequest {
  logicalScore: number
  communicationScore: number
  attitudeScore: number
  jobCompetencyScore: number
  confidenceScore: number
  feedback: string
}

// 이미 제출한 평가 내용을 수정한다. 본인이 작성한 평가만 수정할 수 있다.
export function updatePeerFeedback(peerFeedbackId: number, request: PeerFeedbackUpdateRequest) {
  return backendRequest<PeerFeedback>(`/api/peer-feedback/${peerFeedbackId}/update`, {
    method: 'PATCH',
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

// 서버 생성 시각을 'YYYY. MM. DD.' 형식으로 표시한다.
export function formatRecordDate(value: string) {
  const date = new Date(value)
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}. ${mm}. ${dd}.`
}

// 그룹별 직전 세션과의 점수 차를 계산해 화면 기록으로 바꾼다.
// TODO: 실제 API 연동 필요 — 응답에 groupId가 없어 sessionTitle(그룹명)을 그룹 구분 키로 대신 쓴다.
export function toStudyRecords(items: PeerFeedbackSessionSummary[]): StudyRecord[] {
  const groupKeyOf = (item: PeerFeedbackSessionSummary) => item.groupId ?? item.sessionTitle

  const byGroup = new Map<string | number, PeerFeedbackSessionSummary[]>()
  for (const item of items) {
    const key = groupKeyOf(item)
    const list = byGroup.get(key)
    if (list) {
      list.push(item)
    } else {
      byGroup.set(key, [item])
    }
  }

  const deltaBySessionId = new Map<number, number>()
  const roundBySessionId = new Map<number, number>()
  for (const list of byGroup.values()) {
    const ascending = [...list].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    ascending.forEach((item, index) => {
      deltaBySessionId.set(
        item.sessionId,
        index > 0 ? item.scoreAvg - ascending[index - 1].scoreAvg : 0,
      )
      roundBySessionId.set(item.sessionId, index + 1)
    })
  }

  return [...items]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((item) => ({
      sessionId: item.sessionId,
      groupId: item.groupId,
      groupTitle: item.sessionTitle,
      date: formatRecordDate(item.createdAt),
      score: item.scoreAvg,
      delta: deltaBySessionId.get(item.sessionId) ?? 0,
      round: roundBySessionId.get(item.sessionId) ?? 1,
      status: 'completed' as const,
    }))
}
