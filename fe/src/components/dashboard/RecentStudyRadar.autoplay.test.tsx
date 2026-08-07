import { act, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getReceivedPeerFeedbacksInSession,
  type PeerFeedback,
} from '@/api/peer-feedback'
import { RecentStudyRadar } from '@/components/dashboard/RecentStudyRadar'
import type { StudyRecord } from '@/types/dashboard'

vi.mock('@/api/peer-feedback', () => ({
  getReceivedPeerFeedbacksInSession: vi.fn(),
}))

const mockedGetReceived = vi.mocked(getReceivedPeerFeedbacksInSession)

const records: StudyRecord[] = [
  {
    sessionId: 30,
    groupId: 1,
    groupTitle: 'NAVER FE 스터디',
    date: '2026. 08. 05.',
    score: 8.4,
    delta: 0.6,
    round: 3,
    status: 'completed',
  },
  {
    sessionId: 20,
    groupId: 2,
    groupTitle: 'kakao FE 스터디',
    date: '2026. 08. 02.',
    score: 7.2,
    delta: -0.4,
    round: 2,
    status: 'completed',
  },
]

function feedbackFor(sessionId: number): PeerFeedback[] {
  return [
    {
      id: sessionId * 10,
      sessionId,
      evaluatorId: 1,
      evaluateeId: 2,
      logicalScore: 8,
      communicationScore: 8,
      attitudeScore: 8,
      jobCompetencyScore: 8,
      confidenceScore: 8,
      scoreAvg: 8,
      feedback: null,
    },
  ]
}

// framer-motion의 useReducedMotion은 첫 호출 시 window.matchMedia 결과를 모듈 전역에 한 번만
// 캐시한다. 다른 테스트 파일에서 matches:true로 먼저 렌더링해버리면 이 파일에서 false로
// 바꿔도 반영되지 않으므로, "모션 허용" 시나리오는 별도 파일로 분리해 첫 렌더 전에만 설정한다.
Object.defineProperty(window, 'matchMedia', {
  configurable: true,
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

describe('RecentStudyRadar 자동 전환', () => {
  beforeEach(() => {
    mockedGetReceived.mockImplementation((sessionId: number) =>
      Promise.resolve({ aiSummary: null, details: feedbackFor(sessionId) }),
    )
  })

  it('5초 뒤 다음 스터디 기록으로 자동 전환하는 타이머를 등록한다', async () => {
    // framer-motion 애니메이션이 쓰는 requestAnimationFrame과 얽히지 않도록, 가짜 타이머 대신
    // setInterval 호출 자체를 가로채 콜백을 직접 실행해 "5초 후 다음으로 넘어간다"는 동작만 검증한다.
    const setIntervalSpy = vi.spyOn(window, 'setInterval')

    render(<RecentStudyRadar records={records} onOpenReport={vi.fn()} />)
    await waitFor(() => expect(mockedGetReceived).toHaveBeenCalledWith(30))

    const call = setIntervalSpy.mock.calls.find(([, delay]) => delay === 5000)
    expect(call).toBeTruthy()
    const advance = call?.[0] as (() => void) | undefined

    await act(async () => {
      advance?.()
    })

    await screen.findByRole('button', { name: 'kakao FE 스터디 리포트 보기' })
    await waitFor(() => expect(mockedGetReceived).toHaveBeenCalledWith(20))

    setIntervalSpy.mockRestore()
  })
})
