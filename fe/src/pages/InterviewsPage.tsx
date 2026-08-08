import { useEffect, useRef, useState } from 'react'
import { ArrowDown } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  getInterviewPreparation,
  type InterviewPreparation,
} from '@/api/ai-interviews'
import { toErrorMessage } from '@/api/http'
import { getMyResume } from '@/api/resume'
import { PageLayout } from '@/components/layout/PageLayout'
import { ScreenFadeCurtain } from '@/components/common/ScreenFadeCurtain'
import { Step1InterviewType } from '@/components/interview/Step1InterviewType'
import { Step2ApplyInfo } from '@/components/interview/Step2ApplyInfo'
import { Step2CsTopics } from '@/components/interview/Step2CsTopics'
import { Step3Style } from '@/components/interview/Step3Style'
import { Step4Summary } from '@/components/interview/Step4Summary'
import { Step5DeviceSetup } from '@/components/interview/Step5DeviceSetup'
import { SurveyFooter } from '@/components/interview/SurveyFooter'
import { SurveyStepper, type SurveyStepperItem } from '@/components/interview/SurveyStepper'
import { SURVEY_STEP_LABELS, useInterviewSurvey } from '@/components/interview/useInterviewSurvey'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { createInterviewInputContract, createInterviewSessionNavigationState } from '@/lib/interview-session'
import { clearInterviewQuestionCache, prefetchInterviewQuestions } from '@/lib/interview-question-cache'
import { cn } from '@/lib/utils'

// 각 섹션 상단에 스텝 바와 같은 번호·라벨을 달아 sticky 진행 표시줄과 시각적으로 연결한다.
function StepSectionHeading({ step }: { step: number }) {
  return (
    <p className="border-b border-border-default pb-4 text-caption font-semibold tracking-wider text-action-primary">
      STEP {String(step).padStart(2, '0')} · {SURVEY_STEP_LABELS[step - 1]}
    </p>
  )
}

// 스텝 섹션 공통 카드. 테두리로 단계 사이 경계를 분명히 한다.
const stepSectionClass = 'rounded-ait-m border border-border-default bg-surface-default p-8'

// 면접 시작 버튼(=5단계가 열린 뒤에만 노출되는 하단 바)이 비활성일 때 안내할 문구.
// 이 시점엔 1~4단계는 이미 확인을 마친 상태라 장치 준비 여부만 남는다.
function getDisabledHint(stepValidity: boolean[]) {
  if (!stepValidity[4]) return '카메라·마이크 접근을 허용해야 면접을 시작할 수 있어요.'
  return undefined
}

