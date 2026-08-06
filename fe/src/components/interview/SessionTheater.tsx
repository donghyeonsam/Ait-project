import { useRef } from 'react'
import {
  Info,
  LoaderCircle,
  Play,
  Send,
  ShieldCheck,
  Square,
} from 'lucide-react'
import { DeviceControlBar } from '@/components/interview/DeviceControlBar'
import { DemoInterviewerVideo } from '@/components/interview/DemoInterviewerVideo'
import { FloatingSelfView } from '@/components/interview/FloatingSelfView'
import type { MediaPermissionState } from '@/components/interview/useMediaDevices'
import type { VoiceAnswerStatus } from '@/components/interview/useVoiceAnswer'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

const INTERVIEWER_IMAGE_SRC = '/interview/ai-interviewer.png'

const WAVE_BAR_COUNT = 12

interface SessionTheaterProps {
  stream: MediaStream | null
  /** 답변 녹음 중 얼굴이 프레임 중앙에서 많이 벗어났을 때 셀프뷰에 중앙 유도 가이드를 띄운다. */
  showFaceCenterGuide?: boolean
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
  demoVideoQuestionKey?: string
  demoQuestionVideoSrc?: string | null
  demoVideoQuestionActive?: boolean
  questionVisible?: boolean
  onDemoQuestionVideoPlaying?: (playbackKey: string) => void
  onDemoQuestionVideoEnded?: (playbackKey: string) => void
  onDemoQuestionVideoPlaybackError?: (
    playbackKey: string,
    reason: 'blocked' | 'unavailable',
  ) => void
}

