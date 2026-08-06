import { act, render, screen, waitFor } from '@testing-library/react'
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

describe('RecentReportCarousel 자동 전환', () => {
  beforeEach(() => {
    mockedGetDetail.mockImplementation((id: number) => {
      const record = records.find((item) => item.id === id)
      return Promise.resolve(detailFor(record ?? records[0]))
    })
  })

  it('5초 뒤 다음 리포트로 자동 전환하는 타이머를 등록한다', async () => {
    // framer-motion 애니메이션이 쓰는 requestAnimationFrame과 얽히지 않도록, 가짜 타이머 대신
    // setInterval 호출 자체를 가로채 콜백을 직접 실행해 "5초 후 다음으로 넘어간다"는 동작만 검증한다.
    const setIntervalSpy = vi.spyOn(window, 'setInterval')

    render(<RecentReportCarousel records={records} />)
    await waitFor(() => expect(mockedGetDetail).toHaveBeenCalledWith(3))

    const call = setIntervalSpy.mock.calls.find(([, delay]) => delay === 5000)
    expect(call).toBeTruthy()
    const advance = call?.[0] as (() => void) | undefined

    await act(async () => {
      advance?.()
    })

    await screen.findByText('두 번째 면접')
    await waitFor(() => expect(mockedGetDetail).toHaveBeenCalledWith(2))

    setIntervalSpy.mockRestore()
  })
})