// 면접 설정 화면. 5단계 설문을 한 페이지에서 스크롤로 진행하고 완료 시 면접 세션으로 이동한다.
export function InterviewsPage() {
  const navigate = useNavigate()
  const survey = useInterviewSurvey()
  const [preparation, setPreparation] = useState<InterviewPreparation | null>(null)
  const [resumeId, setResumeId] = useState<number | null>(null)
  const [preparationError, setPreparationError] = useState<string | null>(null)
  const [isPreparationLoading, setIsPreparationLoading] = useState(true)
  const [isLeavingToSession, setIsLeavingToSession] = useState(false)
  // 4단계에서 확인을 누른 시점의 입력 조합(JSON 키)을 저장해 둔다. 확인 이후 1~3단계를 다시
  // 바꾸면 키가 달라져 자동으로 잠기므로, 5단계는 항상 "확인된 최신 입력"에서만 열린다.
  const [confirmedInputKey, setConfirmedInputKey] = useState<string | null>(null)
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false)
  // 2단계의 "다음"은 한 번 누르면 사라지는 1회용 버튼이라 클릭 여부를 별도로 기억해 둔다.
  const [isStep3Revealed, setIsStep3Revealed] = useState(false)
  const sectionRefs = useRef<(HTMLElement | null)[]>([])
  const stickyBarRef = useRef<HTMLDivElement | null>(null)
  const { state, stepValidity, showApplyInfo, showCsTopics } = survey

  useEffect(() => {
    // 언마운트 후 응답이 도착해 setState가 호출되는 것을 막는 플래그.
    let active = true

    // 자기소개서 조회는 실패해도 설문을 막지 않으므로 null로 처리하고 계속 진행한다.
    Promise.all([
      getInterviewPreparation(),
      getMyResume().catch(() => null),
    ])
      .then(([preparationResponse, resumeResponse]) => {
        if (!active) return
        setPreparation(preparationResponse)
        setResumeId(resumeResponse?.resumeId ?? null)
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

  // 최종 확인(4단계)이 완료로 판정되는 조건은 1~3단계가 모두 유효한 것과 같다.
  const canConfirmStep4 = stepValidity[3]
  const currentInputKey = canConfirmStep4
    ? JSON.stringify(createInterviewInputContract(state, resumeId))
    : null
  // 5단계(환경 설정)는 4단계에서 확인 버튼을 눌러야만 열린다. 확인 이후 1~3단계 값을 바꾸면
  // currentInputKey가 달라져 다시 잠기고, 재확인이 필요해진다.
  const isStep5Unlocked = confirmedInputKey !== null && confirmedInputKey === currentInputKey
  // 1단계는 선택 즉시 완료로 볼 수 있어 값이 생기는 순간 2단계를 연다.
  const isStep2Revealed = state.interviewType !== null
  // 3단계는 난이도·스타일을 각각 하나씩 고르면 자연스럽게 완료로 볼 수 있어 자동으로 4단계를 연다.
  const isStep4Revealed = stepValidity[2]

  // sticky 스텝 바 아래에 섹션 상단이 오도록 헤더·바 높이를 실측해 스크롤한다(zoom 0.9 보정 포함).
  const scrollToStep = (step: number) => {
    const section = sectionRefs.current[step - 1]
    if (!section) return
    const headerHeight = document.querySelector('header')?.getBoundingClientRect().height ?? 0
    const barHeight = stickyBarRef.current?.getBoundingClientRect().height ?? 0
    const top = section.getBoundingClientRect().top + window.scrollY - headerHeight - barHeight - 32
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
  }

  // 4단계 확인 버튼을 누르는 시점에만 질문 생성을 시작하고, 5단계 섹션이 열리면 그쪽으로 스크롤한다.
  const handleConfirmStep4 = () => {
    if (!canConfirmStep4 || !currentInputKey) return
    setConfirmedInputKey(currentInputKey)
    void prefetchInterviewQuestions(createInterviewInputContract(state, resumeId))
  }

  // 확인을 되돌리는 것은 지금까지 고른 항목을 모두 비우는 되돌리기 어려운 동작이라 다이얼로그로 한 번 더 확인한다.
  const handleConfirmReset = () => {
    survey.reset()
    setConfirmedInputKey(null)
    setIsStep3Revealed(false)
    clearInterviewQuestionCache()
    setIsResetDialogOpen(false)
    scrollToStep(1)
  }

  // 새 단계가 열리는 순간에만 그쪽으로 스크롤한다. 이미 열린 뒤에는 값이 바뀌어도 다시 스크롤하지 않는다.
  useEffect(() => {
    if (!isStep2Revealed) return
    scrollToStep(2)
  }, [isStep2Revealed])

  useEffect(() => {
    if (!isStep3Revealed) return
    scrollToStep(3)
  }, [isStep3Revealed])

  useEffect(() => {
    if (!isStep4Revealed) return
    scrollToStep(4)
  }, [isStep4Revealed])

  useEffect(() => {
    if (!isStep5Unlocked) return
    scrollToStep(5)
  }, [isStep5Unlocked])

  // 확인 후 1~3단계를 다시 바꿔 5단계가 잠기면, 언마운트된 장치 설정의 준비 상태도 함께 초기화한다.
  // 그렇지 않으면 카메라 스트림은 이미 꺼졌는데 deviceReady만 true로 남아 시작 버튼이 잘못 활성화된다.
  useEffect(() => {
    if (!isStep5Unlocked && state.deviceReady) {
      survey.update('deviceReady', false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStep5Unlocked])

  const coverLetterTitle = preparation?.coverLetters
    .find((coverLetter) => String(coverLetter.id) === state.coverLetterId)?.title ?? null

  // 스텝 바 각 항목 아래에 보여줄 선택 요약. 아직 고르지 않은 항목은 비워 둔다.
  const stepSummaries: (string | null)[] = [
    state.interviewType,
    [
      showApplyInfo ? state.position.trim() || null : null,
      showApplyInfo ? state.careerLevel.trim() || null : null,
      showApplyInfo ? coverLetterTitle : null,
      showCsTopics && state.csTopics.length > 0 ? state.csTopics.join(' · ') : null,
    ].filter(Boolean).join(' · ') || null,
    [state.difficulty, state.style].filter(Boolean).join(' · ') || null,
    null,
    isStep5Unlocked && state.deviceReady ? '장치 준비 완료' : null,
  ]

  // 4단계는 1~3단계 값만으로는 "완료"로 보지 않고, 확인 버튼을 눌러야 완료·5단계 진행으로 취급한다.
  const displayStepValidity = stepValidity.map((valid, index) => (index === 3 ? isStep5Unlocked : valid))
  const firstIncompleteDisplayStep = displayStepValidity.findIndex((valid) => !valid)
  const currentDisplayStep = firstIncompleteDisplayStep === -1 ? null : firstIncompleteDisplayStep + 1

  const stepperItems: SurveyStepperItem[] = SURVEY_STEP_LABELS.map((label, index) => ({
    label,
    isComplete: displayStepValidity[index],
    summary: stepSummaries[index] ?? undefined,
  }))

  return (
    // 진행 표시줄을 헤더처럼 화면 전체 폭으로 고정하기 위해 기본 폭 제한을 풀고 내부에서 직접 관리한다.
    <PageLayout contentClassName="max-w-none px-0">
      <div className="mx-auto max-w-content px-8">
        <div className="survey-zoom-90 pt-12">
          <section className="pb-10 text-center" aria-labelledby="survey-title">
            <h1 id="survey-title" className="text-h1">나에게 맞는 면접을 준비해 보세요</h1>
            <p className="mt-2 text-body-1 text-text-secondary">
              스크롤하며 각 항목을 선택하면 AI가 맞춤 질문을 구성해 드려요.
            </p>
          </section>
        </div>
      </div>

      {/* 전체 폭 배경·경계선이 있어야 아래로 지나가는 콘텐츠가 바에 가려지는 것이 자연스럽게 보인다.
          zoom 0.9 래퍼 안에서는 sticky top이 0.9배로 렌더링돼 헤더와 틈이 생기므로 바는 래퍼 밖에 둔다. */}
      <div
        ref={stickyBarRef}
        className="survey-sticky-stepper w-full border-b border-border-default bg-surface-default py-4"
      >
        <div className="mx-auto max-w-content px-8">
          <div className="survey-zoom-90">
            <SurveyStepper
              items={stepperItems}
              currentStep={currentDisplayStep}
              onStepClick={scrollToStep}
            />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-content px-8">
        <div className="survey-zoom-90">
        <div className="survey-step mt-8 space-y-10">
          <section ref={(element) => { sectionRefs.current[0] = element }} className={stepSectionClass}>
            <StepSectionHeading step={1} />
            <div className="mt-6">
              <Step1InterviewType
                value={state.interviewType}
                onSelect={survey.selectInterviewType}
                disabled={isStep5Unlocked}
              />
            </div>
          </section>

          {isStep2Revealed ? (
            <section
              ref={(element) => { sectionRefs.current[1] = element }}
              className={cn(stepSectionClass, 'survey-step')}
            >
              <StepSectionHeading step={2} />
              <div className="mt-6 space-y-10">
                {showApplyInfo ? (
                  <Step2ApplyInfo
                    position={state.position}
                    careerLevel={state.careerLevel}
                    coverLetterId={state.coverLetterId}
                    repositoryId={state.repositoryId}
                    preparation={preparation}
                    isLoading={isPreparationLoading}
                    error={preparationError}
                    onChangePosition={(value) => survey.update('position', value)}
                    onChangeCareerLevel={(value) => survey.update('careerLevel', value)}
                    onSelectCoverLetter={(id) => survey.update('coverLetterId', id)}
                    onSelectRepository={survey.selectRepository}
                    disabled={isStep5Unlocked}
                  />
                ) : null}
                {showCsTopics ? (
                  <Step2CsTopics
                    value={state.csTopics}
                    onToggle={survey.toggleCsTopic}
                    disabled={isStep5Unlocked}
                  />
                ) : null}
              </div>
              {/* 텍스트 입력이 섞여 있어 "완료" 시점을 자동으로 판단하기 어려우므로 수동 완료 버튼을 둔다.
                  필수 항목을 채워야 활성화되고, 한 번 눌러 3단계가 열리면 다시 스크롤해 올라와도 다시 나타나지 않는다. */}
              {!isStep3Revealed ? (
                <div className="mt-8 flex justify-center border-t border-border-default pt-6">
                  <Button type="button" disabled={!stepValidity[1]} onClick={() => setIsStep3Revealed(true)}>
                    다음으로
                    <ArrowDown className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              ) : null}
            </section>
          ) : null}

          {isStep3Revealed ? (
            <section
              ref={(element) => { sectionRefs.current[2] = element }}
              className={cn(stepSectionClass, 'survey-step')}
            >
              <StepSectionHeading step={3} />
              <div className="mt-6">
                <Step3Style
                  difficulty={state.difficulty}
                  style={state.style}
                  onSelectDifficulty={(value) => survey.update('difficulty', value)}
                  onSelectStyle={(value) => survey.update('style', value)}
                  disabled={isStep5Unlocked}
                />
              </div>
            </section>
          ) : null}

          {isStep4Revealed ? (
            <section
              ref={(element) => { sectionRefs.current[3] = element }}
              className={cn(stepSectionClass, 'survey-step')}
            >
              <StepSectionHeading step={4} />
              <div className="mt-6">
                <Step4Summary
                  state={state}
                  preparation={preparation}
                  canConfirm={canConfirmStep4}
                  isConfirmed={isStep5Unlocked}
                  onConfirm={handleConfirmStep4}
                  onReset={() => setIsResetDialogOpen(true)}
                />
              </div>
            </section>
          ) : null}

          {isStep5Unlocked ? (
            <section
              ref={(element) => { sectionRefs.current[4] = element }}
              className={cn(stepSectionClass, 'survey-step')}
            >
              <StepSectionHeading step={5} />
              <div className="mt-6">
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
              </div>
            </section>
          ) : null}
        </div>

          <div className="pb-16">
            {isStep5Unlocked ? (
              <SurveyFooter
                completedCount={displayStepValidity.filter(Boolean).length}
                canStart={survey.allStepsValid}
                onStart={() => setIsLeavingToSession(true)}
                disabledHint={getDisabledHint(stepValidity)}
              />
            ) : null}
          </div>
        </div>
      </div>

      {isLeavingToSession ? (
        <ScreenFadeCurtain
          covered
          onCoverComplete={() =>
            navigate('/interviews/session', {
              state: createInterviewSessionNavigationState(state, resumeId),
            })
          }
        />
      ) : null}

      <ConfirmDialog
        open={isResetDialogOpen}
        onOpenChange={setIsResetDialogOpen}
        title="다시 선택할까요?"
        description="지금까지 선택한 항목이 모두 초기화되고 1단계부터 다시 진행해요. 이 작업은 되돌릴 수 없어요."
        confirmLabel="다시 선택하기"
        confirmVariant="destructive"
        onConfirm={handleConfirmReset}
      />
    </PageLayout>
  )
}