function formatCountdown(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
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

// 면접 세션 몰입형 시어터 화면: 풀블리드 면접관 영상 위에 헤더 진행도와 하단 통합 카드(질문·실시간 답변·컨트롤)를 오버레이로 얹는다.
export function SessionTheater({
  stream,
  showFaceCenterGuide = false,
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
  demoVideoQuestionKey,
  demoQuestionVideoSrc = null,
  demoVideoQuestionActive,
  questionVisible = true,
  onDemoQuestionVideoPlaying = () => {},
  onDemoQuestionVideoEnded = () => {},
  onDemoQuestionVideoPlaybackError = () => {},
}: SessionTheaterProps) {
  const stageRef = useRef<HTMLDivElement>(null)

  const isRecording = answerStatus === 'recording'
  const isProcessing = answerStatus === 'processing'
  const isReview = answerStatus === 'review'

  const timerSeconds = isRecording
    ? answerSecondsRemaining
    : answerDurationSeconds

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

      {demoVideoQuestionKey ? (
        <DemoInterviewerVideo
          posterSrc={INTERVIEWER_IMAGE_SRC}
          questionKey={demoVideoQuestionKey}
          questionVideoSrc={demoQuestionVideoSrc}
          isQuestionPlaybackActive={
            demoVideoQuestionActive ?? isAiSpeaking
          }
          speakerMuted={speakerMuted}
          speakerVolume={speakerVolume}
          onQuestionPlaying={onDemoQuestionVideoPlaying}
          onQuestionEnded={onDemoQuestionVideoEnded}
          onQuestionPlaybackError={onDemoQuestionVideoPlaybackError}
        />
      ) : (
        <div className="interviewer-media">
          <img
            src={INTERVIEWER_IMAGE_SRC}
            alt="AI 면접관"
            className="interviewer-media-poster"
          />
        </div>
      )}
      <div className="session-theater-scrim" aria-hidden="true" />

      <header className="session-theater-header">
        <div className="flex min-w-0 items-center gap-9">
          <span className="session-theater-logo">Ait</span>
          <span className="session-theater-badge">
            <span className="session-theater-badge-dot" aria-hidden="true" />
            AI 모의면접 진행 중
          </span>
        </div>

        <div className="session-theater-progress">
          <span className="session-theater-progress-label" aria-live="polite">
            질문 {questionIndex + 1} / {totalQuestions}
          </span>
          <span className="session-theater-progress-track" aria-hidden="true">
            <span
              className="session-theater-progress-fill"
              style={{
                width: `${Math.round(((questionIndex + 1) / Math.max(totalQuestions, 1)) * 100)}%`,
              }}
            />
          </span>
          <span
            role="timer"
            aria-label={
              isRecording
                ? `답변 시간 ${answerSecondsRemaining}초 남음`
                : `답변 시간 ${answerDurationSeconds}초`
            }
            className={cn(
              'session-theater-timer tabular-nums',
              isRecording && answerSecondsRemaining <= 15 && 'is-warning',
              isRecording && answerSecondsRemaining <= 5 && 'is-urgent',
            )}
          >
            {formatCountdown(timerSeconds)}
          </span>
        </div>

        <div className="flex items-center gap-3">
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

      <div
        className="session-theater-bottom"
        data-answer-state={answerStatus}
      >
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
          <div className="session-theater-content-stack">
            <div className="session-theater-glass-card">
              <div className="session-theater-question-row">
                <div className="session-theater-card-main">
                  <div className="session-theater-card-label">
                    <span>현재 질문</span>
                    {isAiSpeaking ? (
                      <span className="flex items-center gap-2" role="status">
                        AI 면접관이 질문을 읽고 있어요
                        <LiveWaveform />
                      </span>
                    ) : null}
                  </div>
                  <p className="session-theater-question" aria-live="polite">
                    {questionVisible ? question : '질문 영상을 불러오고 있어요…'}
                  </p>

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

                <button
                  type="button"
                  className="session-theater-replay-button"
                  onClick={onReplayQuestion}
                  disabled={replayDisabled}
                  aria-label="질문 다시 듣기"
                >
                  <Play className="size-5" aria-hidden="true" />
                </button>
              </div>

              {isRecording || isProcessing || isReview ? (
                <section
                  className="session-theater-transcript-panel"
                  aria-labelledby="session-live-answer-title"
                >
                  <div className="session-theater-transcript-header">
                    <h2 id="session-live-answer-title">실시간 답변</h2>
                  </div>

                  {isReview ? (
                    <div className="session-theater-transcript-editor">
                      <label htmlFor="voice-answer-transcript">답변 텍스트</label>
                      <Textarea
                        id="voice-answer-transcript"
                        value={transcript}
                        onChange={(event) => onChangeTranscript(event.target.value)}
                        className="session-theater-textarea"
                        placeholder="인식된 답변을 확인하고 필요한 부분을 수정해주세요."
                      />
                    </div>
                  ) : (
                    <div
                      className="session-theater-live-transcript"
                      role="log"
                      aria-live="polite"
                    >
                      {transcript ||
                        (isRecording
                          ? '답변을 시작하면 인식된 내용이 여기에 표시됩니다.'
                          : '인식된 답변을 정리하고 있습니다.')}
                    </div>
                  )}

                  <p className="session-theater-transcript-status">
                    {isReview
                      ? '답변 내용을 수정한 뒤 답변 제출을 눌러주세요.'
                      : isProcessing
                        ? '답변을 텍스트로 변환하고 있어요…'
                        : '실시간 답변 기록 중 · 시간이 끝나면 자동 종료됩니다.'}
                    {isRecording ? <LiveWaveform /> : null}
                  </p>
                </section>
              ) : null}
            </div>

            <div className="session-theater-controls-row">
              <div className="session-theater-controls-left">
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
                  aria-label="음성 텍스트 변환은 브라우저에서 처리됩니다"
                  title="음성 텍스트 변환은 브라우저에서 처리합니다. 제출한 녹음 파일은 기존 답변 음성 분석을 위해 서버로 전송됩니다."
                >
                  <ShieldCheck className="size-4 shrink-0" aria-hidden="true" />
                  <span className="session-theater-privacy-text">
                    음성 텍스트 변환은 브라우저에서 처리됩니다
                  </span>
                </span>
              </div>

              <div className="session-theater-controls-right">
                {isRecording || isReview || isSubmittingAnswer ? (
                  <span className="session-theater-hint">
                    {isRecording
                      ? 'Space 키로 답변을 종료할 수 있어요'
                      : 'Space 키로 답변을 제출할 수 있어요'}
                  </span>
                ) : null}

                {isRecording ? (
                  <button
                    type="button"
                    className="session-theater-record-button"
                    onClick={onFinishAnswer}
                    aria-label="답변 종료"
                  >
                    <Square className="size-4 fill-current" aria-hidden="true" />
                    답변 종료
                  </button>
                ) : isReview || isSubmittingAnswer ? (
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
                ) : null}
              </div>
            </div>
          </div>

          <div className="session-theater-selfview-slot">
            <FloatingSelfView
              stream={stream}
              boundsRef={stageRef}
              docked
              showCenterGuide={showFaceCenterGuide}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
