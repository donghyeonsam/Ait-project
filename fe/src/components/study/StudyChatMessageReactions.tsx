import { useEffect, useRef, useState } from 'react'
import { SmilePlus, X } from 'lucide-react'
import type { StudyGroupChatReactionSummary } from '@/api/study-group-chat'
import { studyChatEmojis } from '@/components/study/studyChatEmojis'
import { cn } from '@/lib/utils'

interface StudyChatMessageReactionsProps {
  messageId: number
  reactions: StudyGroupChatReactionSummary[]
  currentUserId: number | null
  onToggle: (messageId: number, emoji: string) => void
  /** end는 내 메시지처럼 오른쪽에 붙는 경우로, 이모지 선택창이 화면 밖으로 나가지 않게 오른쪽 기준으로 띄운다. */
  align?: 'start' | 'end'
}

const quickReactionEmojis = ['👍', '❤️', '😂', '🎉', '👏']

// 메시지에 달린 이모지 반응 목록과 반응 선택기다. 같은 반응을 다시 누르면 서버에서 토글된다.
export function StudyChatMessageReactions({
  messageId,
  reactions,
  currentUserId,
  onToggle,
  align = 'start',
}: StudyChatMessageReactionsProps) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const reactionAreaRef = useRef<HTMLDivElement>(null)
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!pickerOpen) return

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!reactionAreaRef.current?.contains(event.target as Node)) {
        setPickerOpen(false)
      }
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPickerOpen(false)
    }
    const animationFrame = window.requestAnimationFrame(() => {
      pickerRef.current?.scrollIntoView?.({ block: 'nearest' })
    })

    document.addEventListener('pointerdown', closeOnOutsidePointer)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      window.cancelAnimationFrame(animationFrame)
      document.removeEventListener('pointerdown', closeOnOutsidePointer)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [pickerOpen])

  const toggleReaction = (emoji: string) => {
    onToggle(messageId, emoji)
  }

  const hasReacted = (emoji: string) =>
    currentUserId !== null &&
    reactions.some(
      (reaction) =>
        reaction.emoji === emoji && reaction.userIds.includes(currentUserId),
    )

  return (
    <div
      ref={reactionAreaRef}
      className="mt-1.5 flex max-w-full flex-wrap items-center gap-1"
    >
      {reactions.map((reaction) => {
        const reactedByMe =
          currentUserId !== null && reaction.userIds.includes(currentUserId)

        return (
          <button
            key={reaction.emoji}
            type="button"
            onClick={() => toggleReaction(reaction.emoji)}
            aria-pressed={reactedByMe}
            aria-label={`${reaction.emoji} 반응 ${reaction.count}개${reactedByMe ? ', 내가 반응함' : ''}`}
            className={cn(
              'inline-flex min-h-7 items-center gap-1 rounded-ait-pill border px-2 text-caption tabular-nums transition-[background-color,border-color,transform] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-action-primary/25 motion-reduce:transform-none',
              reactedByMe
                ? 'border-status-achievement-border bg-status-achievement-surface text-action-primary'
                : 'border-border-default bg-surface-default text-text-secondary hover:border-status-achievement-border',
            )}
          >
            <span aria-hidden="true">{reaction.emoji}</span>
            <span>{reaction.count}</span>
          </button>
        )
      })}

      <button
        type="button"
        onClick={() => setPickerOpen((current) => !current)}
        aria-expanded={pickerOpen}
        aria-label={pickerOpen ? '반응 선택 닫기' : '이모지 반응 추가'}
        className="inline-flex size-7 items-center justify-center rounded-ait-pill border border-transparent text-text-secondary opacity-70 transition-[opacity,background-color,border-color] hover:border-border-default hover:bg-surface-default hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-action-primary/25"
      >
        {pickerOpen ? (
          <X className="size-3.5" aria-hidden="true" />
        ) : (
          <SmilePlus className="size-3.5" aria-hidden="true" />
        )}
      </button>

      {pickerOpen ? (
        <div
          ref={pickerRef}
          role="dialog"
          aria-label="메시지 반응 선택"
          className={cn(
            'order-last mt-1 w-64 max-w-full basis-full rounded-ait-m border border-border-default bg-surface-default p-2 shadow-elevation-2',
            align === 'end' ? 'ml-auto' : 'mr-auto',
          )}
        >
          <p className="mb-1.5 px-1 text-caption text-text-secondary">
            빠른 반응
          </p>
          <div className="mb-2 grid grid-cols-5 gap-1">
            {quickReactionEmojis.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => toggleReaction(emoji)}
                aria-pressed={hasReacted(emoji)}
                className={cn(
                  'flex size-9 items-center justify-center rounded-ait-s border text-xl focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-action-primary/25',
                  hasReacted(emoji)
                    ? 'border-status-achievement-border bg-status-achievement-surface'
                    : 'border-transparent hover:bg-status-neutral-surface',
                )}
                aria-label={`${emoji} 반응`}
              >
                {emoji}
              </button>
            ))}
          </div>
          <div className="grid max-h-32 grid-cols-6 gap-1 overflow-x-hidden overflow-y-auto overscroll-contain">
            {studyChatEmojis
              .filter((emoji) => !quickReactionEmojis.includes(emoji))
              .map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => toggleReaction(emoji)}
                  aria-pressed={hasReacted(emoji)}
                  className={cn(
                    'flex size-8 items-center justify-center rounded-ait-s border text-lg focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-action-primary/25',
                    hasReacted(emoji)
                      ? 'border-status-achievement-border bg-status-achievement-surface'
                      : 'border-transparent hover:bg-status-neutral-surface',
                  )}
                  aria-label={`${emoji} 반응`}
                >
                  {emoji}
                </button>
              ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
