import type { Editor } from '@tiptap/react'
import { AnimatePresence, motion } from 'framer-motion'
import { Link2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { EASE_OUT } from '@/lib/motion'
import { cn } from '@/lib/utils'

interface LinkPopoverProps {
  editor: Editor
  isActive: boolean
}

// 선택 영역에 링크를 넣는 팝오버. URL 유효성 검사와 링크 제거를 지원한다.
export function LinkPopover({ editor, isActive }: LinkPopoverProps) {
  const [isOpen, setOpen] = useState(false)
  const [url, setUrl] = useState('')
  const [error, setError] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [isOpen])

  const open = () => {
    setUrl((editor.getAttributes('link').href as string | undefined) ?? '')
    setError(false)
    setOpen(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const apply = () => {
    const raw = url.trim()
    if (!raw) {
      setError(true)
      return
    }
    const href = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
    try {
      new URL(href)
    } catch {
      setError(true)
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href }).run()
    setOpen(false)
  }

  const remove = () => {
    editor.chain().focus().extendMarkRange('link').unsetLink().run()
    setOpen(false)
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => (isOpen ? setOpen(false) : open())}
        aria-label="링크"
        aria-expanded={isOpen}
        className={cn(
          'inline-flex size-8 items-center justify-center rounded-ait-s transition-colors duration-[120ms]',
          isActive || isOpen
            ? 'bg-surface-muted text-navy-800'
            : 'text-ink-500 hover:bg-surface-muted hover:text-ink-700',
        )}
      >
        <Link2 aria-hidden="true" className="size-4" />
      </button>

      <AnimatePresence>
        {isOpen ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1, transition: { duration: 0.16, ease: EASE_OUT } }}
            exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.12, ease: EASE_OUT } }}
            className="absolute left-0 top-[calc(100%+0.5rem)] z-[var(--z-index-dropdown)] w-72 origin-top-left rounded-ait-s border border-line bg-surface-default p-3 shadow-elevation-2"
          >
            <label className="text-caption font-medium text-ink-700" htmlFor="editor-link-url">
              링크 URL
            </label>
            <input
              ref={inputRef}
              id="editor-link-url"
              type="url"
              value={url}
              onChange={(event) => {
                setUrl(event.target.value)
                setError(false)
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  apply()
                }
                if (event.key === 'Escape') setOpen(false)
              }}
              placeholder="https://example.com"
              className={cn(
                'mt-1.5 w-full rounded-ait-s border px-3 py-2 text-body-2 text-ink-900 outline-none transition-colors placeholder:text-ink-400',
                error ? 'border-danger' : 'border-line focus:border-brand-blue',
              )}
            />
            {error ? (
              <p className="mt-1 text-caption text-danger">올바른 URL을 입력해주세요.</p>
            ) : null}
            <div className="mt-2.5 flex items-center justify-between">
              <button
                type="button"
                onClick={remove}
                className="text-caption text-ink-500 transition-colors hover:text-danger"
              >
                링크 제거
              </button>
              <button
                type="button"
                onClick={apply}
                className="rounded-ait-s bg-navy-900 px-3 py-1.5 text-caption font-semibold text-surface-default transition-[filter] hover:brightness-[.92]"
              >
                적용
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
