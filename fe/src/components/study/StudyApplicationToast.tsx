import { CheckCircle2, X } from 'lucide-react'

interface StudyApplicationToastProps {
  message: string
  onClose: () => void
}

// 신청 성공처럼 짧게 확인하면 되는 결과를 화면 하단에 알린다.
export function StudyApplicationToast({
  message,
  onClose,
}: StudyApplicationToastProps) {
  return (
    <div
      className="study-toast fixed bottom-8 left-1/2 z-[var(--z-index-toast)] flex w-[min(38rem,calc(100vw-2rem))] -translate-x-1/2 items-center gap-3 rounded-ait-m border border-status-success-border bg-status-success-surface px-6 py-5 text-action-primary shadow-elevation-3"
      role="status"
      aria-live="polite"
    >
      <CheckCircle2 className="size-6 shrink-0 text-status-success" aria-hidden="true" />
      <p className="min-w-0 flex-1 text-body-1 font-medium">{message}</p>
      <button
        type="button"
        onClick={onClose}
        className="flex size-10 shrink-0 items-center justify-center rounded-ait-s text-text-secondary hover:bg-surface-default"
        aria-label="알림 닫기"
      >
        <X className="size-5" aria-hidden="true" />
      </button>
    </div>
  )
}
