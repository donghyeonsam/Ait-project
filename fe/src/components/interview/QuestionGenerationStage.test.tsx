import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { QuestionGenerationStage } from '@/components/interview/QuestionGenerationStage'
import type { InterviewInputContract } from '@/lib/interview-session'

const input: InterviewInputContract = {
  contractVersion: 2,
  interviewType: '기술 면접',
  position: '백엔드 개발자',
  careerLevel: '신입',
  difficulty: '어려움',
  style: '압박형',
  csCategories: ['네트워크', '데이터베이스'],
  references: {
    resumeId: 1,
    coverLetterId: 2,
    repositoryId: null,
    retrievalScope: 'selected',
  },
}

describe('QuestionGenerationStage', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('빠른 응답에서는 보이지 않다가 선택한 면접 조건과 함께 나타난다', () => {
    vi.useFakeTimers()
    const { container } = render(<QuestionGenerationStage input={input} />)
    const stage = container.firstElementChild

    expect(stage).toHaveAttribute('aria-hidden', 'true')

    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(stage).toHaveAttribute('aria-hidden', 'false')
    expect(
      screen.getByRole('heading', { name: '맞춤 질문을 준비하고 있어요' }),
    ).toBeInTheDocument()
    expect(screen.getByText('백엔드 개발자 · 기술 면접')).toBeInTheDocument()
    expect(screen.getByText('난이도 어려움')).toBeInTheDocument()
    expect(screen.getByText('CS 주제 2개')).toBeInTheDocument()
    expect(screen.getByText('참고 자료 2개')).toBeInTheDocument()
    expect(screen.getByText('1/4')).toBeInTheDocument()
  })

  it('isLeaving이면 표시 시간이 지나도 페이드아웃 상태로 숨긴다', () => {
    vi.useFakeTimers()
    const { container } = render(
      <QuestionGenerationStage input={input} isLeaving />,
    )

    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true')
    expect(container.firstElementChild).toHaveClass('opacity-0')
  })

  it('오래 걸리면 지연 안내를 추가한다', () => {
    vi.useFakeTimers()
    render(<QuestionGenerationStage input={input} />)

    act(() => {
      vi.advanceTimersByTime(15000)
    })

    expect(
      screen.getByText(
        '평소보다 조금 더 걸리고 있어요. 화면을 닫지 않고 잠시만 기다려주세요.',
      ),
    ).toBeInTheDocument()
  })
})
