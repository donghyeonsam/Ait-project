import { MessageCircleMore } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface StudyChatFloatingButtonProps {
  // 실제 채팅 연동 전까지는 값을 넘기지 않는다. 값이 오면 카카오톡처럼 버튼 위에 겹친 뱃지로 보여준다.
  unreadCount?: number
  onClick: () => void
}

// 라운지·그룹 화면 어디서든 그룹톡을 열 수 있는 고정 진입 버튼이다.
export function StudyChatFloatingButton({
  unreadCount,
  onClick,
}: StudyChatFloatingButtonProps) {
  const hasUnread = typeof unreadCount === 'number' && unreadCount > 0
  // 긴 개수가 뱃지 크기를 밀어내지 않도록 99+로 축약한다.
  const unreadLabel = unreadCount && unreadCount > 99 ? '99+' : String(unreadCount ?? 0)

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-(--z-index-sticky) mr-(--removed-body-scroll-bar-size,0px) md:bottom-8 md:right-8">
      <Button
        type="button"
        size="icon"
        onClick={onClick}
        className="group/chat pointer-events-auto relative size-14 shrink-0 rounded-ait-pill! border-2 border-status-achievement bg-action-primary p-0 text-surface-default shadow-elevation-3 transition-[transform,box-shadow,border-color] duration-150 ease-standard hover:-translate-y-1 hover:scale-105 hover:border-status-achievement/80 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-action-primary/25 focus-visible:ring-offset-2 focus-visible:ring-offset-background-default active:translate-y-0 active:scale-95 motion-reduce:transform-none motion-reduce:transition-none md:size-16"
        aria-label={
          hasUnread ? `그룹톡 열기, 읽지 않은 메시지 ${unreadLabel}개` : '그룹톡 열기'
        }
      >
        <MessageCircleMore
          className="transition-transform duration-150 ease-standard group-hover/chat:scale-110 motion-reduce:transform-none motion-reduce:transition-none"
          aria-hidden="true"
        />
        {hasUnread ? (
          <span
            className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-ait-pill border-2 border-surface-default bg-status-error px-1 text-[11px] font-bold leading-none text-surface-default"
            aria-hidden="true"
          >
            {unreadLabel}
          </span>
        ) : null}
      </Button>
    </div>
  )
}
