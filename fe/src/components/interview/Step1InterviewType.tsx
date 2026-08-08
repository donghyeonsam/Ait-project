import { Check } from 'lucide-react'
import { interviewGoalOptions } from '@/mocks/interview'
import { cn } from '@/lib/utils'

interface Step1InterviewTypeProps {
  value: string | null
  onSelect: (type: (typeof interviewGoalOptions)[number]['type']) => void
  disabled?: boolean
}

// 설문 1단계. 연습할 면접 유형을 하나만 고르는 단일 선택 화면.
export function Step1InterviewType({ value, onSelect, disabled = false }: Step1InterviewTypeProps) {
  return (
    <section aria-labelledby="step1-title">
      <h2 id="step1-title" className="text-h3">어떤 면접을 연습할까요?</h2>
      <p className="mt-1 text-body-2 text-text-secondary">연습 목적에 가까운 유형을 하나 선택해 주세요.</p>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-5" role="radiogroup" aria-labelledby="step1-title">
        {interviewGoalOptions.map((option) => {
          const isSelected = value === option.type

          return (
            <button
              key={option.type}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={disabled}
              onClick={() => onSelect(option.type)}
              className={cn(
                'flex flex-col items-start gap-4 rounded-ait-m border p-5 text-left transition-colors ease-standard duration-(--duration-fast)',
                isSelected
                  ? 'border-action-primary bg-surface-default shadow-elevation-1'
                  : 'border-status-neutral-border bg-surface-default hover:border-action-primary/40',
                disabled && 'cursor-not-allowed opacity-50 hover:border-status-neutral-border',
              )}
            >
              <div>
                <p className="text-body-1 font-semibold text-text-primary">{option.type}</p>
                <p className="mt-1 text-body-2 text-text-secondary">{option.description}</p>
              </div>
              <span
                aria-hidden="true"
                className={cn(
                  'flex size-6 items-center justify-center rounded-ait-pill border',
                  isSelected
                    ? 'border-action-primary bg-action-primary text-surface-default'
                    : 'border-status-neutral-border bg-surface-default',
                )}
              >
                {isSelected ? <Check className="size-4" /> : null}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
