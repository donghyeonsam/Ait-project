import { cn } from '@/lib/utils'

const steps = [
  { number: '01', label: '계정 생성' },
  { number: '02', label: '정보 설정' },
  { number: '03', label: '가입 완료' },
]

export function SignupStepper() {
  return (
    <ol className="mt-auto flex w-full pt-8" aria-label="회원가입 진행 단계">
      {steps.map((step, index) => {
        const isActive = index === 0
        return (
          <li key={step.number} className="relative flex flex-1 flex-col items-center">
            {index > 0 ? (
              <span
                className="absolute right-1/2 top-4 h-px w-full bg-border-default"
                aria-hidden="true"
              />
            ) : null}
            <span
              className={cn(
                'relative z-[var(--z-index-base)] flex size-8 items-center justify-center rounded-ait-pill border text-caption font-bold',
                isActive
                  ? 'border-action-primary bg-action-primary text-surface-default'
                  : 'border-border-default bg-surface-default text-text-secondary',
              )}
              aria-current={isActive ? 'step' : undefined}
            >
              {step.number}
            </span>
            <span
              className={cn(
                'mt-2 text-caption',
                isActive ? 'font-semibold text-action-primary' : 'text-text-secondary',
              )}
            >
              {step.label}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
