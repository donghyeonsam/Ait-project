import { lazy, Suspense, useEffect, useState } from 'react'
import { GradientBlob } from '@/components/reactbits/GradientBlob'
import type { InterviewInputContract } from '@/lib/interview-session'

const STAGE_VISIBILITY_DELAY_MS = 300
const STATUS_ROTATION_MS = 2600
const TIP_ROTATION_MS = 7000
const SLOW_REQUEST_NOTICE_MS = 15000
const MagicRings = lazy(() =>
  import('@/components/reactbits/MagicRings').then((module) => ({
    default: module.MagicRings,
  })),
)

interface QuestionGenerationStageProps {
  input: InterviewInputContract
  /** true면 면접 화면 전환을 위해 페이드아웃한다. */
  isLeaving?: boolean
}

function getReferenceCount(input: InterviewInputContract) {
  return [
    input.references.resumeId,
    input.references.coverLetterId,
    input.references.repositoryId,
  ].filter((id) => id !== null).length
}

function createConfigurationChips(input: InterviewInputContract): string[] {
  const referenceCount = getReferenceCount(input)
  const chips = [
    input.position
      ? `${input.position} · ${input.interviewType}`
      : input.interviewType,
    `난이도 ${input.difficulty}`,
    input.style,
  ]

  if (input.csCategories.length > 0) {
    chips.push(`CS 주제 ${input.csCategories.length}개`)
  }

  if (referenceCount > 0) {
    chips.push(`참고 자료 ${referenceCount}개`)
  }

  return chips
}

function createStatusMessages(input: InterviewInputContract) {
  const referenceCount = getReferenceCount(input)

  return [
    '선택한 면접 조건을 질문에 반영하고 있어요.',
    referenceCount > 0
      ? '선택한 자료에서 질문의 실마리를 찾고 있어요.'
      : '직무와 난이도에 맞는 질문을 고르고 있어요.',
    '실전처럼 자연스럽도록 질문의 흐름을 다듬고 있어요.',
  ]
}

function createInterviewTips(input: InterviewInputContract) {
  const tips = [
    '답변의 첫 문장은 핵심 결론으로 시작해 보세요.',
    input.interviewType === 'CS 면접' || input.interviewType === '기술 면접'
      ? '풀이 과정을 소리 내어 설명하면 사고 흐름을 더 잘 전달할 수 있어요.'
      : '경험 질문은 상황·행동·결과 순서로 정리하면 전달하기 쉬워요.',
  ]

  if (input.style === '압박형') {
    tips.push(
      '꼬리질문에는 서두르지 말고 질문의 핵심을 한 번 정리한 뒤 답해 보세요.',
    )
  } else if (input.difficulty === '어려움') {
    tips.push(
      '모르는 질문은 아는 범위와 추가로 확인할 부분을 나눠 말해 보세요.',
    )
  } else {
    tips.push('답변마다 구체적인 경험이나 근거를 하나씩 덧붙여 보세요.')
  }

  tips.push('한 답변은 30초에서 1분 분량으로 간결하게 유지해 보세요.')

  return tips
}

