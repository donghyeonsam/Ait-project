import { motion, useReducedMotion } from 'framer-motion'
import { useRef } from 'react'
import {
  Info,
  LoaderCircle,
  RotateCcw,
  Send,
  ShieldCheck,
  Square,
} from 'lucide-react'
import { DeviceControlBar } from '@/components/interview/DeviceControlBar'
import { FloatingSelfView } from '@/components/interview/FloatingSelfView'
import type { MediaPermissionState } from '@/components/interview/useMediaDevices'
import type { VoiceAnswerStatus } from '@/components/interview/useVoiceAnswer'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

const INTERVIEWER_IMAGE_SRC = '/interview/ai-interviewer.png'

// PIP 초기 위치가 하단 오버레이 패널(질문 카드 + 컨트롤 행)에 가리지 않게 띄우는 값.
const PIP_BOTTOM_OFFSET = 200

const WAVE_BAR_COUNT = 12

interface SessionTheaterProps {
  stream: MediaStream | null
  questionIndex: number
  totalQuestions: number
  question: string
  answerStatus: VoiceAnswerStatus
  isSubmittingAnswer: boolean
  answerDurationSeconds: number
  answerSecondsRemaining: number
  transcript: string
  onChangeTranscript: (value: string) => void
  voiceError: string | null
  speechError: string | null
  mediaPermission: MediaPermissionState
  onRetryMediaAccess: () => void
  primaryActionLabel: string
  primaryActionDisabled: boolean
  onPrimaryAction: () => void
  onFinishAnswer: () => void
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

function formatCountdown(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

interface AnswerCountdownProps {
  durationSeconds: number
  remainingSeconds: number
}

function AnswerCountdown({
  durationSeconds,
  remainingSeconds,
}: AnswerCountdownProps) {
  const reduceMotion = useReducedMotion()
  const radius = 42
  const circumference = 2 * Math.PI * radius
  const progress =
    durationSeconds > 0
      ? Math.min(1, Math.max(0, remainingSeconds / durationSeconds))
      : 0
  const isWarning = remainingSeconds <= 15
  const isUrgent = remainingSeconds <= 5

  return (
    <motion.div
      className={cn(
        'session-answer-countdown',
        isWarning && 'is-warning',
        isUrgent && 'is-urgent',
      )}
      role="timer"
      aria-label={`답변 시간 ${remainingSeconds}초 남음`}
      animate={
        reduceMotion || !isUrgent
          ? undefined
          : { scale: [1, 1.045, 1], opacity: [1, 0.88, 1] }
      }
      transition={
        reduceMotion || !isUrgent
          ? undefined
          : { duration: 0.8, repeat: Infinity, ease: 'easeInOut' }
      }
    >
      <svg
        className="session-answer-countdown-ring"
        viewBox="0 0 100 100"
        aria-hidden="true"
      >
        <circle className="session-answer-countdown-track" cx="50" cy="50" r={radius} />
        <motion.circle
          className="session-answer-countdown-progress"
          cx="50"
          cy="50"
          r={radius}
          strokeDasharray={circumference}
          initial={false}
          animate={{ strokeDashoffset: circumference * (1 - progress) }}
          transition={
            reduceMotion
              ? { duration: 0 }
              : { duration: 0.3, ease: 'linear' }
          }
        />
      </svg>
      <div className="session-answer-countdown-value">
        <motion.strong
          key={remainingSeconds}
          className="tabular-nums"
          initial={reduceMotion ? false : { opacity: 0.45, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: reduceMotion ? 0 : 0.2 }}
        >
          {remainingSeconds}
        </motion.strong>
        <span>초</span>
      </div>
    </motion.div>
  )
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

// 면접 세션 몰입형 시어터 화면: 면접관 배경 위에 질문·컨트롤을 오버레이로 얹는다.
export function SessionTheater({
  stream,
  questionIndex,
  totalQuestions,
  question,
  answerStatus,
  isSubmittingAnswer,
  answerDurationSeconds,
  answerSecondsRemaining,
  transcript,
  onChangeTranscript,
  voiceError,
  speechError,
  mediaPermission,
  onRetryMediaAccess,
  primaryActionLabel,
  primaryActionDisabled,
  onPrimaryAction,
  onFinishAnswer,
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

  const isRecording = answerStatus === 'recording'
  const isProcessing = answerStatus === 'processing'
  const isReview = answerStatus === 'review'

  const actionIcon = isSubmittingAnswer ? (
    <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
  ) : (
    <Send className="size-5" aria-hidden="true" />
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

      <div className="interviewer-media">
        <img
          src={INTERVIEWER_IMAGE_SRC}
          alt="AI 면접관"
          className="interviewer-media-poster"
        />
      </div>
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
            <div className="session-theater-card-main">
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
                      녹음 중 · {formatCountdown(answerSecondsRemaining)} 남음
                    </span>
                  </span>
                ) : null}
              </div>
              <p className="session-theater-question">{question}</p>

              {isRecording ? (
                <p className="session-theater-note">
                  남은 시간이 끝나면 녹음이 자동으로 종료되고 답변이 변환됩니다.
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
                </div>
              ) : null}
            </div>

            {isRecording ? (
              <AnswerCountdown
                durationSeconds={answerDurationSeconds}
                remainingSeconds={answerSecondsRemaining}
              />
            ) : null}
          </div>

          {isRecording ? (
            <div className="session-theater-record-column">
              <button
                type="button"
                className="session-theater-record-button"
                onClick={onFinishAnswer}
                aria-label="답변 종료"
              >
                <Square className="size-4 fill-current" aria-hidden="true" />
                답변 종료
              </button>
              <span className="session-theater-hint">
                답변을 마치면 바로 다음 질문으로 넘어가요
              </span>
            </div>
          ) : isReview || isSubmittingAnswer ? (
            <div className="session-theater-record-column">
              <button
                type="button"
                className="session-theater-record-button"
                onClick={onPrimaryAction}
                disabled={primaryActionDisabled}
                aria-busy={isSubmittingAnswer}
                aria-label={primaryActionLabel}
              >
                {actionIcon}
                {primaryActionLabel}
              </button>
              <span className="session-theater-hint">
                Space 키로 답변을 제출할 수 있어요
              </span>
            </div>
          ) : null}
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
            title="음성 텍스트 변환은 브라우저에서 처리합니다. 제출한 녹음 파일은 기존 답변 음성 분석을 위해 서버로 전송됩니다."
          >
            <ShieldCheck className="size-4 shrink-0" aria-hidden="true" />
            음성 텍스트 변환은 브라우저에서 처리됩니다
          </span>
        </div>
      </div>
    </div>
  )
}
