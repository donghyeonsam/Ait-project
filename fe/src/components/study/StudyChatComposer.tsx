import { Paperclip, Send, Smile } from 'lucide-react'
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import { studyChatEmojis } from '@/components/study/studyChatEmojis'
import { Textarea } from '@/components/ui/textarea'

interface StudyChatComposerProps {
  isConnected: boolean
  connectError: string | null
  onSend: (message: string) => boolean
}

// 메시지 작성, 줄바꿈, 이모지 삽입과 중복 전송 방지를 담당한다.
export function StudyChatComposer({
  isConnected,
  connectError,
  onSend,
}: StudyChatComposerProps) {
  const [draft, setDraft] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isEmojiOpen, setIsEmojiOpen] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const emojiAreaRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    const contentHeight = textarea.scrollHeight
    textarea.style.height = `${Math.min(contentHeight, 112)}px`
    textarea.style.overflowY = contentHeight > 112 ? 'auto' : 'hidden'
  }, [draft])

  useEffect(() => {
    if (!isEmojiOpen) return

    const handlePointerDown = (event: PointerEvent) => {
      if (!emojiAreaRef.current?.contains(event.target as Node)) {
        setIsEmojiOpen(false)
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [isEmojiOpen])

  const sendMessage = () => {
    const content = draft.trim()
    if (!content || !isConnected || isSending) return

    setIsSending(true)
    const didSend = onSend(content)
    if (didSend) {
      setDraft('')
      setIsEmojiOpen(false)
    }
    requestAnimationFrame(() => setIsSending(false))
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Escape' && isEmojiOpen) {
      event.preventDefault()
      event.stopPropagation()
      setIsEmojiOpen(false)
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
    setIsEmojiOpen(false)

    requestAnimationFrame(() => {
      textarea?.focus()
      const nextCursorPosition = selectionStart + emoji.length
      textarea?.setSelectionRange(nextCursorPosition, nextCursorPosition)
    })
  }

  return (
    <div className="shrink-0 border-t border-border-default bg-surface-default p-3 sm:p-4">
      <div className="relative rounded-ait-m border border-border-default bg-surface-default px-3 py-3 shadow-elevation-1 sm:px-4">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          {/* TODO: 실제 API 연동 필요 - 파일 업로드 API가 추가되면 첨부 버튼을 활성화한다. */}
          <button
            type="button"
            disabled
            aria-label="파일 첨부"
            title="파일 첨부 기능은 준비 중입니다."
            className="flex size-9 shrink-0 items-center justify-center rounded-ait-s text-text-secondary disabled:cursor-not-allowed disabled:opacity-55"
          >
            <Paperclip className="size-6" aria-hidden="true" />
          </button>

          <div ref={emojiAreaRef} className="relative">
            <button
              type="button"
              onClick={() => setIsEmojiOpen((current) => !current)}
              aria-label="이모지 선택"
              aria-expanded={isEmojiOpen}
              className="flex size-9 shrink-0 items-center justify-center rounded-ait-s text-text-secondary transition-colors hover:bg-status-neutral-surface hover:text-action-primary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-action-primary/25"
            >
              <Smile className="size-6" aria-hidden="true" />
            </button>
            {isEmojiOpen ? (
              <div
                role="dialog"
                aria-label="메시지 이모지 선택"
                className="study-chat-popover absolute bottom-12 left-0 z-(--z-index-dropdown) grid max-h-52 w-64 grid-cols-7 gap-1 overflow-y-auto rounded-ait-m border border-border-default bg-surface-default p-2 shadow-elevation-2"
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
              aria-describedby="study-chat-composer-help"
              className="study-chat-composer-input min-h-11 max-h-28 resize-none overflow-y-hidden border-border-default py-2.5 shadow-none"
            />
          </label>

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
        <p
          id="study-chat-composer-help"
          className="mt-2 text-center text-caption text-text-secondary"
        >
          {connectError ??
            (isConnected
              ? 'Enter 전송 · Shift+Enter 줄바꿈'
              : '그룹톡에 연결하는 중입니다.')}
        </p>
      </div>
    </div>
  )
}
