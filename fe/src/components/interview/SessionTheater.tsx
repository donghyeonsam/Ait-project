import { useEffect, useRef, useState } from 'react'
import {
  Info,
  LoaderCircle,
  Mic,
  RotateCcw,
  Send,
  ShieldCheck,
  Square,
  UserRound,
} from 'lucide-react'
import { DeviceControlBar } from '@/components/interview/DeviceControlBar'
import { FloatingSelfView } from '@/components/interview/FloatingSelfView'
import type { MediaPermissionState } from '@/components/interview/useMediaDevices'
import type { VoiceAnswerStatus } from '@/components/interview/useVoiceAnswer'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

const AI_INTERVIEWER_IMAGE_SRC = '/interview/ai-interviewer.png'

// PIP 초기 위치가 하단 오버레이 패널(질문 카드 + 컨트롤 행)에 가리지 않게 띄우는 값.
const PIP_BOTTOM_OFFSET = 200

const WAVE_BAR_COUNT = 12

interface SessionTheaterProps {
  stream: MediaStream | null
  questionIndex: number
  totalQuestions: number
  question: string
  answerStatus: VoiceAnswerStatus
  transcript: string
  onChangeTranscript: (value: string) => void
  voiceError: string | null
  speechError: string | null
  canRetryTranscription: boolean
  onRetryTranscription: () => void
  mediaPermission: MediaPermissionState
  onRetryMediaAccess: () => void
  primaryActionLabel: string
  primaryActionDisabled: boolean
  onPrimaryAction: () => void
  isAiSpeaking: boolean
  onReplayQuestion: () => void
  replayDisabled: boolean
  onRequestEnd: () => void
  micMuted: boolean
  micGain: number
  onToggleMicMuted: () => void
  onChangeMicGain: (value: number) => void
  speakerMuted: boolean
  speakerVolume: number
  onToggleSpeakerMuted: () => void
  onChangeSpeakerVolume: (value: number) => void
}

