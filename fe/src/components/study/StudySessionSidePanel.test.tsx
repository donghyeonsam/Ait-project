import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { StudySessionSidePanel } from '@/components/study/StudySessionSidePanel'
import { studyEvaluationCategories, type StudyParticipant } from '@/mocks/study'

vi.mock('@/components/reactbits/CountUp', () => ({
  CountUp: ({
    to,
    decimals = 0,
  }: {
    to: number
    decimals?: number
  }) => <>{to.toFixed(decimals)}</>,
}))

const participants: StudyParticipant[] = [
  {
    participantId: 1,
    name: '나',
    isSelf: true,
    resumeSummary: '내 이력서',
    coverLetterTitle: '내 자소서',
    coverLetterSummary: '내 자소서 내용',
  },
  {
    participantId: 2,
    name: '김지원',
    isSelf: false,
    resumeSummary: '지원 이력서',
    coverLetterTitle: '지원 자소서',
    coverLetterSummary: '지원 자소서 내용',
  },
]

describe('StudySessionSidePanel evaluation', () => {
  it('모든 평가 항목을 5점으로 시작하고 휠로 0~10 사이에서 조절한다', async () => {
    const user = userEvent.setup()
    render(<StudySessionSidePanel participants={participants} />)

    await user.click(screen.getByRole('tab', { name: '평가' }))

    const scoreInputs = screen.getAllByRole('spinbutton')
    expect(scoreInputs).toHaveLength(studyEvaluationCategories.length)
    scoreInputs.forEach((input) => expect(input).toHaveValue(5))
    expect(screen.getByLabelText('5개 항목 평균 5.0점')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '평가 제출' })).toBeEnabled()

    const logicScore = screen.getByRole('spinbutton', { name: '논리력' })
    fireEvent.wheel(logicScore, { deltaY: -100 })
    expect(logicScore).toHaveValue(6)
    expect(screen.getByLabelText('5개 항목 평균 5.2점')).toBeInTheDocument()

    fireEvent.wheel(logicScore, { deltaY: 100 })
    expect(logicScore).toHaveValue(5)
    for (const category of studyEvaluationCategories) {
      expect(screen.getByRole('spinbutton', { name: category })).toHaveAttribute(
        'min',
        '0',
      )
      expect(screen.getByRole('spinbutton', { name: category })).toHaveAttribute(
        'max',
        '10',
      )
    }
  })

  it('정수 점수와 평균 및 방사형 그래프를 실시간으로 갱신한다', async () => {
    const user = userEvent.setup()
    render(<StudySessionSidePanel participants={participants} />)

    await user.click(screen.getByRole('tab', { name: '평가' }))
    const logicScore = screen.getByRole('spinbutton', { name: '논리력' })
    const radar = screen.getByRole('img', {
      name: /^팀원 평가 방사형 그래프/,
    })

    fireEvent.change(logicScore, { target: { value: '10' } })

    expect(logicScore).toHaveValue(10)
    expect(screen.getByLabelText('5개 항목 평균 6.0점')).toBeInTheDocument()
    expect(radar).toHaveTextContent('논리력 10점')

    fireEvent.change(logicScore, { target: { value: '-2' } })
    expect(logicScore).toHaveValue(0)

    fireEvent.change(logicScore, { target: { value: '8.7' } })
    expect(logicScore).toHaveValue(9)
  })
})
