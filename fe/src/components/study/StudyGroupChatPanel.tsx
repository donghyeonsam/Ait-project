import { MessageCircleMore, Pin, Send } from 'lucide-react'
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import type { StudyChatGroup, StudyChatMessage } from '@/mocks/study-lounge'

interface StudyGroupChatPanelProps {
  group: StudyChatGroup
}

// 현재 그룹의 공지와 목 채팅 메시지를 그룹 페이지 안에서 보여준다.
export function StudyGroupChatPanel({ group }: StudyGroupChatPanelProps) {
  const [messages, setMessages] = useState<StudyChatMessage[]>(() =>
    group.messages.map((message) => ({ ...message })),
  )
  const [draft, setDraft] = useState('')
  const messageListRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messageListRef.current?.scrollTo({
      top: messageListRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [messages.length])

  const sendMessage = () => {
    const content = draft.trim()
    if (!content) return
    setMessages((currentMessages) => [
      ...currentMessages,
      { id: Date.now(), sender: '나', content, isSelf: true },
    ])
    setDraft('')
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      sendMessage()
    }
  }

  return (
    <section className="flex min-h-[25rem] min-w-0 flex-col rounded-ait-m border border-border-default bg-surface-default p-4 shadow-elevation-1">
      <h2 className="flex items-center gap-2 text-body-1 font-semibold text-text-primary">
        <MessageCircleMore className="size-5" aria-hidden="true" />
        그룹톡
      </h2>

      <div className="mt-3 flex items-center gap-2 rounded-ait-s border border-status-achievement-border bg-status-achievement-surface px-3 py-2 text-caption text-action-primary">
        <Pin className="size-4 shrink-0" aria-hidden="true" />
        <p className="truncate">
          <span className="font-semibold">공지 · </span>
          {group.notice}
        </p>
      </div>

      <div
        ref={messageListRef}
        className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-4"
        aria-live="polite"
        aria-label="그룹톡 메시지"
      >
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              'study-chat-message flex items-end gap-3',
              message.isSelf && 'justify-end',
            )}
          >
            {!message.isSelf ? (
              <span
                className="size-8 shrink-0 rounded-ait-pill bg-profile-avatar"
                aria-hidden="true"
              />
            ) : null}
            <div className={cn('max-w-[82%]', message.isSelf && 'text-right')}>
              {!message.isSelf ? (
                <p className="mb-1 text-caption text-text-secondary">
                  {message.sender}
                </p>
              ) : null}
              <div
                className={cn(
                  'relative rounded-ait-m px-4 py-2 text-left text-body-2',
                  message.isSelf
                    ? 'rounded-br-none bg-action-primary text-surface-default'
                    : 'rounded-bl-none bg-status-neutral-surface text-action-primary',
                )}
              >
                <p className="whitespace-pre-wrap break-words">
                  {message.content}
                </p>
                {message.reaction ? (
                  <span
                    className="absolute -bottom-3 left-4 text-caption"
                    aria-label={`반응 ${message.reaction}`}
                  >
                    {message.reaction}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-end gap-2">
        <label className="min-w-0 flex-1">
          <span className="sr-only">그룹톡 메시지 입력</span>
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="메시지 입력"
            className="min-h-10 resize-none py-2"
          />
        </label>
        <button
          type="button"
          onClick={sendMessage}
          disabled={!draft.trim()}
          className="flex size-10 shrink-0 items-center justify-center rounded-ait-s bg-action-primary text-surface-default hover:shadow-elevation-2 disabled:bg-status-neutral-surface disabled:text-text-secondary"
          aria-label="그룹톡 메시지 전송"
        >
          <Send className="size-5" aria-hidden="true" />
        </button>
      </div>
    </section>
  )
}
