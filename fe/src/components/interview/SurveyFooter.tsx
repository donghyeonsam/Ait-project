import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SURVEY_STEP_COUNT } from '@/components/interview/useInterviewSurvey'

interface SurveyFooterProps {
  currentStep: number
  canGoNext: boolean
  onPrevious: () => void
  onNext: () => void
  disabledHint?: string
}

// 설문 하단 내비게이션. 진행 단계 표시와 이전/다음(마지막 단계에서는 '면접 시작') 버튼을 담당한다.
export function SurveyFooter({ currentStep, canGoNext, onPrevious, onNext, disabledHint }: SurveyFooterProps) {
  const isFirstStep = currentStep === 1
  const isLastStep = currentStep === SURVEY_STEP_COUNT
  const showHint = !canGoNext && Boolean(disabledHint)

  return (
    <div className="mt-8 flex items-center justify-between border-t border-border-default pt-6">
      <p className="text-body-2 text-text-secondary">
        <span className="font-medium text-text-primary">{currentStep} / {SURVEY_STEP_COUNT}</span> 단계
        <span className="ml-2">선택내용은 자동 저장됩니다.</span>
      </p>

      <div className="flex items-center gap-3">
        {showHint ? (
          <p id="survey-next-hint" className="text-caption text-status-error">
            {disabledHint}
          </p>
        ) : null}
        {!isFirstStep ? (
          <Button type="button" variant="secondary" onClick={onPrevious}>
            이전으로
          </Button>
        ) : null}
        <Button
          type="button"
          variant="primary"
          disabled={!canGoNext}
          aria-describedby={showHint ? 'survey-next-hint' : undefined}
          onClick={onNext}
        >
          {isLastStep ? '면접 시작' : '다음 단계로'}
          {isLastStep ? null : <ArrowRight className="size-4" aria-hidden="true" />}
        </Button>
      </div>
    </div>
  )
}
