import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SurveyStepper, type SurveyStepperItem } from '@/components/interview/SurveyStepper'
import { SURVEY_STEP_LABELS } from '@/components/interview/useInterviewSurvey'

function createItems(overrides: Partial<SurveyStepperItem>[] = []): SurveyStepperItem[] {
  return SURVEY_STEP_LABELS.map((label, index) => ({
    label,
    isComplete: false,
    ...overrides[index],
  }))
}

describe('SurveyStepper', () => {
  it('첫 미완료 단계에만 펄스 효과를 적용하고 완료 단계는 체크로 표시한다', () => {
    const items = createItems([
      { isComplete: true, summary: '직무 면접' },
      { isComplete: true, summary: '프론트엔드 · 신입' },
    ])
    const { container } = render(<SurveyStepper items={items} currentStep={3} />)

    expect(screen.getByRole('button', { name: /진행 방식/ })).toHaveAttribute('aria-current', 'step')
    expect(container.querySelectorAll('.survey-stepper-current')).toHaveLength(1)
    // 완료된 1·2단계는 숫자 대신 체크 아이콘으로 바뀐다.
    expect(screen.queryByText('01')).not.toBeInTheDocument()
    expect(screen.queryByText('02')).not.toBeInTheDocument()
    expect(screen.getByText('03')).toHaveClass('survey-stepper-current')
  })

  it('선택한 내용을 각 단계 아래에 요약으로 보여준다', () => {
    const items = createItems([
      { isComplete: true, summary: '직무 면접' },
      {},
      { summary: '보통 · 밸런스형' },
    ])
    render(<SurveyStepper items={items} currentStep={2} />)

    expect(screen.getByText('직무 면접')).toBeInTheDocument()
    expect(screen.getByText('보통 · 밸런스형')).toBeInTheDocument()
  })

  it('단계를 클릭하면 해당 단계 번호로 onStepClick을 호출한다', () => {
    const onStepClick = vi.fn()
    render(<SurveyStepper items={createItems()} currentStep={1} onStepClick={onStepClick} />)

    fireEvent.click(screen.getByRole('button', { name: /환경 설정/ }))

    expect(onStepClick).toHaveBeenCalledWith(5)
  })
})
