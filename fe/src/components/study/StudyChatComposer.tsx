import { Send, SmilePlus, Sticker, X } from 'lucide-react'
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import { studyChatEmojis } from '@/components/study/studyChatEmojis'
import { Textarea } from '@/components/ui/textarea'
import {
  aitEmoticons,
  toEmoticonToken,
  type AitEmoticon,
} from '@/lib/emoticons'
import {
  toReplyToken,
  type StudyChatReplyTarget,
} from '@/lib/study-chat-reply'

interface StudyChatComposerProps {
  isConnected: boolean
  connectError: string | null
  onSend: (message: string) => boolean
  replyTarget?: StudyChatReplyTarget | null
  onCancelReply?: () => void
}

// 메시지 작성, 이모지·이모티콘 입력, 답장 대상 표시와 중복 전송 방지를 담당한다.
export function StudyChatComposer({
  isConnected,
  connectError,
  onSend,
  replyTarget,
  onCancelReply,
}: StudyChatComposerProps) {
  const [draft, setDraft] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [composerPicker, setComposerPicker] = useState<
    'emoji' | 'emoticon' | null
  >(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const pickerAreaRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    const contentHeight = textarea.scrollHeight
    textarea.style.height = `${Math.min(contentHeight, 112)}px`
    textarea.style.overflowY = contentHeight > 112 ? 'auto' : 'hidden'
  }, [draft])

  useEffect(() => {
    if (composerPicker === null) return

    const handlePointerDown = (event: PointerEvent) => {
      if (!pickerAreaRef.current?.contains(event.target as Node)) {
        setComposerPicker(null)
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [composerPicker])

  // 답장 대상을 고르면 바로 입력을 이어갈 수 있게 입력란에 포커스를 준다.
  useEffect(() => {
    if (replyTarget) textareaRef.current?.focus()
  }, [replyTarget])

  const sendMessage = () => {
    const content = draft.trim()
    if (!content || !isConnected || isSending) return

    setIsSending(true)
    const outgoing = replyTarget
      ? `${toReplyToken(replyTarget)}\n${content}`
      : content
    const didSend = onSend(outgoing)
    if (didSend) {
      setDraft('')
      setComposerPicker(null)
      onCancelReply?.()
    }
    requestAnimationFrame(() => setIsSending(false))
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Escape' && composerPicker !== null) {
      event.preventDefault()
      event.stopPropagation()
      setComposerPicker(null)
      return
    }
    if (event.key === 'Escape' && replyTarget) {
      event.preventDefault()
      event.stopPropagation()
      onCancelReply?.()
      return
    }
    if (
      event.key === 'Enter' &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault()
      sendMessage()
    }
  }

  const insertEmoji = (emoji: string) => {
    const textarea = textareaRef.current
    const selectionStart = textarea?.selectionStart ?? draft.length
    const selectionEnd = textarea?.selectionEnd ?? draft.length
    const nextDraft =
      draft.slice(0, selectionStart) + emoji + draft.slice(selectionEnd)
    setDraft(nextDraft)
    setComposerPicker(null)

    requestAnimationFrame(() => {
      textarea?.focus()
      const nextCursorPosition = selectionStart + emoji.length
      textarea?.setSelectionRange(nextCursorPosition, nextCursorPosition)
    })
  }

  const sendEmoticon = (emoticon: AitEmoticon) => {
    if (!isConnected || isSending) return

    setIsSending(true)
    const content = toEmoticonToken(emoticon)
    const outgoing = replyTarget
      ? `${toReplyToken(replyTarget)}\n${content}`
      : content
    const didSend = onSend(outgoing)
    if (didSend) {
      setDraft('')
      setComposerPicker(null)
      onCancelReply?.()
    }
    requestAnimationFrame(() => setIsSending(false))
  }

  return (
    <div className="shrink-0 border-t border-border-default bg-surface-default p-3 sm:p-4">
      <div className="relative rounded-ait-m border border-border-default bg-surface-default px-3 py-3 shadow-elevation-1 sm:px-4">
        {replyTarget ? (
          <div className="mb-2 flex items-start gap-2 rounded-ait-s border-l-2 border-action-primary bg-status-neutral-surface px-3 py-2">
            <div className="min-w-0 flex-1">
              <p className="text-caption font-semibold text-action-primary">
                {replyTarget.nickname}에게 답장
              </p>
              <p className="truncate text-caption text-text-secondary">
                {replyTarget.preview}
              </p>
            </div>
            <button
              type="button"
              onClick={onCancelReply}
              aria-label="답장 취소"
              className="flex size-6 shrink-0 items-center justify-center rounded-ait-pill text-text-secondary transition-colors hover:bg-surface-default hover:text-action-primary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-action-primary/25"
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          </div>
        ) : null}
        <div
          ref={pickerAreaRef}
          className="flex min-w-0 items-center gap-2 sm:gap-3"
        >
          <label className="min-w-0 flex-1">
            <span className="sr-only">메시지 입력</span>
            <Textarea
              ref={textareaRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder="메시지를 입력하세요"
              disabled={!isConnected}
              aria-describedby={
                connectError ? 'study-chat-composer-error' : undefined
              }
              className="study-chat-composer-input min-h-11 max-h-28 resize-none overflow-y-hidden border-border-default py-2.5 shadow-none"
            />
          </label>

          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() =>
                setComposerPicker((current) =>
                  current === 'emoji' ? null : 'emoji',
                )
              }
              aria-label="이모지 추가"
              aria-expanded={composerPicker === 'emoji'}
              className="flex size-9 shrink-0 items-center justify-center rounded-ait-s text-text-secondary transition-colors hover:bg-status-neutral-surface hover:text-action-primary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-action-primary/25"
            >
              <SmilePlus className="size-5" aria-hidden="true" />
            </button>
            {composerPicker === 'emoji' ? (
              <div
                role="dialog"
                aria-label="메시지 이모지 선택"
                className="study-chat-popover absolute bottom-12 right-0 z-(--z-index-dropdown) grid max-h-52 w-64 grid-cols-7 gap-1 overflow-y-auto rounded-ait-m border border-border-default bg-surface-default p-2 shadow-elevation-2"
              >
                {studyChatEmojis.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => insertEmoji(emoji)}
                    className="flex size-8 items-center justify-center rounded-ait-s text-lg hover:bg-status-neutral-surface focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-action-primary/25"
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
                setComposerPicker((current) =>
                  current === 'emoticon' ? null : 'emoticon',
                )
              }
              aria-label="이모티콘 추가"
              aria-expanded={composerPicker === 'emoticon'}
              className="flex size-9 shrink-0 items-center justify-center rounded-ait-s text-text-secondary transition-colors hover:bg-status-neutral-surface hover:text-action-primary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-action-primary/25"
            >
              <Sticker className="size-5" aria-hidden="true" />
            </button>
            {composerPicker === 'emoticon' ? (
              <div
                role="dialog"
                aria-label="메시지 이모티콘 선택"
                className="study-chat-popover absolute bottom-12 right-0 z-(--z-index-dropdown) grid max-h-64 w-64 grid-cols-4 gap-1 overflow-y-auto rounded-ait-m border border-border-default bg-surface-default p-2 shadow-elevation-2"
              >
                {aitEmoticons.map((emoticon) => (
                  <button
                    key={emoticon.id}
                    type="button"
                    onClick={() => sendEmoticon(emoticon)}
                    disabled={!isConnected || isSending}
                    className="flex aspect-square items-center justify-center rounded-ait-s p-1 hover:bg-status-neutral-surface disabled:opacity-50"
                    aria-label={`${emoticon.label} 이모티콘 전송`}
                  >
                    <img
                      src={emoticon.src}
                      alt=""
                      loading="lazy"
                      className="size-full object-contain"
                    />
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={sendMessage}
            disabled={!draft.trim() || !isConnected || isSending}
            className="flex size-11 shrink-0 items-center justify-center rounded-ait-s bg-action-primary text-surface-default transition-shadow hover:shadow-elevation-2 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-action-primary/25 disabled:bg-status-neutral-surface disabled:text-text-secondary"
            aria-label="메시지 전송"
          >
            <Send className="size-5" aria-hidden="true" />
          </button>
        </div>
        {connectError ? (
          <p
            id="study-chat-composer-error"
            role="alert"
            className="mt-2 text-center text-caption text-status-error"
          >
            {connectError}
          </p>
        ) : null}
      </div>
    </div>
  )
}
