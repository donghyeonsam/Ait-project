import { MessageCircleMore } from 'lucide-react'
import { useId } from 'react'
import { Button } from '@/components/ui/button'

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
  const unreadStatusId = useId()
  // 긴 개수가 플로팅 컨트롤의 폭을 밀어내지 않도록 기존과 동일하게 99+로 축약한다.
  const unreadLabel = unreadCount > 99 ? '99+' : String(unreadCount)

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-(--z-index-sticky) flex items-center gap-2 md:bottom-8 md:right-8"
    >
      <div className="hidden h-[52px] w-[142px] flex-col justify-center rounded-ait-m border border-border-default bg-surface-default/95 px-4 py-2 shadow-elevation-1 md:flex">
        <span className="text-body-2 font-semibold leading-5 text-action-primary">
          그룹톡
        </span>
        <span
          id={unreadStatusId}
          className="flex items-center gap-2 text-caption leading-4 text-text-secondary tabular-nums"
        >
          <span
            className="size-1.5 shrink-0 rounded-ait-pill bg-status-achievement"
            aria-hidden="true"
          />
          새 메시지 {unreadLabel}개
        </span>
      </div>

      <Button
        type="button"
        size="icon"
        onClick={onClick}
        className="group/chat pointer-events-auto size-[52px] shrink-0 rounded-ait-pill border border-status-achievement bg-action-primary p-0 text-surface-default shadow-elevation-2 transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-elevation-3 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-action-primary/25 focus-visible:ring-offset-2 focus-visible:ring-offset-background-default active:translate-y-0 active:scale-[0.98] motion-reduce:transform-none motion-reduce:transition-none md:size-[58px]"
        aria-label="그룹톡 열기"
        aria-describedby={hasUnread ? unreadStatusId : undefined}
      >
        <MessageCircleMore
          className="transition-transform duration-200 ease-out group-hover/chat:scale-[1.04] motion-reduce:transform-none motion-reduce:transition-none"
          aria-hidden="true"
        />
      </Button>
    </div>
  )
}
