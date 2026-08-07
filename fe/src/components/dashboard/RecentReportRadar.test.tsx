import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getInterviewReportDetail } from '@/api/ai-interviews'
import { RecentReportRadar } from '@/components/dashboard/RecentReportRadar'
import type { InterviewRecord } from '@/types/dashboard'

vi.mock('@/api/ai-interviews', () => ({
  getInterviewReportDetail: vi.fn(),
}))

const mockedGetDetail = vi.mocked(getInterviewReportDetail)

const records: InterviewRecord[] = [
  {
    id: 3,
    date: '2026. 08. 05',
    type: '기술',
    difficulty: '보통',
    title: '세 번째 면접',
    score: 8.4,
    delta: 0.6,
    duration: '18분',
    status: 'completed',
  },
  {
    id: 2,
    date: '2026. 08. 02',
    type: '직무',
    difficulty: '쉬움',
    title: '두 번째 면접',
    score: 7.2,
    delta: -0.4,
    duration: '15분',
    status: 'completed',
  },
]

function detailFor(record: InterviewRecord) {
  return {
    aiInterviewId: record.id,
    interviewType: record.type,
    difficulty: record.difficulty,
    createdAt: record.date,
    content: { strengths: [], weaknesses: [] },
    eyeContactScore: 8,
    faceScore: 8,
    voiceScore: 8,
    qnaScore: 8,
    sentenceScore: 8,
    questions: [],
  }
}

describe('RecentReportRadar', () => {
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
    mockedGetDetail.mockImplementation((id: number) => {
      const record = records.find((item) => item.id === id)
      return Promise.resolve(detailFor(record ?? records[0]))
    })
  })

  it('처음에는 가장 최근 리포트를 보여주고 상세를 조회한다', async () => {
    render(<RecentReportRadar records={records} onOpenReport={vi.fn()} />)

    expect(
      screen.getByRole('button', { name: '세 번째 면접 리포트 보기' }),
    ).toBeInTheDocument()
    await waitFor(() => expect(mockedGetDetail).toHaveBeenCalledWith(3))
  })

  it('점 인디케이터로 넘기면 해당 상세를 새로 조회한다', async () => {
    const user = userEvent.setup()
    render(<RecentReportRadar records={records} onOpenReport={vi.fn()} />)
    await waitFor(() => expect(mockedGetDetail).toHaveBeenCalledWith(3))

    await user.click(screen.getByRole('tab', { name: '2번째 리포트 보기' }))

    expect(
      screen.getByRole('button', { name: '두 번째 면접 리포트 보기' }),
    ).toBeInTheDocument()
    await waitFor(() => expect(mockedGetDetail).toHaveBeenCalledWith(2))
  })

  it('카드를 클릭하면 현재 기록으로 콜백을 호출한다', async () => {
    const user = userEvent.setup()
    const onOpenReport = vi.fn()
    render(<RecentReportRadar records={records} onOpenReport={onOpenReport} />)

    await user.click(screen.getByRole('button', { name: '세 번째 면접 리포트 보기' }))

    expect(onOpenReport).toHaveBeenCalledWith(records[0])
  })
})
