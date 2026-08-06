import { Button } from '@/components/ui/button'
import { SURVEY_STEP_COUNT } from '@/components/interview/useInterviewSurvey'

interface SurveyFooterProps {
  completedCount: number
  canStart: boolean
  onStart: () => void
  disabledHint?: string
}

// 설문 하단 영역. 완료한 단계 수와 면접 시작 버튼을 담당한다.
export function SurveyFooter({ completedCount, canStart, onStart, disabledHint }: SurveyFooterProps) {
  const showHint = !canStart && Boolean(disabledHint)

  return (
    <div className="mt-12 flex items-center justify-between border-t border-border-default pt-6">
      <p className="text-body-2 text-text-secondary">
        <span className="font-medium text-text-primary">{completedCount} / {SURVEY_STEP_COUNT}</span> 단계 완료
      </p>

      <div className="flex items-center gap-3">
        {showHint ? (
          <p id="survey-start-hint" className="text-caption text-status-error">
            {disabledHint}
          </p>
        ) : null}
        <Button
          type="button"
          variant="primary"
          disabled={!canStart}
          aria-describedby={showHint ? 'survey-start-hint' : undefined}
          onClick={onStart}
        >
          면접 시작
        </Button>
      </div>
    </div>
  )
}
