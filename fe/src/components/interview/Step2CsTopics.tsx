import { csTopicOptions, type CsTopic } from '@/mocks/interview'
import { CS_TOPIC_MAX } from '@/components/interview/useInterviewSurvey'
import { cn } from '@/lib/utils'

interface Step2CsTopicsProps {
  value: CsTopic[]
  onToggle: (topic: CsTopic) => void
  disabled?: boolean
}

// 설문 2단계(CS 주제). 최대 CS_TOPIC_MAX개까지 다중 선택하며, 한도에 도달하면 미선택 항목을 비활성화한다.
export function Step2CsTopics({ value, onToggle, disabled = false }: Step2CsTopicsProps) {
  return (
    <section aria-labelledby="step2-cs-title">
      <div className="flex items-baseline justify-between">
        <h2 id="step2-cs-title" className="text-h3">어떤 CS 주제로 연습해 볼까요?</h2>
        <span className="text-caption text-text-secondary">다중 선택 가능 ( 최대 {CS_TOPIC_MAX}개 )</span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3" role="group" aria-labelledby="step2-cs-title">
        {csTopicOptions.map((topic) => {
          const isSelected = value.includes(topic)
          const isDisabled = disabled || (!isSelected && value.length >= CS_TOPIC_MAX)

          return (
            <button
              key={topic}
              type="button"
              aria-pressed={isSelected}
              disabled={isDisabled}
              onClick={() => onToggle(topic)}
              className={cn(
                'rounded-ait-s border px-4 py-3 text-body-2 font-medium transition-colors ease-standard duration-(--duration-fast)',
                isSelected
                  ? 'border-action-primary bg-action-primary text-surface-default'
                  : 'border-status-neutral-border bg-status-neutral-surface text-text-secondary',
                isDisabled && 'cursor-not-allowed opacity-50',
                !isSelected && !isDisabled && 'hover:border-action-primary/40',
              )}
            >
              {topic}
            </button>
          )
        })}
      </div>
    </section>
  )
}
