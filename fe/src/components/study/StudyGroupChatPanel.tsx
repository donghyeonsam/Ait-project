import {
  MessageCircleMore,
  Minus,
  Pin,
  Plus,
  Send,
  SmilePlus,
  Sticker,
} from 'lucide-react'
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

const messageReactionEmojis = ['👍', '❤️', '😂', '🎉', '👏']
const composerEmojis = [
  '😀',
  '😃',
  '😄',
  '😁',
  '😊',
  '🙂',
  '😉',
  '😍',
  '🥰',
  '😘',
  '😎',
  '🤩',
  '🥳',
  '😂',
  '🤣',
  '🥹',
  '😅',
  '😢',
  '😭',
  '😡',
  '🤔',
  '🫡',
  '😴',
  '🤯',
  '👍',
  '👎',
  '👌',
  '✌️',
  '🤞',
  '👏',
  '🙌',
  '🙏',
  '💪',
  '👀',
  '💯',
  '🔥',
  '🎉',
  '🎊',
  '✨',
  '⭐',
  '❤️',
  '🩷',
  '🧡',
  '💛',
  '💚',
  '💙',
  '💜',
  '🤍',
]
const composerEmoticons = ['( •̀ᴗ•́ )و', '(｡•̀ᴗ-)✧', 'ㅎㅎ', 'ㅠㅠ']

