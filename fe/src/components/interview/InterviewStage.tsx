import { useRef, useState } from 'react'
import { BarChart3, CheckCircle2, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AiSpeakingWaveform } from '@/components/interview/AiSpeakingWaveform'
import { DeviceControlBar } from '@/components/interview/DeviceControlBar'
import { FloatingSelfView } from '@/components/interview/FloatingSelfView'

const AI_INTERVIEWER_IMAGE_SRC = '/interview/ai-interviewer.png'

interface InterviewStageProps {
  stream: MediaStream | null
  questionIndex: number
  isLastQuestion: boolean
  onPrimaryAction: () => void
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
  isLastQuestion,
  onPrimaryAction,
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

      <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
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
          >
            {isLastQuestion ? (
              <BarChart3 className="size-5 text-action-primary" aria-hidden="true" />
            ) : (
              <CheckCircle2 className="size-5 text-status-success" aria-hidden="true" />
            )}
            {isLastQuestion ? '결과 보기' : '답변 완료'}
          </Button>
          <p className="text-caption text-text-secondary">Space 키로도 실행할 수 있어요</p>
        </div>

        <div className="flex justify-end">
          <AiSpeakingWaveform key={questionIndex} />
        </div>
      </div>
    </div>
  )
}
