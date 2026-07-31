import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SurveyStepper } from '@/components/interview/SurveyStepper'

describe('SurveyStepper', () => {
  it('현재 단계에만 펄스 효과를 적용하고 단계가 바뀌면 함께 이동한다', () => {
    const { container, rerender } = render(<SurveyStepper currentStep={2} />)

    expect(screen.getByText('02')).toHaveAttribute('aria-current', 'step')
    expect(screen.getByText('02')).toHaveClass('survey-stepper-current')
    expect(container.querySelectorAll('.survey-stepper-current')).toHaveLength(1)

    rerender(<SurveyStepper currentStep={4} />)

    expect(screen.getByText('04')).toHaveAttribute('aria-current', 'step')
    expect(screen.getByText('04')).toHaveClass('survey-stepper-current')
    expect(container.querySelectorAll('.survey-stepper-current')).toHaveLength(1)
  })
})
