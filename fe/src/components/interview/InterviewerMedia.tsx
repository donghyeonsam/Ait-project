import { useReducedMotion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  getInterviewerPhase,
  getInterviewerPlaylist,
} from '@/components/interview/interviewer-media'
import type { VoiceAnswerStatus } from '@/components/interview/useVoiceAnswer'
import { cn } from '@/lib/utils'
import type { InterviewStyle } from '@/mocks/interview'

const INTERVIEWER_IMAGE_SRC = '/interview/ai-interviewer.png'
const VIDEO_TRANSITION_MS = 300

interface InterviewerMediaProps {
  interviewStyle: InterviewStyle
  answerStatus: VoiceAnswerStatus
  isAiSpeaking: boolean
  isSubmittingAnswer: boolean
  isLastQuestion: boolean
}

type VideoSlotIndex = 0 | 1

interface VideoSlot {
  source: string
  generation: number
}

interface BufferedVideoPlaylistProps {
  playlist: string[]
  holdLastFrame: boolean
  onSourceError: (source: string) => void
}

function BufferedVideoPlaylist({
  playlist,
  holdLastFrame,
  onSourceError,
}: BufferedVideoPlaylistProps) {
  const firstVideoRef = useRef<HTMLVideoElement>(null)
  const secondVideoRef = useRef<HTMLVideoElement>(null)
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [playbackStep, setPlaybackStep] = useState(0)
  const [activeSlot, setActiveSlot] = useState<VideoSlotIndex>(0)
  const [outgoingSlot, setOutgoingSlot] = useState<VideoSlotIndex | null>(null)
  const [slots, setSlots] = useState<[VideoSlot, VideoSlot]>(() => [
    { source: playlist[0]!, generation: 0 },
    { source: playlist[1 % playlist.length]!, generation: 0 },
  ])
  const videoRefs = [firstVideoRef, secondVideoRef] as const

  useEffect(
    () => () => {
      if (transitionTimerRef.current !== null) {
        window.clearTimeout(transitionTimerRef.current)
      }
    },
    [],
  )

  const handleEnded = (endedSlot: VideoSlotIndex) => {
    if (endedSlot !== activeSlot || holdLastFrame) return

    const nextSlot: VideoSlotIndex = endedSlot === 0 ? 1 : 0
    const nextVideo = videoRefs[nextSlot].current
    if (!nextVideo) return

    const nextStep = playbackStep + 1
    void nextVideo
      .play()
      .then(() => {
        // 다음 영상이 실제 재생 가능한 상태가 된 뒤에만 화면을 겹쳐 전환한다.
        setOutgoingSlot(endedSlot)
        setActiveSlot(nextSlot)
        setPlaybackStep(nextStep)
        transitionTimerRef.current = window.setTimeout(() => {
          const followingSource = playlist[(nextStep + 1) % playlist.length]!
          setSlots((current) => {
            const next: [VideoSlot, VideoSlot] = [...current]
            next[endedSlot] = {
              source: followingSource,
              generation: current[endedSlot].generation + 1,
            }
            return next
          })
          setOutgoingSlot(null)
          transitionTimerRef.current = null
        }, VIDEO_TRANSITION_MS)
      })
      .catch(() => onSourceError(slots[nextSlot].source))
  }

  return slots.map((slot, index) => {
    const slotIndex = index as VideoSlotIndex
    return (
      <video
        key={`${slotIndex}-${slot.generation}-${slot.source}`}
        ref={videoRefs[slotIndex]}
        className={cn(
          'interviewer-media-video transition-opacity duration-300 ease-out',
          slotIndex === activeSlot || slotIndex === outgoingSlot
            ? 'opacity-100'
            : 'opacity-0',
        )}
        style={{ zIndex: slotIndex === activeSlot ? 2 : 1 }}
        src={slot.source}
        autoPlay={slotIndex === activeSlot}
        muted
        playsInline
        preload="auto"
        aria-hidden="true"
        onEnded={() => handleEnded(slotIndex)}
        onError={() => onSourceError(slot.source)}
      />
    )
  })
}

export function InterviewerMedia(props: InterviewerMediaProps) {
  const reduceMotion = useReducedMotion()
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

  useEffect(() => {
    const sources = [
      ...getInterviewerPlaylist('active'),
      ...getInterviewerPlaylist('outro'),
    ]
    const preloaders = [...new Set(sources)].map((source) => {
      const video = document.createElement('video')
      video.preload = 'auto'
      video.muted = true
      video.src = source
      video.load()
      return video
    })

    return () => {
      preloaders.forEach((video) => {
        video.removeAttribute('src')
        video.load()
      })
    }
  }, [])

  const handleVideoError = (source: string) => {
    setFailedSources((current) => {
      const next = new Set(current)
      next.add(source)
      return next
    })
  }

  return (
    <div className="interviewer-media">
      <img
        src={INTERVIEWER_IMAGE_SRC}
        alt="AI 면접관"
        className="interviewer-media-poster"
      />

      {!reduceMotion && playlist.length > 0 ? (
        <BufferedVideoPlaylist
          key={`${phase}-${playlist.join('|')}`}
          playlist={playlist}
          holdLastFrame={phase === 'outro'}
          onSourceError={handleVideoError}
        />
      ) : null}
    </div>
  )
}
