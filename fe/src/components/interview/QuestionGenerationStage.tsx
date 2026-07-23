import { useEffect, useState, type ComponentType } from 'react'
import {
  BookOpenCheck,
  BriefcaseBusiness,
  FileText,
  Gauge,
  Lightbulb,
  SlidersHorizontal,
} from 'lucide-react'
import { ShinyText } from '@/components/reactbits/ShinyText'
import type { InterviewInputContract } from '@/lib/interview-session'

const STAGE_VISIBILITY_DELAY_MS = 300
const STATUS_ROTATION_MS = 2600
const TIP_ROTATION_MS = 4500
const SLOW_REQUEST_NOTICE_MS = 8000
const ORB_WAVE_BAR_COUNT = 22

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

  tips.push('한 답변은 30초에서 1분 분량으로 간결하게 유지해 보세요.')

  return tips
}

// 질문 응답을 기다리는 동안 실제 면접 설정과 짧은 준비 팁을 몰입형 다크 화면으로 보여준다.
export function QuestionGenerationStage({
  input,
}: QuestionGenerationStageProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [statusIndex, setStatusIndex] = useState(0)
  const [tipIndex, setTipIndex] = useState(0)
  const [showSlowRequestNotice, setShowSlowRequestNotice] = useState(false)
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
      className={`relative flex w-full flex-1 flex-col overflow-hidden transition-opacity duration-(--duration-slow) ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      aria-hidden={!isVisible}
      aria-busy="true"
    >
      <div className="immersive-aurora" aria-hidden="true">
        <span className="immersive-aurora-blob" />
        <span className="immersive-aurora-blob" />
        <span className="immersive-aurora-blob" />
      </div>
      <div className="immersive-vignette" aria-hidden="true" />

      <div className="relative flex flex-1 flex-col px-6 py-6 sm:px-9">
        <div className="flex justify-end">
          <span className="immersive-glass inline-flex items-center gap-2 rounded-ait-pill px-3 py-1.5 text-caption font-semibold">
            <span className="immersive-status-dot" aria-hidden="true" />
            면접 준비 중
          </span>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center gap-6 py-10 text-center">
          <div className="immersive-orb" aria-hidden="true">
            <span className="immersive-orb-ring" />
            <span className="immersive-orb-ring immersive-orb-ring-delayed" />
            <span className="immersive-orb-core">
              {Array.from({ length: ORB_WAVE_BAR_COUNT }).map((_, index) => (
                <span
                  key={index}
                  className="immersive-orb-wave-bar"
                  style={{
                    height: `${28 + (index % 5) * 9}%`,
                    animationDelay: `${(index % 8) * 90}ms`,
                  }}
                />
              ))}
            </span>
          </div>

          <div>
            <h1
              id="question-generation-title"
              className="text-h1 sm:text-display"
            >
              <ShinyText text="맞춤 질문을 준비하고 있어요" />
            </h1>
            <p className="mt-3 text-body-1 text-immersive-foreground/60">
              천천히 숨을 고르는 동안 AI 면접관이 첫 질문을 준비합니다.
            </p>
          </div>

          <ul
            className="flex flex-wrap justify-center gap-2"
            aria-label="선택한 면접 조건"
          >
            {configurationBadges.map(({ label, icon: Icon }) => (
              <li
                key={label}
                className="immersive-glass inline-flex items-center gap-1.5 rounded-ait-pill px-3 py-1.5 text-caption font-medium"
              >
                <Icon
                  className="size-3.5 text-immersive-foreground/70"
                  aria-hidden={true}
                />
                {label}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="immersive-glass rounded-ait-l p-5 lg:flex-[1.4]">
            <p className="flex items-center gap-2 text-caption font-semibold text-immersive-foreground/70">
              <Lightbulb className="size-4" aria-hidden="true" />
              기다리는 동안 · 면접 팁 ({tipIndex + 1}/{interviewTips.length})
            </p>
            <p
              key={tipIndex}
              className="question-generation-message mt-2 text-body-2 text-immersive-foreground"
            >
              {interviewTips[tipIndex]}
            </p>
          </div>

          <div
            className="immersive-glass rounded-ait-l p-5 lg:flex-1"
            role="status"
            aria-live="polite"
          >
            <p className="text-caption font-semibold text-immersive-foreground/70">
              진행 단계
            </p>
            <p
              key={statusIndex}
              className="question-generation-message mt-2 text-body-2 text-immersive-foreground"
            >
              {statusMessages[statusIndex]}
            </p>
            <div className="immersive-progress-track mt-3" aria-hidden="true">
              <div className="immersive-progress-bar" />
            </div>
            {showSlowRequestNotice ? (
              <p className="mt-3 text-caption text-immersive-foreground/60">
                평소보다 조금 더 걸리고 있어요. 화면을 닫지 않고 잠시만
                기다려주세요.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
