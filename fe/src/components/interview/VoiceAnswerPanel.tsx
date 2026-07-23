import { Info, RotateCcw, ShieldCheck } from 'lucide-react'
import type { MediaPermissionState } from '@/components/interview/useMediaDevices'
import type { VoiceAnswerStatus } from '@/components/interview/useVoiceAnswer'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

interface VoiceAnswerPanelProps {
  status: VoiceAnswerStatus
  transcript: string
  audioBlob: Blob | null
  error: string | null
  speechError: string | null
  mediaPermission: MediaPermissionState
  onChangeTranscript: (value: string) => void
  onReplayQuestion: () => void
  onRetryMediaAccess: () => void
  onRetryTranscription: () => void
  replayDisabled: boolean
}

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`
  return `${(size / 1024).toFixed(1)} KB`
}

export function VoiceAnswerPanel({
  status,
  transcript,
  audioBlob,
  error,
  speechError,
  mediaPermission,
  onChangeTranscript,
  onReplayQuestion,
  onRetryMediaAccess,
  onRetryTranscription,
  replayDisabled,
}: VoiceAnswerPanelProps) {
  const isRecording = status === 'recording'
  const isProcessing = status === 'processing'
  const canEdit = status === 'review'
  const canRetryTranscription = status === 'review' && Boolean(error && audioBlob)
  const mediaPermissionError =
    mediaPermission === 'denied'
      ? '카메라와 마이크 권한이 차단되었습니다. 브라우저 권한을 허용한 뒤 다시 시도해주세요.'
      : mediaPermission === 'unsupported'
        ? '이 브라우저에서는 카메라와 마이크를 사용할 수 없습니다. 최신 Chrome 또는 Edge에서 다시 시도해주세요.'
        : null

  return (
    <section
      className="mt-6 rounded-ait-m border border-border-default bg-surface-default p-6 shadow-elevation-1"
      aria-labelledby="voice-answer-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id="voice-answer-title" className="text-h3 text-text-primary">
            음성 답변
          </h2>
          <p className="mt-1 text-body-2 text-text-secondary">
            답변을 녹음하면 음성이 텍스트로 변환되며 제출 전에 수정할 수 있습니다.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={onReplayQuestion}
          disabled={replayDisabled}
        >
          <RotateCcw aria-hidden="true" />
          질문 다시 듣기
        </Button>
      </div>

      {mediaPermission === 'pending' ? (
        <p className="mt-5 text-body-2 text-text-secondary" role="status">
          카메라와 마이크 연결을 확인하고 있습니다.
        </p>
      ) : null}

      {mediaPermissionError ? (
        <div className="mt-5 rounded-ait-s border border-status-error-border bg-status-error-surface p-4" role="alert">
          <p className="text-body-2 text-status-error">{mediaPermissionError}</p>
          {mediaPermission === 'denied' ? (
            <Button
              type="button"
              variant="secondary"
              className="mt-3"
              onClick={onRetryMediaAccess}
            >
              장치 권한 다시 확인
            </Button>
          ) : null}
        </div>
      ) : null}

      <div className="mt-5 rounded-ait-s border border-status-info-border bg-status-info-surface p-4">
        <p className="flex items-center gap-2 text-body-2 font-medium text-status-info">
          <ShieldCheck className="size-5" aria-hidden="true" />
          녹음 파일은 음성 인식 처리에만 사용되고 별도로 저장되지 않습니다.
        </p>
        <p className="mt-1 text-caption text-text-secondary">
          녹음이 끝나면 음성 인식 처리를 위해 녹음 파일이 서버로 전송되며,
          답변 텍스트는 이 면접 화면의 메모리에만 보관되고 화면을 나가면 폐기됩니다.
        </p>
      </div>

      {isRecording ? (
        <div className="mt-5 flex items-center gap-3 text-body-2 text-status-error" role="status">
          <span className="size-3 rounded-ait-pill bg-status-error" aria-hidden="true" />
          녹음 중입니다. 답변을 마치면 녹음 완료를 눌러주세요.
        </div>
      ) : null}

      {isProcessing ? (
        <p className="mt-5 text-body-2 text-text-secondary" role="status">
          답변을 텍스트로 변환하고 있어요…
        </p>
      ) : null}

      {canEdit ? (
        <div className="mt-5">
          <label htmlFor="voice-answer-transcript" className="text-body-2 font-medium text-text-primary">
            답변 텍스트
          </label>
          <Textarea
            id="voice-answer-transcript"
            value={transcript}
            onChange={(event) => onChangeTranscript(event.target.value)}
            className="mt-2 min-h-36"
            placeholder="인식된 답변을 확인하고 필요한 부분을 수정해주세요."
          />
          {audioBlob ? (
            <p className="mt-2 text-caption text-text-secondary">
              녹음 준비 완료 · {formatFileSize(audioBlob.size)}
            </p>
          ) : null}
        </div>
      ) : null}

      {error || speechError ? (
        <div className="mt-5 space-y-2" role="alert">
          {[error, speechError].filter(Boolean).map((message, index) => (
            <p key={`${index}-${message}`} className="flex items-start gap-2 text-body-2 text-status-error">
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {message}
            </p>
          ))}
          {canRetryTranscription ? (
            <Button
              type="button"
              variant="secondary"
              onClick={onRetryTranscription}
            >
              <RotateCcw aria-hidden="true" />
              변환 다시 시도
            </Button>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
