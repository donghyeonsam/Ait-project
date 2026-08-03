import { Loader2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { EmojiPopover } from '@/components/common/EmojiPopover'
import { EmoticonPopover } from '@/components/common/EmoticonPopover'
import { toEmoticonToken } from '@/lib/emoticons'
import { cn } from '@/lib/utils'

const MAX_LENGTH = 500

interface CommentComposerProps {
  onSubmit: (content: string) => Promise<void> | void
  placeholder?: string
  initialValue?: string
  autoFocus?: boolean
  submitLabel?: string
  compact?: boolean
}

// 댓글·답글 입력창. 글자수 카운터, 이모지·이모티콘 삽입, Cmd/Ctrl+Enter 전송을 지원한다.
export function CommentComposer({
  onSubmit,
  placeholder = '의견이나 경험을 나눠보세요.',
  initialValue = '',
  autoFocus = false,
  submitLabel = '댓글 등록',
  compact = false,
}: CommentComposerProps) {
  const [content, setContent] = useState(initialValue)
  const [isSubmitting, setSubmitting] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!autoFocus) return
    const input = inputRef.current
    if (!input) return
    input.focus()
    input.setSelectionRange(input.value.length, input.value.length)
  }, [autoFocus])

  const submit = async () => {
    const trimmed = content.trim()
    if (!trimmed || isSubmitting) return
    setSubmitting(true)
    try {
      await onSubmit(trimmed)
      setContent('')
    } catch {
      // 실패 시 입력 내용을 유지해 바로 다시 시도할 수 있게 한다.
    } finally {
      setSubmitting(false)
    }
  }

  // 커서 위치(선택 영역)에 텍스트를 넣고, 삽입 후에도 커서가 그 뒤에 오도록 유지한다.
  const insertAtCursor = (text: string) => {
    const input = inputRef.current
    const start = input?.selectionStart ?? content.length
    const end = input?.selectionEnd ?? content.length
    const next = content.slice(0, start) + text + content.slice(end)
    if (next.length > MAX_LENGTH) return
    setContent(next)
    requestAnimationFrame(() => {
      const caret = start + text.length
      input?.focus()
      input?.setSelectionRange(caret, caret)
    })
  }

  return (
    <div className="flex items-start gap-3">
      <div
        className={cn(
          'relative flex-1 rounded-ait-s border border-line bg-surface-default transition-[border-color] duration-[180ms] focus-within:border-brand-blue focus-within:ring-2 focus-within:ring-brand-blue/15',
        )}
      >
        <textarea
          ref={inputRef}
          rows={compact ? 1 : 2}
          value={content}
          maxLength={MAX_LENGTH}
          onChange={(event) => setContent(event.target.value)}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
              event.preventDefault()
              void submit()
            }
          }}
          placeholder={placeholder}
          aria-label={submitLabel}
          className="w-full resize-none border-0 bg-transparent px-4 pb-1 pt-3 text-body-2 text-ink-900 outline-none placeholder:text-ink-400 focus-visible:outline-none"
        />
        <div className="flex items-center justify-between gap-2 px-2 pb-1.5">
          <div className="flex items-center gap-0.5">
            <EmojiPopover onSelect={insertAtCursor} />
            <EmoticonPopover
              onSelect={(emoticon) => insertAtCursor(toEmoticonToken(emoticon))}
            />
          </div>
          <span className="pointer-events-none pr-1 text-caption text-ink-400 tabular-nums">
            {content.length} / {MAX_LENGTH}
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={() => void submit()}
        disabled={isSubmitting || content.trim().length === 0}
        className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-ait-s bg-navy-900 px-5 text-body-2 font-semibold text-surface-default transition-[filter] duration-150 hover:brightness-[.92] disabled:bg-line disabled:text-ink-400"
      >
        {isSubmitting ? (
          <Loader2 aria-hidden="true" className="size-4 animate-spin" />
        ) : null}
        {submitLabel}
      </button>
    </div>
  )
}
