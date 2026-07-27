import { Check } from 'lucide-react'
import { SURVEY_STEP_LABELS } from '@/components/interview/useInterviewSurvey'
import { cn } from '@/lib/utils'

interface SurveyStepperProps {
  currentStep: number
}

// 설문 상단 진행 표시줄. 완료/현재/대기 단계를 시각적으로 구분해 보여준다.
export function SurveyStepper({ currentStep }: SurveyStepperProps) {
  return (
    <ol className="flex items-start" aria-label="설문 진행 단계">
      {SURVEY_STEP_LABELS.map((label, index) => {
        const stepNumber = index + 1
        const isComplete = stepNumber < currentStep
        const isCurrent = stepNumber === currentStep

        return (
          <li key={label} className={cn('flex items-center', stepNumber !== SURVEY_STEP_LABELS.length && 'flex-1')}>
            <div className="flex shrink-0 flex-col items-center gap-2">
              <div
                aria-current={isCurrent ? 'step' : undefined}
                className={cn(
                  'flex size-10 shrink-0 items-center justify-center rounded-ait-pill border-2 text-body-2 font-semibold transition-all ease-standard duration-(--duration-base)',
                  isComplete && 'border-action-primary bg-action-primary text-surface-default',
                  isCurrent &&
                    'scale-110 border-action-primary bg-surface-default text-action-primary shadow-elevation-2 ring-4 ring-action-primary/20',
                  !isComplete && !isCurrent && 'border-status-neutral-border bg-surface-default text-text-secondary',
                )}
              >
                {isComplete ? (
                  <Check className="size-5" aria-hidden="true" />
                ) : (
                  String(stepNumber).padStart(2, '0')
                )}
              </div>
              <span
                className={cn(
                  'text-body-2 whitespace-nowrap',
                  isCurrent ? 'font-semibold text-text-primary' : 'text-text-secondary',
                )}
              >
                {label}
              </span>
            </div>

            {stepNumber !== SURVEY_STEP_LABELS.length ? (
              <div className="mx-3 h-0.5 flex-1 -translate-y-5 rounded-full bg-status-neutral-surface">
                <div
                  className={cn(
                    'h-full rounded-full bg-action-primary transition-[width] duration-slow ease-standard',
                    stepNumber < currentStep ? 'w-full' : 'w-0',
                  )}
                />
              </div>
            ) : null}
          </li>
        )
      })}
    </ol>
  )
}
