import { useState } from 'react'
import { SmilePlus, X } from 'lucide-react'
import type { StudyGroupChatReactionSummary } from '@/api/study-group-chat'
import { studyChatEmojis } from '@/components/study/studyChatEmojis'
import { cn } from '@/lib/utils'

interface StudyChatMessageReactionsProps {
  messageId: number
  reactions: StudyGroupChatReactionSummary[]
  currentUserId: number | null
  onToggle: (messageId: number, emoji: string) => void
}

const quickReactionEmojis = ['👍', '❤️', '😂', '🎉', '👏']

// 상대방 메시지에만 노출되는 반응 선택기다. 같은 반응을 다시 누르면 서버에서 토글된다.
export function StudyChatMessageReactions({
  messageId,
  reactions,
  currentUserId,
  onToggle,
}: StudyChatMessageReactionsProps) {
  const [pickerOpen, setPickerOpen] = useState(false)

  const toggleReaction = (emoji: string) => {
    onToggle(messageId, emoji)
    setPickerOpen(false)
  }

  return (
    <div className="relative mt-1.5 flex max-w-full flex-wrap items-center gap-1">
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
          role="dialog"
          aria-label="메시지 반응 선택"
          className="absolute bottom-9 left-0 z-[var(--z-index-dropdown)] w-64 rounded-ait-m border border-border-default bg-surface-default p-2 shadow-elevation-2"
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
                className="flex size-9 items-center justify-center rounded-ait-s text-xl hover:bg-status-neutral-surface focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-action-primary/25"
                aria-label={`${emoji} 반응`}
              >
                {emoji}
              </button>
            ))}
          </div>
          <div className="grid max-h-32 grid-cols-7 gap-1 overflow-y-auto overscroll-contain">
            {studyChatEmojis
              .filter((emoji) => !quickReactionEmojis.includes(emoji))
              .map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => toggleReaction(emoji)}
                  className="flex size-8 items-center justify-center rounded-ait-s text-lg hover:bg-status-neutral-surface focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-action-primary/25"
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
