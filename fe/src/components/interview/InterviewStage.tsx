import { useRef, useState } from 'react'
import { LoaderCircle, Mic, Send, Square, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AiSpeakingWaveform } from '@/components/interview/AiSpeakingWaveform'
import { DeviceControlBar } from '@/components/interview/DeviceControlBar'
import { FloatingSelfView } from '@/components/interview/FloatingSelfView'
import type { VoiceAnswerStatus } from '@/components/interview/useVoiceAnswer'

const AI_INTERVIEWER_IMAGE_SRC = '/interview/ai-interviewer.png'

interface InterviewStageProps {
  stream: MediaStream | null
  questionIndex: number
  question: string
  answerStatus: VoiceAnswerStatus
  primaryActionLabel: string
  primaryActionDisabled: boolean
  onPrimaryAction: () => void
  isAiSpeaking: boolean
  micMuted: boolean
  micGain: number
  onToggleMicMuted: () => void
  onChangeMicGain: (value: number) => void
  speakerMuted: boolean
  speakerVolume: number
  onToggleSpeakerMuted: () => void
  onChangeSpeakerVolume: (value: number) => void
}

export function InterviewStage({
  stream,
  questionIndex,
  question,
  answerStatus,
  primaryActionLabel,
  primaryActionDisabled,
  onPrimaryAction,
  isAiSpeaking,
  micMuted,
  micGain,
  onToggleMicMuted,
  onChangeMicGain,
  speakerMuted,
  speakerVolume,
  onToggleSpeakerMuted,
  onChangeSpeakerVolume,
}: InterviewStageProps) {
  const frameRef = useRef<HTMLDivElement>(null)
  const [imageFailed, setImageFailed] = useState(false)
  const actionIcon = answerStatus === 'recording'
    ? <Square className="size-5 text-status-error" aria-hidden="true" />
    : answerStatus === 'processing'
      ? <LoaderCircle className="size-5 animate-spin text-action-primary" aria-hidden="true" />
      : answerStatus === 'review'
        ? <Send className="size-5 text-action-primary" aria-hidden="true" />
        : <Mic className="size-5 text-action-primary" aria-hidden="true" />

  return (
    <div>
      <div
        ref={frameRef}
        className="relative aspect-video w-full overflow-hidden rounded-ait-l border border-border-default bg-status-neutral-surface"
      >
        {imageFailed ? (
          <div className="flex size-full flex-col items-center justify-center gap-3 text-text-secondary">
            <UserRound className="size-16" aria-hidden="true" />
            <p className="text-body-2">AI 면접관 이미지를 준비 중이에요.</p>
          </div>
        ) : (
          <img
            src={AI_INTERVIEWER_IMAGE_SRC}
            alt="AI 면접관"
            className="size-full object-cover"
            onError={() => setImageFailed(true)}
          />
        )}

        <FloatingSelfView stream={stream} boundsRef={frameRef} />
      </div>

      <div className="mt-4 rounded-ait-m border border-border-default bg-surface-default p-5 shadow-elevation-1">
        <p className="text-caption font-semibold text-text-secondary">
          질문 {questionIndex + 1}
        </p>
        <p className="mt-2 text-body-1 font-medium text-text-primary">{question}</p>
      </div>

      <div className="mt-4 grid items-center gap-4 sm:grid-cols-[1fr_auto_1fr]">
        <DeviceControlBar
          micStream={stream}
          micMuted={micMuted}
          micGain={micGain}
          onToggleMicMuted={onToggleMicMuted}
          onChangeMicGain={onChangeMicGain}
          speakerMuted={speakerMuted}
          speakerVolume={speakerVolume}
          onToggleSpeakerMuted={onToggleSpeakerMuted}
          onChangeSpeakerVolume={onChangeSpeakerVolume}
        />

        <div className="flex flex-col items-center gap-1.5">
          <Button
            type="button"
            variant="secondary"
            className="gap-2 rounded-ait-pill border-none bg-surface-default px-6 py-3 text-text-primary shadow-elevation-2 hover:shadow-elevation-2"
            onClick={onPrimaryAction}
            disabled={primaryActionDisabled}
            aria-busy={answerStatus === 'processing'}
          >
            {actionIcon}
            {primaryActionLabel}
          </Button>
          <p className="text-caption text-text-secondary">Space 키로도 실행할 수 있어요</p>
        </div>

        <div className="flex justify-end">
          {isAiSpeaking ? <AiSpeakingWaveform /> : null}
        </div>
      </div>
    </div>
  )
}
