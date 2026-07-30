import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { StudySessionSidePanel } from '@/components/study/StudySessionSidePanel'
import { studyEvaluationCategories, type StudyParticipant } from '@/mocks/study'

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
  it('0~10 정수 선택지만 제공하고 모든 항목을 선택해야 제출할 수 있다', async () => {
    const user = userEvent.setup()
    render(<StudySessionSidePanel participants={participants} />)

    await user.click(screen.getByRole('tab', { name: '평가' }))

    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument()
    const submitButton = screen.getByRole('button', {
      name: '5개 항목을 선택해 주세요',
    })
    expect(submitButton).toBeDisabled()

    for (const category of studyEvaluationCategories) {
      await user.click(
        screen.getByRole('button', { name: `${category} 10점` }),
      )
    }

    expect(screen.getByRole('button', { name: '평가 제출' })).toBeEnabled()
    expect(screen.getByText('5/5 완료')).toBeInTheDocument()
  })

  it('0점도 유효한 평가 점수로 선택한다', async () => {
    const user = userEvent.setup()
    render(<StudySessionSidePanel participants={participants} />)

    await user.click(screen.getByRole('tab', { name: '평가' }))
    const zeroScore = screen.getByRole('button', { name: '논리력 0점' })
    await user.click(zeroScore)

    expect(zeroScore).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText('논리력 선택 점수 0점')).toHaveTextContent(
      '0/10',
    )
  })
})
