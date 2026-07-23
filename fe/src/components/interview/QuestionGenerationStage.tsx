import { useEffect, useState, type ComponentType } from 'react'
import {
  BookOpenCheck,
  BriefcaseBusiness,
  FileText,
  Gauge,
  Lightbulb,
  LoaderCircle,
  SlidersHorizontal,
  UserRound,
} from 'lucide-react'
import type { InterviewInputContract } from '@/lib/interview-session'

const AI_INTERVIEWER_IMAGE_SRC = '/interview/ai-interviewer.png'
const STAGE_VISIBILITY_DELAY_MS = 300
const STATUS_ROTATION_MS = 2600
const TIP_ROTATION_MS = 5500
const SLOW_REQUEST_NOTICE_MS = 8000

interface QuestionGenerationStageProps {
  input: InterviewInputContract
}

interface ConfigurationBadge {
  label: string
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
}

function getReferenceCount(input: InterviewInputContract) {
  return [
    input.references.resumeId,
    input.references.coverLetterId,
    input.references.repositoryId,
  ].filter((id) => id !== null).length
}

function createConfigurationBadges(
  input: InterviewInputContract,
): ConfigurationBadge[] {
  const referenceCount = getReferenceCount(input)
  const badges: ConfigurationBadge[] = [
    {
      label: input.position
        ? `${input.position} · ${input.interviewType}`
        : input.interviewType,
      icon: BriefcaseBusiness,
    },
    { label: `난이도 ${input.difficulty}`, icon: Gauge },
    { label: input.style, icon: SlidersHorizontal },
  ]

  if (input.csCategories.length > 0) {
    badges.push({
      label: `CS 주제 ${input.csCategories.length}개`,
      icon: BookOpenCheck,
    })
  }

  if (referenceCount > 0) {
    badges.push({
      label: `참고 자료 ${referenceCount}개`,
      icon: FileText,
    })
  }

  return badges
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

  return tips
}

// 질문 응답을 기다리는 동안 실제 면접 설정과 짧은 준비 팁을 보여준다.
export function QuestionGenerationStage({
  input,
}: QuestionGenerationStageProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [statusIndex, setStatusIndex] = useState(0)
  const [tipIndex, setTipIndex] = useState(0)
  const [showSlowRequestNotice, setShowSlowRequestNotice] = useState(false)
  const [imageFailed, setImageFailed] = useState(false)
  const configurationBadges = createConfigurationBadges(input)
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
      className={`w-full max-w-4xl overflow-hidden rounded-ait-l border border-border-default bg-surface-default shadow-elevation-2 transition-opacity duration-(--duration-slow) ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      aria-hidden={!isVisible}
      aria-busy="true"
    >
      <div className="grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="relative min-h-64 overflow-hidden bg-status-neutral-surface lg:min-h-[32rem]">
          {imageFailed ? (
            <div className="flex size-full min-h-64 flex-col items-center justify-center gap-3 text-text-secondary lg:min-h-[32rem]">
              <UserRound className="size-16" aria-hidden="true" />
              <p className="text-body-2">AI 면접관이 입장을 준비하고 있어요.</p>
            </div>
          ) : (
            <img
              src={AI_INTERVIEWER_IMAGE_SRC}
              alt=""
              className="absolute inset-0 size-full object-cover object-center"
              onError={() => setImageFailed(true)}
            />
          )}

          <div
            className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-action-primary/90 to-transparent px-6 pb-6 pt-16 text-surface-default"
            aria-hidden="true"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-6 items-center gap-1">
                {Array.from({ length: 12 }).map((_, index) => (
                  <span
                    key={index}
                    className="waveform-bar w-1 rounded-ait-pill bg-surface-default"
                    style={{ animationDelay: `${(index % 6) * 100}ms` }}
                  />
                ))}
              </div>
              <span className="text-body-2 font-semibold">AI 면접관 준비 중</span>
            </div>
          </div>
        </div>

        <div className="flex min-h-[32rem] flex-col justify-center p-6 text-left sm:p-8 lg:p-10">
          <div className="inline-flex w-fit items-center gap-2 rounded-ait-pill border border-status-info-border bg-status-info-surface px-3 py-1.5 text-caption font-semibold text-status-info">
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
            면접 준비 중
          </div>

          <h1
            id="question-generation-title"
            className="mt-5 text-h2 text-text-primary sm:text-h1"
          >
            맞춤 질문을 준비하고 있어요
          </h1>
          <p className="mt-2 text-body-2 text-text-secondary">
            잠시 뒤 AI 면접관이 첫 번째 질문을 시작합니다.
          </p>

          <ul className="mt-6 flex flex-wrap gap-2" aria-label="선택한 면접 조건">
            {configurationBadges.map(({ label, icon: Icon }) => (
              <li
                key={label}
                className="inline-flex items-center gap-1.5 rounded-ait-pill border border-border-default bg-status-neutral-surface px-3 py-1.5 text-caption font-medium text-text-primary"
              >
                <Icon
                  className="size-3.5 text-text-secondary"
                  aria-hidden={true}
                />
                {label}
              </li>
            ))}
          </ul>

          <div className="mt-8" role="status" aria-live="polite">
            <p
              key={statusIndex}
              className="question-generation-message text-body-2 font-medium text-text-primary"
            >
              {statusMessages[statusIndex]}
            </p>
            <div
              className="mt-3 h-1.5 overflow-hidden rounded-ait-pill bg-status-neutral-surface"
              aria-hidden="true"
            >
              <div className="question-generation-progress-bar h-full w-1/3 rounded-ait-pill bg-action-primary" />
            </div>
          </div>

          <div className="mt-8 rounded-ait-m border border-status-info-border bg-status-info-surface p-4">
            <div className="flex gap-3">
              <Lightbulb
                className="mt-0.5 size-5 shrink-0 text-status-info"
                aria-hidden="true"
              />
              <div>
                <p className="text-caption font-semibold text-status-info">
                  기다리는 동안 면접 팁
                </p>
                <p
                  key={tipIndex}
                  className="question-generation-message mt-1 text-body-2 text-text-primary"
                >
                  {interviewTips[tipIndex]}
                </p>
              </div>
            </div>
          </div>

          {showSlowRequestNotice ? (
            <p className="mt-4 text-caption text-text-secondary" role="status">
              평소보다 조금 더 걸리고 있어요. 화면을 닫지 않고 잠시만 기다려주세요.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