// 질문 응답을 기다리는 동안 면접 설정과 준비 팁을 파스텔 대기 화면으로 보여준다.
// 실제 진행률 데이터가 없으므로 %·남은 시간 등 확정 표현은 사용하지 않는다.
export function QuestionGenerationStage({
  input,
  isLeaving = false,
}: QuestionGenerationStageProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [statusIndex, setStatusIndex] = useState(0)
  const [tipIndex, setTipIndex] = useState(0)
  const [showSlowRequestNotice, setShowSlowRequestNotice] = useState(false)
  const [primaryChip, ...secondaryChips] = createConfigurationChips(input)
  const statusMessages = createStatusMessages(input)
  const interviewTips = createInterviewTips(input)

  useEffect(() => {
    const visibilityTimer = window.setTimeout(
      () => setIsVisible(true),
      STAGE_VISIBILITY_DELAY_MS,
    )
    const statusTimer = window.setInterval(() => {
      setStatusIndex((index) => (index + 1) % statusMessages.length)
    }, STATUS_ROTATION_MS)
    const tipTimer = window.setInterval(() => {
      setTipIndex((index) => (index + 1) % interviewTips.length)
    }, TIP_ROTATION_MS)
    const slowRequestTimer = window.setTimeout(
      () => setShowSlowRequestNotice(true),
      SLOW_REQUEST_NOTICE_MS,
    )

    return () => {
      window.clearTimeout(visibilityTimer)
      window.clearInterval(statusTimer)
      window.clearInterval(tipTimer)
      window.clearTimeout(slowRequestTimer)
    }
  }, [interviewTips.length, statusMessages.length])

  return (
    <div
      className={`relative flex w-full flex-1 flex-col overflow-hidden p-5 transition-opacity duration-(--duration-slow) sm:px-12 sm:pt-7 sm:pb-10 ${
        isVisible && !isLeaving ? 'opacity-100' : 'opacity-0'
      }`}
      aria-hidden={!isVisible || isLeaving}
      aria-busy="true"
    >
      <div className="question-generation-glow" aria-hidden="true" />

      <div className="relative flex justify-end">
        <span className="question-generation-status-chip inline-flex items-center gap-2 rounded-ait-pill px-3.5 py-2">
          <span className="question-generation-status-dot" aria-hidden="true" />
          면접 준비 중
        </span>
      </div>

      <div className="relative flex flex-1 flex-col items-center justify-center py-8 text-center">
        <div className="question-generation-visual" aria-hidden="true">
          <Suspense fallback={null}>
            <MagicRings
              className="question-generation-magic-rings"
              color="#2E4A72"
              colorTwo="#C19B55"
              speed={0.34}
              ringCount={5}
              attenuation={10.5}
              lineThickness={1.55}
              baseRadius={0.4}
              radiusStep={0.02}
              scaleRate={0.045}
              opacity={0.52}
              noiseAmount={0}
              rotation={-8}
              ringGap={1.12}
              fadeIn={0.55}
              fadeOut={0.72}
            />
          </Suspense>
          <GradientBlob
            className="question-generation-blob"
            speed={0.72}
            primaryColor="#1A2A4A"
            secondaryColor="#5A7BA6"
            accentColor="#C9A96E"
            baseColor="#DCE6F5"
            morphIntensity={0.72}
            breatheDuration={5.2}
            rotationSpeed={0.55}
          >
            <span className="question-generation-blob-label">Ait</span>
          </GradientBlob>
        </div>

        <h1
          id="question-generation-title"
          className="question-generation-headline"
        >
          맞춤 질문을 준비하고 있어요
        </h1>
        <p className="question-generation-subcopy">
          천천히 숨을 고르는 동안 AI 면접관이 첫 질문을 준비합니다
        </p>

        <ul
          className="flex flex-wrap justify-center gap-2"
          aria-label="선택한 면접 조건"
        >
          <li className="question-generation-chip question-generation-chip-primary">
            {primaryChip}
          </li>
          {secondaryChips.map((label) => (
            <li key={label} className="question-generation-chip">
              {label}
            </li>
          ))}
        </ul>
      </div>

      <div className="question-generation-grid relative">
        <div className="question-generation-card">
          <div className="mb-3 flex items-center gap-2">
            <span className="question-generation-label">
              기다리는 동안 · 면접 팁
            </span>
            <span className="question-generation-counter">
              {tipIndex + 1}/{interviewTips.length}
            </span>
          </div>
          <p
            key={tipIndex}
            className="question-generation-message question-generation-tip"
          >
            {interviewTips[tipIndex]}
          </p>
        </div>

        <div className="flex flex-col gap-2.5">
          <div
            className="question-generation-card"
            role="status"
            aria-live="polite"
          >
            <p className="question-generation-label mb-3">진행 단계</p>
            <p
              key={statusIndex}
              className="question-generation-message question-generation-status-text"
            >
              {statusMessages[statusIndex]}
            </p>
            <div className="question-generation-progress-track" aria-hidden="true">
              <div className="question-generation-progress-bar" />
            </div>
          </div>
          {showSlowRequestNotice ? (
            <p className="question-generation-delay-notice">
              평소보다 조금 더 걸리고 있어요. 화면을 닫지 않고 잠시만
              기다려주세요.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
