import { difficultyOptions, interviewStyleOptions, type Difficulty, type InterviewStyle } from '@/mocks/interview'
import { cn } from '@/lib/utils'

interface Step3StyleProps {
  difficulty: Difficulty | null
  style: InterviewStyle | null
  onSelectDifficulty: (difficulty: Difficulty) => void
  onSelectStyle: (style: InterviewStyle) => void
}

function toggleButtonClass(isSelected: boolean) {
  return cn(
    'flex-1 rounded-ait-s border px-4 py-3 text-body-1 font-medium transition-colors ease-standard duration-(--duration-fast)',
    isSelected
      ? 'border-action-primary bg-action-primary text-surface-default'
      : 'border-status-neutral-border bg-status-neutral-surface text-text-secondary hover:border-action-primary/40',
  )
}

export function Step3Style({ difficulty, style, onSelectDifficulty, onSelectStyle }: Step3StyleProps) {
  return (
    <section aria-labelledby="step3-title" className="space-y-8">
      <h2 id="step3-title" className="sr-only">진행 방식</h2>

      <div>
        <h3 className="text-h3">어떤 난이도로 연습해 볼까요?</h3>
        <div className="mt-4 flex gap-3" role="radiogroup" aria-label="난이도">
          {difficultyOptions.map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={difficulty === option}
              className={toggleButtonClass(difficulty === option)}
              onClick={() => onSelectDifficulty(option)}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-h3">어떤 스타일로 연습해 볼까요?</h3>
        <div className="mt-4 flex gap-3" role="radiogroup" aria-label="스타일">
          {interviewStyleOptions.map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={style === option}
              className={toggleButtonClass(style === option)}
              onClick={() => onSelectStyle(option)}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
