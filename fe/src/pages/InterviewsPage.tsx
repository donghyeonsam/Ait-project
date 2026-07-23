import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getInterviewPreparation,
  type InterviewPreparation,
} from '@/api/ai-interviews'
import { toErrorMessage } from '@/api/http'
import { PageLayout } from '@/components/layout/PageLayout'
import { Step1InterviewType } from '@/components/interview/Step1InterviewType'
import { Step2ApplyInfo } from '@/components/interview/Step2ApplyInfo'
import { Step2CsTopics } from '@/components/interview/Step2CsTopics'
import { Step3Style } from '@/components/interview/Step3Style'
import { Step4Summary } from '@/components/interview/Step4Summary'
import { Step5DeviceSetup } from '@/components/interview/Step5DeviceSetup'
import { SurveyFooter } from '@/components/interview/SurveyFooter'
import { SurveyStepper } from '@/components/interview/SurveyStepper'
import { SURVEY_STEP_COUNT, useInterviewSurvey } from '@/components/interview/useInterviewSurvey'
import { createInterviewSessionNavigationState } from '@/lib/interview-session'

export function InterviewsPage() {
  const navigate = useNavigate()
  const survey = useInterviewSurvey()
  const [preparation, setPreparation] = useState<InterviewPreparation | null>(null)
  const [preparationError, setPreparationError] = useState<string | null>(null)
  const [isPreparationLoading, setIsPreparationLoading] = useState(true)
  const { currentStep, state, showApplyInfo, showCsTopics } = survey
  const isLastStep = currentStep === SURVEY_STEP_COUNT

  useEffect(() => {
    let active = true

    getInterviewPreparation()
      .then((response) => {
        if (active) setPreparation(response)
      })
      .catch((error: unknown) => {
        if (active) setPreparationError(toErrorMessage(error))
      })
      .finally(() => {
        if (active) setIsPreparationLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const handleNext = () => {
    if (isLastStep) {
      navigate('/interviews/session', {
        state: createInterviewSessionNavigationState(state),
      })
      return
    }
    survey.goNext()
  }

  return (
    <PageLayout contentClassName="max-w-content">
      <section className="py-12 text-center" aria-labelledby="survey-title">
        <h1 id="survey-title" className="text-h1">나에게 맞는 면접을 준비해 보세요</h1>
        <p className="mt-2 text-body-1 text-text-secondary">
          단계별 설정을 완료하면 AI가 맞춤 질문을 구성해 드려요.
        </p>
      </section>

      <div className="mb-16 rounded-ait-l border border-border-default bg-surface-default p-8 shadow-elevation-1 lg:p-10">
        <SurveyStepper currentStep={currentStep} />

        <div key={currentStep} className="survey-step mt-10 min-h-72">
          {currentStep === 1 ? (
            <Step1InterviewType value={state.interviewType} onSelect={survey.selectInterviewType} />
          ) : null}

          {currentStep === 2 ? (
            <div className="space-y-10">
              {showApplyInfo ? (
                <Step2ApplyInfo
                  position={state.position}
                  careerLevel={state.careerLevel}
                  coverLetterId={state.coverLetterId}
                  repositoryIds={state.repositoryIds}
                  preparation={preparation}
                  isLoading={isPreparationLoading}
                  error={preparationError}
                  onChangePosition={(value) => survey.update('position', value)}
                  onChangeCareerLevel={(value) => survey.update('careerLevel', value)}
                  onSelectCoverLetter={(id) => survey.update('coverLetterId', id)}
                  onToggleRepository={survey.toggleRepository}
                />
              ) : null}
              {showCsTopics ? (
                <Step2CsTopics value={state.csTopics} onToggle={survey.toggleCsTopic} />
              ) : null}
            </div>
          ) : null}

          {currentStep === 3 ? (
            <Step3Style
              difficulty={state.difficulty}
              style={state.style}
              onSelectDifficulty={(value) => survey.update('difficulty', value)}
              onSelectStyle={(value) => survey.update('style', value)}
            />
          ) : null}

          {currentStep === 4 ? (
            <Step4Summary state={state} preparation={preparation} />
          ) : null}

          {currentStep === 5 ? (
            <Step5DeviceSetup
              cameraDeviceId={state.cameraDeviceId}
              speakerDeviceId={state.speakerDeviceId}
              micDeviceId={state.micDeviceId}
              speakerVolume={state.speakerVolume}
              micGain={state.micGain}
              onChangeCamera={(id) => survey.update('cameraDeviceId', id)}
              onChangeSpeaker={(id) => survey.update('speakerDeviceId', id)}
              onChangeMic={(id) => survey.update('micDeviceId', id)}
              onChangeSpeakerVolume={(value) => survey.update('speakerVolume', value)}
              onChangeMicGain={(value) => survey.update('micGain', value)}
              onReadyChange={(ready) => survey.update('deviceReady', ready)}
            />
          ) : null}
        </div>

        <SurveyFooter
          currentStep={currentStep}
          canGoNext={survey.currentStepValid}
          onPrevious={survey.goPrevious}
          onNext={handleNext}
          disabledHint={isLastStep ? '카메라·마이크 접근을 허용해야 면접을 시작할 수 있어요.' : undefined}
        />
      </div>
    </PageLayout>
  )
}