// 현재 그룹의 공지와 목 채팅 메시지를 그룹 페이지 안에서 보여준다.
export function StudyGroupChatPanel({ group }: StudyGroupChatPanelProps) {
  const [messages, setMessages] = useState<StudyChatMessage[]>(() =>
    group.messages.map((message) => ({ ...message })),
  )
  const [draft, setDraft] = useState('')
  const [composerPicker, setComposerPicker] = useState<
    'emoji' | 'emoticon' | null
  >(null)
  const [reactionPickerMessageId, setReactionPickerMessageId] = useState<
    number | null
  >(null)
  const [
    expandedReactionPickerMessageId,
    setExpandedReactionPickerMessageId,
  ] = useState<number | null>(null)
  const messageListRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messageListRef.current?.scrollTo({
      top: messageListRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [messages.length])

  useEffect(() => {
    if (reactionPickerMessageId === null) {
      return
    }

    const closeReactionPicker = () => {
      setReactionPickerMessageId(null)
      setExpandedReactionPickerMessageId(null)
    }
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target

      if (
        target instanceof Element &&
        target.closest(
          `[data-message-reaction-controls="${reactionPickerMessageId}"]`,
        )
      ) {
        return
      }

      closeReactionPicker()
    }
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeReactionPicker()
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [reactionPickerMessageId])

  const sendMessage = () => {
    const content = draft.trim()
    if (!content) return
    setMessages((currentMessages) => [
      ...currentMessages,
      { id: Date.now(), sender: '나', content, isSelf: true },
    ])
    setDraft('')
    setComposerPicker(null)
  }

  const appendToDraft = (value: string, addLeadingSpace = false) => {
    setDraft((currentDraft) => {
      const spacing =
        addLeadingSpace && currentDraft && !currentDraft.endsWith(' ')
          ? ' '
          : ''
      return `${currentDraft}${spacing}${value}`
    })
    setComposerPicker(null)
  }

  const reactToMessage = (messageId: number, reaction: string) => {
    setMessages((currentMessages) =>
      currentMessages.map((message) =>
        message.id === messageId
          ? {
              ...message,
              reaction:
                message.reaction === reaction ? undefined : reaction,
            }
          : message,
      ),
    )
    setReactionPickerMessageId(null)
    setExpandedReactionPickerMessageId(null)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      sendMessage()
    }
  }

  return (
    <section
      className="flex h-[32rem] min-h-0 min-w-0 flex-col overflow-hidden rounded-ait-m border border-border-default bg-surface-default p-4 shadow-elevation-1 lg:h-[36rem]"
      aria-labelledby="study-group-chat-title"
    >
      <h2
        id="study-group-chat-title"
        className="flex items-center gap-2 text-body-1 font-semibold text-text-primary"
      >
        <MessageCircleMore className="size-5" aria-hidden="true" />
        그룹톡
      </h2>

      <div className="mt-3 flex shrink-0 items-center gap-2 rounded-ait-s border border-status-achievement-border bg-status-achievement-surface px-3 py-2 text-caption text-action-primary">
        <Pin className="size-4 shrink-0" aria-hidden="true" />
        <p className="truncate">
          <span className="font-semibold">공지 · </span>
          {group.notice}
        </p>
      </div>

      <div
        ref={messageListRef}
        className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-3 py-4 [scrollbar-gutter:stable]"
        aria-live="polite"
        aria-label="그룹톡 메시지"
      >
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              'study-chat-message group/message relative flex items-end gap-3 hover:z-20 focus-within:z-20',
              message.isSelf && 'justify-end',
            )}
          >
            {!message.isSelf ? (
              <span
                className="size-8 shrink-0 rounded-ait-pill bg-profile-avatar"
                aria-hidden="true"
              />
            ) : null}
            <div
              className={cn(
                'relative flex max-w-[82%] items-end gap-1',
                message.isSelf && 'flex-row-reverse',
              )}
              data-message-reaction-controls={message.id}
            >
              <div
                className={cn('relative', message.isSelf && 'text-right')}
              >
                {!message.isSelf ? (
                  <p className="mb-1 text-caption text-text-secondary">
                    {message.sender}
                  </p>
                ) : null}
                <div
                  className={cn(
                    'rounded-ait-m px-4 py-2 text-left text-body-2',
                    message.isSelf
                      ? 'rounded-br-none bg-action-primary text-surface-default'
                      : 'rounded-bl-none bg-status-neutral-surface text-action-primary',
                  )}
                >
                  <p className="whitespace-pre-wrap break-words">
                    {message.content}
                  </p>
                </div>
                {message.reaction ? (
                  <button
                    key={`${message.id}-${message.reaction}`}
                    type="button"
                    onClick={() =>
                      reactToMessage(message.id, message.reaction ?? '')
                    }
                    className={cn(
                      'study-reaction-bubble absolute -bottom-3 z-[1] inline-flex min-h-6 items-center rounded-ait-pill border border-border-default bg-surface-default px-2 text-caption shadow-elevation-1',
                      message.isSelf ? 'left-0' : 'right-0',
                    )}
                    aria-label={`반응 ${message.reaction} 취소`}
                  >
                    {message.reaction}
                    <span className="ml-1 text-[10px] text-text-secondary">
                      1
                    </span>
                  </button>
                ) : null}
              </div>

              <div
                className="relative mb-1 shrink-0"
                onMouseEnter={() => {
                  setReactionPickerMessageId(message.id)
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setReactionPickerMessageId(message.id)
                    setExpandedReactionPickerMessageId(null)
                  }}
                  onFocus={() => setReactionPickerMessageId(message.id)}
                  className={cn(
                    'pointer-events-none flex size-7 items-center justify-center rounded-ait-pill border border-border-default bg-surface-default text-text-secondary opacity-0 transition-[opacity,color,background-color] hover:bg-status-neutral-surface hover:text-action-primary group-hover/message:pointer-events-auto group-hover/message:opacity-100 group-focus-within/message:pointer-events-auto group-focus-within/message:opacity-100',
                    reactionPickerMessageId === message.id &&
                      'bg-status-neutral-surface text-action-primary',
                  )}
                  aria-label={`"${message.content}" 메시지에 이모지 반응 남기기`}
                  aria-controls={`message-reaction-picker-${message.id}`}
                  aria-expanded={reactionPickerMessageId === message.id}
                >
                  <SmilePlus className="size-4" aria-hidden="true" />
                </button>
              </div>

              {reactionPickerMessageId === message.id ? (
                <div
                  id={`message-reaction-picker-${message.id}`}
                  className={cn(
                    'study-reaction-picker absolute top-full z-10 mt-1 border border-border-default bg-surface-default shadow-elevation-2',
                    expandedReactionPickerMessageId === message.id
                      ? 'grid max-h-64 w-64 grid-cols-6 gap-1 overflow-y-auto overscroll-contain rounded-ait-m p-2 [scrollbar-gutter:stable]'
                      : 'pointer-events-none flex gap-1 rounded-ait-pill p-1 opacity-0 group-hover/message:pointer-events-auto group-hover/message:opacity-100 group-focus-within/message:pointer-events-auto group-focus-within/message:opacity-100',
                    message.isSelf
                      ? 'study-reaction-picker--self right-0'
                      : 'study-reaction-picker--incoming left-0',
                  )}
                  role="group"
                  aria-label="메시지 반응 선택"
                >
                  {(expandedReactionPickerMessageId === message.id
                    ? composerEmojis
                    : messageReactionEmojis
                  ).map((reaction) => (
                    <button
                      key={reaction}
                      type="button"
                      onClick={() => reactToMessage(message.id, reaction)}
                      className="flex size-8 items-center justify-center rounded-ait-pill text-body-1 hover:bg-status-neutral-surface"
                      aria-label={`${reaction} 반응 남기기`}
                      aria-pressed={message.reaction === reaction}
                    >
                      {reaction}
                    </button>
                  ))}
                  <button
                    key="reaction-picker-toggle"
                    type="button"
                    onClick={() => {
                      const nextMessageId =
                        expandedReactionPickerMessageId === message.id
                          ? null
                          : message.id

                      setExpandedReactionPickerMessageId(nextMessageId)
                    }}
                    className="flex size-8 items-center justify-center rounded-ait-pill text-text-secondary hover:bg-status-neutral-surface hover:text-action-primary"
                    aria-label={
                      expandedReactionPickerMessageId === message.id
                        ? '자주 쓰는 이모지만 보기'
                        : '더 많은 이모지 보기'
                    }
                    aria-expanded={
                      expandedReactionPickerMessageId === message.id
                    }
                  >
                    {expandedReactionPickerMessageId === message.id ? (
                      <Minus className="size-4" aria-hidden="true" />
                    ) : (
                      <Plus className="size-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      <div className="relative flex shrink-0 items-end gap-2">
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

        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() =>
              setComposerPicker((currentPicker) =>
                currentPicker === 'emoji' ? null : 'emoji',
              )
            }
            className="flex size-10 items-center justify-center rounded-ait-s border border-border-default bg-surface-default text-text-secondary transition-colors hover:bg-status-neutral-surface hover:text-action-primary"
            aria-label="이모지 추가"
            aria-expanded={composerPicker === 'emoji'}
          >
            <SmilePlus className="size-5" aria-hidden="true" />
          </button>

          {composerPicker === 'emoji' ? (
            <div
              className="absolute bottom-12 right-0 z-10 grid max-h-64 w-64 grid-cols-6 gap-1 overflow-y-auto overscroll-contain rounded-ait-m border border-border-default bg-surface-default p-2 shadow-elevation-2 [scrollbar-gutter:stable]"
              role="group"
              aria-label="이모지 선택"
            >
              {composerEmojis.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => appendToDraft(emoji)}
                  className="flex size-9 items-center justify-center rounded-ait-s text-xl leading-none hover:bg-status-neutral-surface"
                  aria-label={`${emoji} 입력`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() =>
              setComposerPicker((currentPicker) =>
                currentPicker === 'emoticon' ? null : 'emoticon',
              )
            }
            className="flex size-10 items-center justify-center rounded-ait-s border border-border-default bg-surface-default text-text-secondary transition-colors hover:bg-status-neutral-surface hover:text-action-primary"
            aria-label="이모티콘 추가"
            aria-expanded={composerPicker === 'emoticon'}
          >
            <Sticker className="size-5" aria-hidden="true" />
          </button>

          {composerPicker === 'emoticon' ? (
            <div
              className="absolute bottom-12 right-0 z-10 flex w-44 flex-col gap-1 rounded-ait-m border border-border-default bg-surface-default p-2 shadow-elevation-2"
              role="group"
              aria-label="이모티콘 선택"
            >
              {composerEmoticons.map((emoticon) => (
                <button
                  key={emoticon}
                  type="button"
                  onClick={() => appendToDraft(emoticon, true)}
                  className="rounded-ait-s px-3 py-2 text-left text-body-2 hover:bg-status-neutral-surface"
                  aria-label={`${emoticon} 입력`}
                >
                  {emoticon}
                </button>
              ))}
            </div>
          ) : null}
        </div>

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
