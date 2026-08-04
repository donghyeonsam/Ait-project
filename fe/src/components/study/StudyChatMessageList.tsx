import { useLayoutEffect, useRef } from 'react'
import type { StudyGroupChatMessage } from '@/api/study-group-chat'
import { Skeleton } from '@/components/ui/skeleton'
import { StudyChatMessageItem } from '@/components/study/StudyChatMessageItem'
import type { StudyChatReplyTarget } from '@/lib/study-chat-reply'
import { useStudyChatQuoteScroll } from '@/lib/useStudyChatQuoteScroll'

interface StudyChatMessageListProps {
  groupId: number | null
  groupTitle: string
  messages: StudyGroupChatMessage[]
  currentUserId: number | null
  isLoading: boolean
  error: string | null
  onToggleReaction: (chatId: number, emoji: string) => void
  onReply: (target: StudyChatReplyTarget) => void
}

function toDateKey(createdAt: string) {
  const date = new Date(createdAt)
  if (Number.isNaN(date.getTime())) return createdAt
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

function formatDateLabel(createdAt: string) {
  const date = new Date(createdAt)
  if (Number.isNaN(date.getTime())) return ''

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const dayDifference = Math.round(
    (today.getTime() - target.getTime()) / 86_400_000,
  )

  if (dayDifference === 0) return '오늘'
  if (dayDifference === 1) return '어제'
  return new Intl.DateTimeFormat('ko-KR', {
    year: date.getFullYear() === now.getFullYear() ? undefined : 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}

// 메시지를 날짜별로 구분하고 사용자의 스크롤 위치를 존중하며 최신 대화를 보여준다.
export function StudyChatMessageList({
  groupId,
  groupTitle,
  messages,
  currentUserId,
  isLoading,
  error,
  onToggleReaction,
  onReply,
}: StudyChatMessageListProps) {
  const listRef = useRef<HTMLDivElement>(null)
  const shouldStickToBottomRef = useRef(true)
  const previousGroupIdRef = useRef<number | null>(null)
  const needsInitialScrollRef = useRef(true)
  const { highlightedChatId, scrollToMessage } = useStudyChatQuoteScroll(listRef)

  useLayoutEffect(() => {
    const list = listRef.current
    if (!list) return

    const didSwitchGroup = previousGroupIdRef.current !== groupId
    previousGroupIdRef.current = groupId
    if (didSwitchGroup || isLoading) {
      shouldStickToBottomRef.current = true
      needsInitialScrollRef.current = true
    }

    if (isLoading) return

    if (shouldStickToBottomRef.current) {
      list.scrollTo({
        top: list.scrollHeight,
        behavior: needsInitialScrollRef.current ? 'auto' : 'smooth',
      })
      needsInitialScrollRef.current = false
    }
  }, [groupId, isLoading, messages.length])

  const handleScroll = () => {
    const list = listRef.current
    if (!list) return
    const distanceFromBottom =
      list.scrollHeight - list.scrollTop - list.clientHeight
    shouldStickToBottomRef.current = distanceFromBottom < 96
  }

  return (
    <div
      ref={listRef}
      onScroll={handleScroll}
      className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-3 py-3 sm:px-4"
      aria-live="polite"
      aria-label={`${groupTitle} 그룹 메시지`}
    >
      {isLoading ? (
        <div className="space-y-4" role="status" aria-label="메시지 불러오는 중">
          <div className="flex items-end gap-2">
            <Skeleton className="size-8 shrink-0 rounded-ait-pill" />
            <Skeleton className="h-16 w-56 rounded-ait-l" />
          </div>
          <Skeleton className="ml-auto h-12 w-64 rounded-ait-l" />
          <div className="flex items-end gap-2">
            <Skeleton className="size-8 shrink-0 rounded-ait-pill" />
            <Skeleton className="h-10 w-48 rounded-ait-l" />
          </div>
        </div>
      ) : null}

      {error ? (
        <div
          className="flex min-h-48 items-center justify-center text-center text-body-2 text-status-error"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      {!isLoading && !error && messages.length === 0 ? (
        <div className="flex min-h-48 items-center justify-center text-center text-body-2 text-text-secondary">
          아직 메시지가 없습니다.
          <br />첫 메시지를 보내 대화를 시작해 보세요.
        </div>
      ) : null}

      {!isLoading && !error
        ? messages.map((message, index) => {
            const previousMessage = messages[index - 1]
            const showDateDivider =
              !previousMessage ||
              toDateKey(previousMessage.createdAt) !==
                toDateKey(message.createdAt)

            return (
              <div key={message.chatId}>
                {showDateDivider ? (
                  <div className="my-3 flex items-center gap-3" aria-label={formatDateLabel(message.createdAt)}>
                    <span className="h-px flex-1 bg-border-default" />
                    <span className="text-caption font-medium text-text-secondary">
                      {formatDateLabel(message.createdAt)}
                    </span>
                    <span className="h-px flex-1 bg-border-default" />
                  </div>
                ) : null}

                <StudyChatMessageItem
                  message={message}
                  currentUserId={currentUserId}
                  isHighlighted={highlightedChatId === message.chatId}
                  onToggleReaction={onToggleReaction}
                  onReply={onReply}
                  onQuoteClick={scrollToMessage}
                  className="mb-2.5"
                />
              </div>
            )
          })
        : null}
    </div>
  )
}
