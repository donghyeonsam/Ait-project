import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useMemo, useState } from 'react'
import type { VoiceAnswerStatus } from '@/components/interview/useVoiceAnswer'
import type { InterviewStyle } from '@/mocks/interview'

const INTERVIEWER_IMAGE_SRC = '/interview/ai-interviewer.png'
const VIDEO_ROOT = '/interviewer_video'

const VIDEO = {
  intro: `${VIDEO_ROOT}/start_point.mp4`,
  outro: `${VIDEO_ROOT}/end_point.mp4`,
  transition1: `${VIDEO_ROOT}/question_transfer_term_1.mp4`,
  transition2: `${VIDEO_ROOT}/question_transfer_term_2.mp4`,
  neutral1: `${VIDEO_ROOT}/listening_neutrality_1.mp4`,
  neutral2: `${VIDEO_ROOT}/listening_neutrality_2.mp4`,
  neutral3: `${VIDEO_ROOT}/listening_neutrality_3.mp4`,
  neutral4: `${VIDEO_ROOT}/listening_neutrality_4.mp4`,
  interest: `${VIDEO_ROOT}/listening_interest.mp4`,
  positive1: `${VIDEO_ROOT}/listening_positive_1.mp4`,
  positive2: `${VIDEO_ROOT}/listening_positive_2.mp4`,
  positive3: `${VIDEO_ROOT}/listening_positive_3.mp4`,
  bigSmile1: `${VIDEO_ROOT}/listening_big_smile_1.mp4`,
  bigSmile2: `${VIDEO_ROOT}/listening_big_smile_2.mp4`,
  negative1: `${VIDEO_ROOT}/listening_negative_1.mp4`,
  bigNegative2: `${VIDEO_ROOT}/listening_big_negative_2.mp4`,
} as const

export type InterviewerPhase =
  | 'intro'
  | 'asking'
  | 'listening'
  | 'neutral'
  | 'transition'
  | 'outro'

interface InterviewerMediaProps {
  questionIndex: number
  interviewStyle: InterviewStyle
  answerStatus: VoiceAnswerStatus
  isAiSpeaking: boolean
  isSubmittingAnswer: boolean
  isLastQuestion: boolean
}

const neutralClips = [
  VIDEO.neutral1,
  VIDEO.neutral2,
  VIDEO.neutral3,
  VIDEO.neutral4,
]

const listeningClips: Record<InterviewStyle, string[]> = {
  평화형: [
    VIDEO.interest,
    VIDEO.positive1,
    VIDEO.neutral1,
    VIDEO.bigSmile1,
    VIDEO.positive2,
    VIDEO.neutral2,
    VIDEO.bigSmile2,
    VIDEO.positive3,
    VIDEO.neutral3,
  ],
  밸런스형: [
    VIDEO.neutral1,
    VIDEO.interest,
    VIDEO.neutral2,
    VIDEO.positive1,
    VIDEO.neutral3,
    VIDEO.neutral4,
  ],
  압박형: [
    VIDEO.neutral3,
    VIDEO.negative1,
    VIDEO.neutral4,
    VIDEO.bigNegative2,
    VIDEO.interest,
    VIDEO.neutral2,
  ],
}

export function getInterviewerPlaylist(
  phase: InterviewerPhase,
  interviewStyle: InterviewStyle,
) {
  if (phase === 'intro') return [VIDEO.intro]
  if (phase === 'outro') return [VIDEO.outro]
  if (phase === 'asking' || phase === 'transition') {
    return [VIDEO.transition1, VIDEO.transition2]
  }
  if (phase === 'listening') return listeningClips[interviewStyle]
  return neutralClips
}

export function getInterviewerPhase({
  questionIndex,
  answerStatus,
  isAiSpeaking,
  isSubmittingAnswer,
  isLastQuestion,
}: Omit<InterviewerMediaProps, 'interviewStyle'>): InterviewerPhase {
  if (isSubmittingAnswer && isLastQuestion) return 'outro'
  if (isSubmittingAnswer) return 'transition'
  if (answerStatus === 'recording') return 'listening'
  if (isAiSpeaking) return 'asking'
  if (answerStatus === 'processing' || answerStatus === 'review') return 'neutral'
  return questionIndex === 0 ? 'intro' : 'transition'
}

export function InterviewerMedia(props: InterviewerMediaProps) {
  const reduceMotion = useReducedMotion()
  const [playbackStep, setPlaybackStep] = useState(0)
  const [failedSources, setFailedSources] = useState<Set<string>>(
    () => new Set(),
  )
  const phase = getInterviewerPhase(props)
  const playlist = useMemo(
    () =>
      getInterviewerPlaylist(phase, props.interviewStyle).filter(
        (source) => !failedSources.has(source),
      ),
    [failedSources, phase, props.interviewStyle],
  )
  const source =
    playlist.length > 0
      ? playlist[(props.questionIndex + playbackStep) % playlist.length]
      : null

  const handleVideoError = () => {
    if (!source) return
    setFailedSources((current) => {
      const next = new Set(current)
      next.add(source)
      return next
    })
    setPlaybackStep((step) => step + 1)
  }

  return (
    <div className="interviewer-media">
      <img
        src={INTERVIEWER_IMAGE_SRC}
        alt="AI 면접관"
        className="interviewer-media-poster"
      />

      {!reduceMotion && source ? (
        <AnimatePresence initial={false}>
          <motion.video
            key={`${phase}-${source}-${playbackStep}`}
            className="interviewer-media-video"
            src={source}
            autoPlay
            muted
            playsInline
            preload="auto"
            poster={INTERVIEWER_IMAGE_SRC}
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            onEnded={() => setPlaybackStep((step) => step + 1)}
            onError={handleVideoError}
          />
        </AnimatePresence>
      ) : null}
    </div>
  )
}
