import { act, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getInterviewReportDetail,
  getInterviewReports,
} from '@/api/ai-interviews'
import { InterviewPowerPanel } from '@/components/dashboard/InterviewPowerPanel'
import type { InterviewRecord } from '@/types/dashboard'

vi.mock('@/api/ai-interviews', () => ({
  getInterviewReports: vi.fn(),
  getInterviewReportDetail: vi.fn(),
}))

const mockedGetInterviewReports = vi.mocked(getInterviewReports)
const mockedGetInterviewReportDetail = vi.mocked(getInterviewReportDetail)

const records: InterviewRecord[] = [
  {
    id: 1,
    date: '2026. 08. 01',
    type: '기술',
    difficulty: '보통',
    title: '기술 면접',
    score: 8.4,
    delta: 0,
    duration: '18분',
    status: 'completed',
  },
]

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

describe('InterviewPowerPanel 코멘트 자동 전환', () => {
  beforeEach(() => {
    mockedGetInterviewReports.mockResolvedValue(records)
    mockedGetInterviewReportDetail.mockResolvedValue({
      aiInterviewId: 1,
      interviewType: '기술',
      difficulty: '보통',
      createdAt: '2026. 08. 01',
      content: {
        strengths: ['첫 번째 잘한 점', '두 번째 잘한 점'],
        weaknesses: ['첫 번째 개선점', '두 번째 개선점'],
      },
      eyeContactScore: 8,
      faceScore: 8,
      voiceScore: 8,
      qnaScore: 8,
      sentenceScore: 8,
      questions: [],
    })
  })

  it('일정 주기마다 다음 코멘트로 회전하는 타이머를 등록한다', async () => {
    // framer-motion의 rotateX 애니메이션이 쓰는 requestAnimationFrame과 얽히지 않도록, 가짜
    // 타이머 대신 setInterval 호출 자체를 가로채 콜백을 직접 실행해 "주기적으로 다음 코멘트로
    // 넘어간다"는 동작만 검증한다.
    const setIntervalSpy = vi.spyOn(window, 'setInterval')

    render(<InterviewPowerPanel />)
    await waitFor(() => expect(screen.getByText('첫 번째 잘한 점')).toBeInTheDocument())

    const call = setIntervalSpy.mock.calls.find(([, delay]) => delay === 4000)
    expect(call).toBeTruthy()
    const advance = call?.[0] as (() => void) | undefined

    await act(async () => {
      advance?.()
    })

    await screen.findByText('두 번째 잘한 점')
    expect(screen.getByText('두 번째 개선점')).toBeInTheDocument()

    setIntervalSpy.mockRestore()
  })
})
