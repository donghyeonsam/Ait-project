import { ChevronDown, GripHorizontal, UsersRound, X } from 'lucide-react'
import type { MyStudyGroup } from '@/api/study-groups'
import { DialogClose } from '@/components/ui/dialog'

interface StudyChatHeaderProps {
  group: MyStudyGroup | null
  isLoadingGroup: boolean
  isConnected: boolean
  isGroupSwitcherOpen: boolean
  groupSwitcherId: string
  groupTriggerRef: React.RefObject<HTMLButtonElement | null>
  onToggleGroupSwitcher: () => void
}

// 현재 그룹과 연결 상태를 요약하고 그룹 전환·닫기 동작을 제공한다.
export function StudyChatHeader({
  group,
  isLoadingGroup,
  isConnected,
  isGroupSwitcherOpen,
  groupSwitcherId,
  groupTriggerRef,
  onToggleGroupSwitcher,
}: StudyChatHeaderProps) {
  return (
    <header
      data-study-chat-drag-handle
      className="relative flex h-[5.25rem] shrink-0 cursor-move select-none items-center justify-between gap-3 border-b border-border-default px-4 sm:px-6"
    >
      <GripHorizontal
        className="pointer-events-none absolute left-1/2 top-1 size-5 -translate-x-1/2 text-text-secondary/55"
        aria-hidden="true"
      />
      <button
        ref={groupTriggerRef}
        type="button"
        onClick={() => {
          if (group) onToggleGroupSwitcher()
        }}
        aria-disabled={!group}
        aria-expanded={isGroupSwitcherOpen}
        aria-controls={groupSwitcherId}
        className="group flex min-w-0 items-center gap-3 rounded-ait-m p-1.5 text-left transition-colors hover:bg-status-neutral-surface focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-action-primary/25 aria-disabled:cursor-default aria-disabled:hover:bg-transparent"
      >
        <span className="flex size-11 shrink-0 items-center justify-center rounded-ait-pill bg-loading-pastel-violet text-tag-role sm:size-12">
          <UsersRound className="size-6" aria-hidden="true" />
        </span>
        <span className="min-w-0">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="truncate text-body-1 font-bold text-action-primary">
              {group?.title ?? '그룹톡'}
            </span>
            <ChevronDown
              className={`size-4 shrink-0 text-text-secondary transition-transform ${isGroupSwitcherOpen ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          </span>
          <span className="mt-0.5 flex items-center gap-2 text-caption text-text-secondary">
            {group ? <span>{group.currentMemberCount}명</span> : null}
            {group ? <span aria-hidden="true">·</span> : null}
            {/* TODO: 실제 API 연동 필요 - 접속 인원 API가 추가되면 연결 상태 대신 접속자 수를 표시한다. */}
            <span className="inline-flex items-center gap-1.5">
              <span
                className={`size-2 rounded-ait-pill ${isConnected ? 'bg-status-success' : 'bg-status-neutral'}`}
                aria-hidden="true"
              />
              {!group
                ? isLoadingGroup
                  ? '그룹 정보를 불러오는 중'
                  : '참여 그룹 없음'
                : isConnected
                  ? '그룹톡 연결됨'
                  : '연결 중'}
            </span>
          </span>
        </span>
      </button>

      <div className="flex shrink-0 items-center gap-2">
        <DialogClose asChild>
          <button
            type="button"
            className="flex size-10 shrink-0 items-center justify-center rounded-ait-s text-text-secondary transition-colors hover:bg-status-neutral-surface hover:text-action-primary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-action-primary/25"
            aria-label="그룹톡 닫기"
          >
            <X className="size-6" aria-hidden="true" />
          </button>
        </DialogClose>
      </div>
    </header>
  )
}
