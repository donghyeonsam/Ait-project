import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getInterviewReportDetail } from '@/api/ai-interviews'
import { RecentReportCarousel } from '@/components/dashboard/RecentReportCarousel'
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
  {
    id: 1,
    date: '2026. 07. 28',
    type: '종합',
    difficulty: '어려움',
    title: '첫 번째 면접',
    score: 6.8,
    delta: 0,
    duration: '20분',
    status: 'completed',
  },
]

function detailFor(record: InterviewRecord) {
  return {
    aiInterviewId: record.id,
    interviewType: record.type,
    difficulty: record.difficulty,
    createdAt: record.date,
    content: { strengths: [`${record.title} 강점`], weaknesses: [`${record.title} 약점`] },
    eyeContactScore: 8,
    faceScore: 8,
    voiceScore: 8,
    qnaScore: 8,
    sentenceScore: 8,
    questions: [],
  }
}

function renderCarousel(reportRecords: InterviewRecord[] = records) {
  return render(<RecentReportCarousel records={reportRecords} />)
}

describe('RecentReportCarousel', () => {
  // 애니메이션 없이 즉시 전환되도록 reduced-motion을 강제해 전환 결과를 동기적으로 확인하고,
  // 자동 전환도 이 설정에서는 멈춰 있으므로 수동 네비게이션만으로 테스트할 수 있다.
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
    renderCarousel()

    expect(screen.getByText('세 번째 면접')).toBeInTheDocument()
    await waitFor(() => expect(mockedGetDetail).toHaveBeenCalledWith(3))
    await screen.findByText('세 번째 면접 강점')
  })

  it('점 인디케이터로 리포트를 넘기면 해당 상세를 새로 조회한다', async () => {
    const user = userEvent.setup()
    renderCarousel()
    await screen.findByText('세 번째 면접 강점')

    await user.click(screen.getByRole('tab', { name: '2번째 리포트 보기' }))

    expect(screen.getByText('두 번째 면접')).toBeInTheDocument()
    await waitFor(() => expect(mockedGetDetail).toHaveBeenCalledWith(2))
    await screen.findByText('두 번째 면접 강점')
  })
})
