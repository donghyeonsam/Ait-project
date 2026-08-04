import { Check, Plus, UsersRound } from 'lucide-react'
import { useEffect, useRef, type KeyboardEvent } from 'react'
import type { StudyGroupChatMessage } from '@/api/study-group-chat'
import type { MyStudyGroup } from '@/api/study-groups'
import { toStudyChatPreviewText } from '@/lib/study-chat-reply'
import { cn } from '@/lib/utils'

export type StudyChatPreviewMap = Record<
  number,
  StudyGroupChatMessage | null | undefined
>

interface StudyChatGroupSwitcherProps {
  id: string
  groups: MyStudyGroup[]
  selectedGroupId: number | null
  previews: StudyChatPreviewMap
  unreadCounts?: Record<number, number>
  onSelect: (groupId: number) => void
  onFindGroup: () => void
  onClose: () => void
  onMarkAllRead?: () => void
}

const groupIconClasses = [
  'bg-loading-pastel-violet text-tag-role',
  'bg-loading-pastel-green text-status-success',
  'bg-status-achievement-surface text-status-warning',
]

function formatPreviewTime(createdAt: string) {
  const date = new Date(createdAt)
  if (Number.isNaN(date.getTime())) return ''

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const dayDifference = Math.round(
    (today.getTime() - target.getTime()) / 86_400_000,
  )

  if (dayDifference === 0) {
    return new Intl.DateTimeFormat('ko-KR', {
      hour: 'numeric',
      minute: '2-digit',
    }).format(date)
  }
  if (dayDifference === 1) return '어제'
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'numeric',
    day: 'numeric',
  }).format(date)
}

// 참여 중인 그룹의 실제 최근 메시지를 보여주고 키보드로 채팅방 전환을 돕는다.
export function StudyChatGroupSwitcher({
  id,
  groups,
  selectedGroupId,
  previews,
  unreadCounts,
  onSelect,
  onFindGroup,
  onClose,
  onMarkAllRead,
}: StudyChatGroupSwitcherProps) {
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([])

  useEffect(() => {
    const selectedIndex = groups.findIndex(
      (group) => group.id === selectedGroupId,
    )
    optionRefs.current[Math.max(0, selectedIndex)]?.focus()
  }, [groups, selectedGroupId])

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
      return
    }

    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()

    const currentIndex = optionRefs.current.findIndex(
      (option) => option === document.activeElement,
    )
    const lastIndex = groups.length - 1
    let nextIndex = currentIndex

    if (event.key === 'Home') nextIndex = 0
    if (event.key === 'End') nextIndex = lastIndex
    if (event.key === 'ArrowDown') {
      nextIndex = currentIndex < lastIndex ? currentIndex + 1 : 0
    }
    if (event.key === 'ArrowUp') {
      nextIndex = currentIndex > 0 ? currentIndex - 1 : lastIndex
    }

    optionRefs.current[nextIndex]?.focus()
  }

  return (
    <div
      id={id}
      className="study-chat-popover absolute left-4 top-[4.65rem] z-(--z-index-dropdown) w-[min(24.5rem,calc(100vw-2rem))] overflow-hidden rounded-ait-l border border-border-default bg-surface-default shadow-elevation-3 sm:left-6"
      onKeyDown={handleKeyDown}
    >
      <div className="flex items-center justify-between px-4 pb-2 pt-4">
        <p className="text-body-2 font-semibold text-action-primary">
          내 그룹톡
        </p>
        <button
          type="button"
          onClick={onMarkAllRead}
          disabled={!onMarkAllRead}
          className="rounded-ait-s px-2 py-1 text-caption font-medium text-text-secondary transition-colors hover:bg-status-neutral-surface hover:text-action-primary disabled:cursor-not-allowed disabled:opacity-55"
          title={
            onMarkAllRead
              ? undefined
              : '읽음 처리 기능은 서버 연동 준비 중입니다.'
          }
        >
          모두 읽음
        </button>
      </div>

      <div
        role="listbox"
        aria-label="내 그룹톡"
        className="max-h-[21rem] overflow-y-auto px-2 pb-2"
      >
        {groups.map((group, index) => {
          const isSelected = group.id === selectedGroupId
          const preview = previews[group.id]
          const unreadCount = unreadCounts?.[group.id] ?? 0

          return (
            <button
              key={group.id}
              ref={(element) => {
                optionRefs.current[index] = element
              }}
              type="button"
              role="option"
              aria-selected={isSelected}
              onClick={() => onSelect(group.id)}
              className={cn(
                'flex w-full items-center gap-3 rounded-ait-m px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-action-primary/25',
                isSelected
                  ? 'bg-loading-background-violet'
                  : 'hover:bg-status-neutral-surface',
              )}
            >
              <span
                className={cn(
                  'flex size-11 shrink-0 items-center justify-center rounded-ait-pill',
                  groupIconClasses[index % groupIconClasses.length],
                )}
                aria-hidden="true"
              >
                <UsersRound className="size-6" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-body-2 font-semibold text-action-primary">
                  {group.title}
                </span>
                <span className="mt-0.5 block truncate text-caption text-text-secondary">
                  {preview === undefined
                    ? '최근 메시지를 불러오는 중...'
                    : preview
                      ? toStudyChatPreviewText(preview.message)
                      : '아직 메시지가 없습니다.'}
                </span>
              </span>
              {isSelected ? (
                <span className="flex size-7 shrink-0 items-center justify-center rounded-ait-pill bg-action-primary text-surface-default">
                  <Check className="size-4" aria-hidden="true" />
                  <span className="sr-only">현재 그룹</span>
                </span>
              ) : preview || unreadCount > 0 ? (
                <span className="flex shrink-0 flex-col items-end gap-1 self-start pt-0.5">
                  {preview ? (
                    <span className="text-caption text-text-secondary">
                      {formatPreviewTime(preview.createdAt)}
                    </span>
                  ) : null}
                  {unreadCount > 0 ? (
                    <span className="flex h-4 min-w-4 items-center justify-center rounded-ait-pill bg-status-error px-1 text-[11px] font-bold leading-none text-surface-default">
                      <span aria-hidden="true">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                      <span className="sr-only">
                        읽지 않은 메시지 {unreadCount}개
                      </span>
                    </span>
                  ) : null}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>

      <div className="border-t border-border-default p-2">
        <button
          type="button"
          onClick={onFindGroup}
          className="flex w-full items-center gap-3 rounded-ait-s px-3 py-2 text-body-2 font-medium text-action-primary transition-colors hover:bg-status-neutral-surface focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-action-primary/25"
        >
          <span className="flex size-8 items-center justify-center rounded-ait-pill border border-border-default text-text-secondary">
            <Plus className="size-5" aria-hidden="true" />
          </span>
          새로운 그룹 찾아보기
        </button>
      </div>
    </div>
  )
}
