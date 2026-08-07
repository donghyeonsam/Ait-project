import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getInterviewReportDetail,
  getInterviewReports,
} from '@/api/ai-interviews'
import { getPeerFeedbackList, type PeerFeedbackSessionSummary } from '@/api/peer-feedback'
import { InterviewPowerPanel } from '@/components/dashboard/InterviewPowerPanel'
import type { InterviewRecord } from '@/types/dashboard'

vi.mock('@/api/ai-interviews', () => ({
  getInterviewReports: vi.fn(),
  getInterviewReportDetail: vi.fn(),
}))

vi.mock('@/api/peer-feedback', () => ({
  getPeerFeedbackList: vi.fn(),
}))

const mockedGetInterviewReports = vi.mocked(getInterviewReports)
const mockedGetInterviewReportDetail = vi.mocked(getInterviewReportDetail)
const mockedGetPeerFeedbackList = vi.mocked(getPeerFeedbackList)

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
  {
    id: 2,
    date: '2026. 08. 03',
    type: 'CS',
    difficulty: '쉬움',
    title: 'CS 면접',
    score: 6.6,
    delta: -1.8,
    duration: '10분',
    status: 'completed',
  },
  {
    id: 3,
    date: '2026. 08. 05',
    type: '종합',
    difficulty: '어려움',
    title: '분석 중인 면접',
    score: 0,
    delta: 0,
    duration: '-',
    status: 'analyzing',
  },
]

function detailFor(id: number) {
  return {
    aiInterviewId: id,
    interviewType: '기술',
    difficulty: '보통',
    createdAt: '2026. 08. 01',
    content: { strengths: ['답변이 논리적이었어요.'], weaknesses: ['목소리가 작았어요.'] },
    eyeContactScore: 8,
    faceScore: 8,
    voiceScore: 8,
    qnaScore: 8,
    sentenceScore: 8,
    questions: [],
  }
}

describe('InterviewPowerPanel', () => {
  beforeEach(() => {
    mockedGetPeerFeedbackList.mockResolvedValue([])
  })

  it('완료된 면접 점수를 그대로 더해 EXP로 쌓고, 100 미만이면 Lv.1로 보여준다', async () => {
    mockedGetInterviewReports.mockResolvedValue(records)
    mockedGetInterviewReportDetail.mockResolvedValue(detailFor(1))

    render(<InterviewPowerPanel />)

    // 8.4 + 6.6 = 15.0 (100 미만이라 레벨 안의 경험치 그대로), 분석 중인 기록은 제외
    await waitFor(() => expect(screen.getByText('Lv. 1')).toBeInTheDocument())
    expect(screen.getByText('15.0')).toBeInTheDocument()
    expect(mockedGetInterviewReportDetail).toHaveBeenCalledWith(1)
  })

  it('EXP가 100을 넘으면 레벨이 오르고 남은 경험치만 게이지에 표시한다', async () => {
    const bigRecords: InterviewRecord[] = [
      { ...records[0], id: 10, score: 60 },
      { ...records[1], id: 11, score: 55 },
    ]
    mockedGetInterviewReports.mockResolvedValue(bigRecords)
    mockedGetInterviewReportDetail.mockResolvedValue(detailFor(10))

    render(<InterviewPowerPanel />)

    // 60 + 55 = 115 → Lv.2, 레벨 안 경험치는 15.0
    await waitFor(() => expect(screen.getByText('Lv. 2')).toBeInTheDocument())
    expect(screen.getByText('15.0')).toBeInTheDocument()
  })

  it('스터디 상호평가 점수도 면접 점수와 함께 EXP로 더한다', async () => {
    mockedGetInterviewReports.mockResolvedValue(records)
    mockedGetInterviewReportDetail.mockResolvedValue(detailFor(1))
    const peerFeedbacks: PeerFeedbackSessionSummary[] = [
      { sessionId: 1, sessionTitle: '금융권 면접 PT 대비', createdAt: '2026-08-02T09:00:00', scoreAvg: 8 },
    ]
    mockedGetPeerFeedbackList.mockResolvedValue(peerFeedbacks)

    render(<InterviewPowerPanel />)

    // 8.4 + 6.6(면접) + 8(스터디) = 23.0
    await waitFor(() => expect(screen.getByText('23.0')).toBeInTheDocument())
  })

  it('가장 최근 완료 면접의 잘한 점·개선점을 한 줄씩 보여준다', async () => {
    mockedGetInterviewReports.mockResolvedValue(records)
    mockedGetInterviewReportDetail.mockResolvedValue(detailFor(1))

    render(<InterviewPowerPanel />)

    await waitFor(() =>
      expect(screen.getByText('답변이 논리적이었어요.')).toBeInTheDocument(),
    )
    expect(screen.getByText('목소리가 작았어요.')).toBeInTheDocument()
  })

  it('완료된 면접이 없으면 리포트 요약 대신 안내 문구를 보여준다', async () => {
    mockedGetInterviewReports.mockResolvedValue([])

    render(<InterviewPowerPanel />)

    await waitFor(() =>
      expect(
        screen.getByText('AI 모의면접을 완료하면 최근 리포트 요약이 여기 표시돼요.'),
      ).toBeInTheDocument(),
    )
    expect(mockedGetInterviewReportDetail).not.toHaveBeenCalled()
  })

  it('조회에 실패하면 안내 문구를 보여준다', async () => {
    mockedGetInterviewReports.mockRejectedValue(new Error('network error'))

    render(<InterviewPowerPanel />)

    await waitFor(() =>
      expect(screen.getByText('불러오지 못했습니다.')).toBeInTheDocument(),
    )
  })
})