function formatElapsed(elapsedMs: number) {
  const totalSeconds = Math.floor(elapsedMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function useRecordingElapsed(isRecording: boolean) {
  const [elapsedMs, setElapsedMs] = useState(0)

  useEffect(() => {
    if (!isRecording) return
    const startedAt = Date.now()
    const update = () => setElapsedMs(Date.now() - startedAt)
    // setState-in-effect 린트 규칙 때문에 초기화도 타이머 콜백에서 실행한다.
    const firstTick = window.setTimeout(update, 0)
    const timer = window.setInterval(update, 500)
    return () => {
      window.clearTimeout(firstTick)
      window.clearInterval(timer)
    }
  }, [isRecording])

  return isRecording ? elapsedMs : 0
}

function LiveWaveform() {
  return (
    <span className="flex h-3.5 items-center gap-0.5" aria-hidden="true">
      {Array.from({ length: WAVE_BAR_COUNT }).map((_, index) => (
        <span
          key={index}
          className="waveform-bar w-0.5 rounded-full bg-white"
          style={{ animationDelay: `${(index % 5) * 110}ms` }}
        />
      ))}
    </span>
  )
}

// 면접 세션 몰입형 시어터 화면: 면접관 영상을 전면 배경으로 깔고 질문·컨트롤을 오버레이로 얹는다.
export function SessionTheater({
  stream,
  questionIndex,
  totalQuestions,
  question,
  answerStatus,
  transcript,
  onChangeTranscript,
  voiceError,
  speechError,
  canRetryTranscription,
  onRetryTranscription,
  mediaPermission,
  onRetryMediaAccess,
  primaryActionLabel,
  primaryActionDisabled,
  onPrimaryAction,
  isAiSpeaking,
  onReplayQuestion,
  replayDisabled,
  onRequestEnd,
  micMuted,
  micGain,
  onToggleMicMuted,
  onChangeMicGain,
  speakerMuted,
  speakerVolume,
  onToggleSpeakerMuted,
  onChangeSpeakerVolume,
}: SessionTheaterProps) {
  const stageRef = useRef<HTMLDivElement>(null)
  const [imageFailed, setImageFailed] = useState(false)
  const recordingElapsedMs = useRecordingElapsed(answerStatus === 'recording')

  const isRecording = answerStatus === 'recording'
  const isProcessing = answerStatus === 'processing'
  const isReview = answerStatus === 'review'

  const actionIcon = isRecording ? (
    <Square className="size-5" aria-hidden="true" />
  ) : isProcessing ? (
    <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
  ) : isReview ? (
    <Send className="size-5" aria-hidden="true" />
  ) : (
    <Mic className="size-5" aria-hidden="true" />
  )

  const mediaPermissionError =
    mediaPermission === 'denied'
      ? '카메라와 마이크 권한이 차단되었습니다. 브라우저 권한을 허용한 뒤 다시 시도해주세요.'
      : mediaPermission === 'unsupported'
        ? '이 브라우저에서는 카메라와 마이크를 사용할 수 없습니다. 최신 Chrome 또는 Edge에서 다시 시도해주세요.'
        : null

  return (
    <div ref={stageRef} className="session-theater screen-fade-in">
      <h1 className="sr-only">AI 모의면접 진행</h1>

      {/* 영상 레이어. TODO: 실제 API 연동 필요 — 면접관 스틸 이미지를 실시간 영상 스트림으로 대체 */}
      {imageFailed ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/60">
          <UserRound className="size-16" aria-hidden="true" />
          <p className="text-body-2">AI 면접관 이미지를 준비 중이에요.</p>
        </div>
      ) : (
        <img
          src={AI_INTERVIEWER_IMAGE_SRC}
          alt="AI 면접관"
          className="absolute inset-0 size-full object-cover"
          onError={() => setImageFailed(true)}
        />
      )}
      <FloatingSelfView
        stream={stream}
        boundsRef={stageRef}
        initialBottomOffset={PIP_BOTTOM_OFFSET}
      />

      <div className="session-theater-scrim" aria-hidden="true" />

      <header className="session-theater-header">
        <div className="flex min-w-0 items-center gap-9">
          <span className="session-theater-logo">Ait</span>
          <span className="session-theater-badge" aria-live="polite">
            <span className="session-theater-badge-dot" aria-hidden="true" />
            면접 진행 중 · 질문 {questionIndex + 1}/{totalQuestions}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="session-theater-ghost-button"
            onClick={onReplayQuestion}
            disabled={replayDisabled}
            aria-label="질문 다시 듣기"
          >
            <RotateCcw className="size-3.5" aria-hidden="true" />
            질문 다시 듣기
          </button>
          <button
            type="button"
            className="session-theater-ghost-button"
            onClick={onRequestEnd}
            aria-label="면접 종료"
          >
            면접 종료
          </button>
        </div>
      </header>

      <div className="session-theater-bottom">
        {mediaPermission === 'pending' ? (
          <p className="session-theater-hint" role="status">
            카메라와 마이크 연결을 확인하고 있습니다.
          </p>
        ) : null}

        {mediaPermissionError ? (
          <div className="session-theater-alert" role="alert">
            <Info className="size-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0 flex-1">{mediaPermissionError}</span>
            {mediaPermission === 'denied' ? (
              <button
                type="button"
                className="session-theater-ghost-button"
                onClick={onRetryMediaAccess}
              >
                장치 권한 다시 확인
              </button>
            ) : null}
          </div>
        ) : null}

        <div className="session-theater-primary-row">
          <div className="session-theater-glass-card">
            <div className="session-theater-card-label">
              <span>질문 {questionIndex + 1}</span>
              {isAiSpeaking ? (
                <span className="flex items-center gap-2" role="status">
                  AI 면접관이 질문을 읽고 있어요
                  <LiveWaveform />
                </span>
              ) : null}
              {isRecording ? (
                <span className="flex items-center gap-2 text-white" role="status">
                  <LiveWaveform />
                  <span className="tabular-nums">
                    녹음 중 {formatElapsed(recordingElapsedMs)}
                  </span>
                </span>
              ) : null}
            </div>
            <p className="session-theater-question">{question}</p>

            {isRecording ? (
              <p className="session-theater-note">
                답변을 마치면 텍스트로 변환되며 제출 전에 수정할 수 있어요.
              </p>
            ) : null}

            {isProcessing ? (
              <p className="session-theater-note" role="status">
                답변을 텍스트로 변환하고 있어요…
              </p>
            ) : null}

            {isReview ? (
              <div className="mt-4">
                <label
                  htmlFor="voice-answer-transcript"
                  className="text-caption font-semibold text-white/75"
                >
                  답변 텍스트
                </label>
                <Textarea
                  id="voice-answer-transcript"
                  value={transcript}
                  onChange={(event) => onChangeTranscript(event.target.value)}
                  className="session-theater-textarea max-h-40 min-h-24"
                  placeholder="인식된 답변을 확인하고 필요한 부분을 수정해주세요."
                />
              </div>
            ) : null}

            {voiceError || speechError ? (
              <div role="alert">
                {[voiceError, speechError].filter(Boolean).map((message, index) => (
                  <p key={`${index}-${message}`} className="session-theater-error">
                    <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                    {message}
                  </p>
                ))}
                {canRetryTranscription ? (
                  <button
                    type="button"
                    className="session-theater-ghost-button mt-3"
                    onClick={onRetryTranscription}
                  >
                    <RotateCcw className="size-3.5" aria-hidden="true" />
                    변환 다시 시도
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="session-theater-record-column">
            <button
              type="button"
              className={cn(
                'session-theater-record-button',
                isRecording && 'is-recording',
              )}
              onClick={onPrimaryAction}
              disabled={primaryActionDisabled}
              aria-busy={isProcessing}
              aria-label={primaryActionLabel}
            >
              {actionIcon}
              {primaryActionLabel}
            </button>
            <span className="session-theater-hint">
              Space 키로도 실행할 수 있어요
            </span>
          </div>
        </div>

        <div className="session-theater-secondary-row">
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
            tone="inverse"
          />
          <span
            className="session-theater-privacy"
            title="녹음이 끝나면 음성 인식 처리를 위해 녹음 파일이 서버로 전송되며, 답변 텍스트는 이 면접 화면의 메모리에만 보관되고 화면을 나가면 폐기됩니다."
          >
            <ShieldCheck className="size-4 shrink-0" aria-hidden="true" />
            녹음 파일은 음성 인식 처리에만 사용되고 저장되지 않습니다
          </span>
        </div>
      </div>
    </div>
  )
}
