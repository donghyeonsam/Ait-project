import { MessageCircleMore } from 'lucide-react'

interface StudyChatFloatingButtonProps {
  unreadCount: number
  onClick: () => void
}

// 라운지 어느 위치에서도 그룹톡을 열 수 있는 고정 진입 버튼이다.
export function StudyChatFloatingButton({
  unreadCount,
  onClick,
}: StudyChatFloatingButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed bottom-6 right-6 z-[var(--z-index-sticky)] flex size-16 items-center justify-center rounded-ait-pill border border-border-default bg-surface-default text-action-primary shadow-elevation-3 transition-[transform,box-shadow] hover:-translate-y-1 hover:shadow-elevation-2 active:translate-y-0"
      aria-label={`그룹톡 열기, 읽지 않은 메시지 ${unreadCount}개`}
    >
      <MessageCircleMore className="size-8" aria-hidden="true" />
      <span className="absolute -bottom-2 min-w-10 rounded-ait-s border border-status-error bg-surface-default px-2 py-0.5 text-caption font-semibold text-status-error">
        {unreadCount}
      </span>
    </button>
  )
}
