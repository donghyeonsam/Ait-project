import { MessageCircleMore } from 'lucide-react'

interface StudyChatFloatingButtonProps {
  unreadCount: number
  onClick: () => void
}

// 라운지·그룹 화면 어디서든 그룹톡을 열 수 있는 고정 진입 버튼이다.
export function StudyChatFloatingButton({
  unreadCount,
  onClick,
}: StudyChatFloatingButtonProps) {
  const hasUnread = unreadCount > 0
  // 배지는 두 자리까지는 그대로, 99 초과부터 99+로 축약한다.
  const badgeLabel = unreadCount > 99 ? '99+' : String(unreadCount)

  return (
    <button
      type="button"
      onClick={onClick}
      className="group fixed bottom-6 right-6 z-(--z-index-sticky) flex size-16 items-center justify-center rounded-ait-pill border border-border-default bg-surface-default text-action-primary shadow-elevation-2 transition-[transform,box-shadow] duration-200 ease-standard hover:-translate-y-0.5 hover:shadow-elevation-3 focus-visible:outline-offset-2 active:scale-95"
      aria-label={
        hasUnread
          ? `그룹톡 열기, 읽지 않은 메시지 ${badgeLabel}개`
          : '그룹톡 열기'
      }
    >
      <MessageCircleMore
        className="size-8 transition-transform duration-200 ease-standard group-hover:scale-110"
        aria-hidden="true"
      />
      {hasUnread ? (
        <span
          className="absolute -right-1 -top-1 inline-flex h-6 min-w-6 items-center justify-center rounded-ait-pill border-2 border-surface-default bg-[#b20000] px-1.5 text-caption font-semibold leading-none text-white tabular-nums"
          aria-hidden="true"
        >
          {badgeLabel}
        </span>
      ) : null}
    </button>
  )
}
