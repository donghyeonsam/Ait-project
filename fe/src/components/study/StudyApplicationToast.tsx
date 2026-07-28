import { AlertCircle, CheckCircle2, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StudyApplicationToastProps {
  message: string
  variant?: 'success' | 'error'
  onClose: () => void
}

// 신청 성공·실패 결과를 화면 하단에 알린다. variant로 성공/오류 스타일을 구분한다.
export function StudyApplicationToast({
  message,
  variant = 'success',
  onClose,
}: StudyApplicationToastProps) {
  const isError = variant === 'error'

  return (
    <div
      className={cn(
        'study-toast fixed bottom-8 left-1/2 z-[var(--z-index-toast)] flex w-[min(38rem,calc(100vw-2rem))] -translate-x-1/2 items-center gap-3 rounded-ait-m border px-6 py-5 shadow-elevation-3',
        isError
          ? 'border-status-error-border bg-status-error-surface text-status-error'
          : 'border-status-success-border bg-status-success-surface text-action-primary',
      )}
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
    >
      {isError ? (
        <AlertCircle className="size-6 shrink-0 text-status-error" aria-hidden="true" />
      ) : (
        <CheckCircle2 className="size-6 shrink-0 text-status-success" aria-hidden="true" />
      )}
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
