import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useMemo, useState } from 'react'
import {
  getInterviewerPhase,
  getInterviewerPlaylist,
} from '@/components/interview/interviewer-media'
import type { VoiceAnswerStatus } from '@/components/interview/useVoiceAnswer'
import type { InterviewStyle } from '@/mocks/interview'

const INTERVIEWER_IMAGE_SRC = '/interview/ai-interviewer.png'

interface InterviewerMediaProps {
  interviewStyle: InterviewStyle
  answerStatus: VoiceAnswerStatus
  isAiSpeaking: boolean
  isSubmittingAnswer: boolean
  isLastQuestion: boolean
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
      getInterviewerPlaylist(phase).filter(
        (source) => !failedSources.has(source),
      ),
    [failedSources, phase],
  )
  const source =
    playlist.length > 0
      ? playlist[playbackStep % playlist.length]
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
            onEnded={() => {
              if (phase !== 'outro') {
                setPlaybackStep((step) => step + 1)
              }
            }}
            onError={handleVideoError}
          />
        </AnimatePresence>
      ) : null}
    </div>
  )
}
