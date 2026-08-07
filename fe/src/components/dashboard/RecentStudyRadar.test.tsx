import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

describe('RecentStudyRadar', () => {
  // 애니메이션 없이 즉시 전환되도록 reduced-motion을 강제해 전환 결과를 동기적으로 확인한다.
  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: true,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
    mockedGetReceived.mockImplementation((sessionId: number) =>
      Promise.resolve({ aiSummary: null, details: feedbackFor(sessionId) }),
    )
  })

  it('처음에는 가장 최근 스터디 기록을 보여주고 평가를 조회한다', async () => {
    render(<RecentStudyRadar records={records} onOpenReport={vi.fn()} />)

    expect(
      screen.getByRole('button', { name: 'NAVER FE 스터디 리포트 보기' }),
    ).toBeInTheDocument()
    await waitFor(() => expect(mockedGetReceived).toHaveBeenCalledWith(30))
  })

  it('점 인디케이터로 넘기면 해당 세션의 평가를 새로 조회한다', async () => {
    const user = userEvent.setup()
    render(<RecentStudyRadar records={records} onOpenReport={vi.fn()} />)
    await waitFor(() => expect(mockedGetReceived).toHaveBeenCalledWith(30))

    await user.click(screen.getByRole('tab', { name: '2번째 스터디 기록 보기' }))

    expect(
      screen.getByRole('button', { name: 'kakao FE 스터디 리포트 보기' }),
    ).toBeInTheDocument()
    await waitFor(() => expect(mockedGetReceived).toHaveBeenCalledWith(20))
  })

  it('카드를 클릭하면 현재 기록으로 콜백을 호출한다', async () => {
    const user = userEvent.setup()
    const onOpenReport = vi.fn()
    render(<RecentStudyRadar records={records} onOpenReport={onOpenReport} />)

    await user.click(screen.getByRole('button', { name: 'NAVER FE 스터디 리포트 보기' }))

    expect(onOpenReport).toHaveBeenCalledWith(records[0])
  })
})
