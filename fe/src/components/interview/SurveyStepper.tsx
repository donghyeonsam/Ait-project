import { clsx } from 'clsx'
import { Check } from 'lucide-react'

export interface SurveyStepperItem {
  label: string
  isComplete: boolean
  summary?: string
}

interface SurveyStepperProps {
  items: SurveyStepperItem[]
  /** 펄스로 강조할 단계(첫 미완료 단계). 모두 완료면 null. */
  currentStep: number | null
  onStepClick?: (step: number) => void
}

// 설문 상단 진행 표시줄. 단계별 완료 여부와 선택 요약을 보여주고, 클릭하면 해당 섹션으로 이동한다.
// cn(tailwind-merge)은 커스텀 타이포 유틸(text-caption 등)을 색상 클래스와 충돌로 오인해
// 제거하므로, 타이포와 색상을 함께 조합하는 곳은 clsx로만 결합한다.
export function SurveyStepper({ items, currentStep, onStepClick }: SurveyStepperProps) {
  return (
    <ol className="flex items-start" aria-label="설문 진행 단계">
      {items.map((item, index) => {
        const stepNumber = index + 1
        const isCurrent = stepNumber === currentStep

        return (
          <li key={item.label} className={clsx('flex items-start', stepNumber !== items.length && 'flex-1')}>
            {/* 요약 길이에 따라 배지 위치와 연결선 길이가 흔들리지 않도록 스텝 칼럼 폭을 고정한다. */}
            <button
              type="button"
              aria-current={isCurrent ? 'step' : undefined}
              onClick={() => onStepClick?.(stepNumber)}
              className="group flex w-36 shrink-0 cursor-pointer flex-col items-center gap-2 rounded-ait-s p-1 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-action-primary/25"
            >
              <div
                className={clsx(
                  'flex size-10 shrink-0 items-center justify-center rounded-ait-pill border-2 text-body-2 font-semibold transition-all ease-standard duration-(--duration-base)',
                  item.isComplete && 'border-action-primary bg-action-primary text-surface-default',
                  isCurrent &&
                    'survey-stepper-current scale-110 border-action-primary bg-surface-default text-action-primary shadow-elevation-2 ring-4 ring-action-primary/20',
                  !item.isComplete && !isCurrent &&
                    'border-status-neutral-border bg-surface-default text-text-secondary group-hover:border-action-primary/40',
                )}
              >
                {item.isComplete ? (
                  <Check className="size-5" aria-hidden="true" />
                ) : (
                  String(stepNumber).padStart(2, '0')
                )}
              </div>
              <span className="flex flex-col items-center gap-0.5">
                <span
                  className={clsx(
                    'text-body-2 whitespace-nowrap',
                    isCurrent ? 'font-semibold text-text-primary' : 'text-text-secondary',
                  )}
                >
                  {item.label}
                </span>
                {/* 요약이 없으면 공백 문자로 줄 높이를 유지해 선택할 때 sticky 바 높이가 흔들리지 않게 한다.
                    선택 항목이 여러 개면 말줄임 대신 줄바꿈으로 모두 보여준다. */}
                <span
                  className={clsx(
                    'w-full break-keep text-center text-caption',
                    item.summary ? 'font-medium text-action-primary' : 'text-text-secondary',
                  )}
                >
                  {item.summary ?? ' '}
                </span>
              </span>
            </button>

            {stepNumber !== items.length ? (
              <div className="mx-3 mt-6 h-0.5 flex-1 -translate-y-px rounded-full bg-status-neutral-surface">
                <div
                  className={clsx(
                    'h-full rounded-full bg-action-primary transition-[width] duration-slow ease-standard',
                    item.isComplete ? 'w-full' : 'w-0',
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
