import { AnimatePresence, motion } from 'framer-motion'
import { SmilePlus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { studyChatEmojis } from '@/components/study/studyChatEmojis'
import { EASE_OUT } from '@/lib/motion'
import { cn } from '@/lib/utils'

interface EmojiPopoverProps {
  onSelect: (emoji: string) => void
}

// 선택한 이모지를 콜백으로 넘기는 공용 팝오버 버튼.
export function EmojiPopover({ onSelect }: EmojiPopoverProps) {
  const [isOpen, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [isOpen])

  const select = (emoji: string) => {
    onSelect(emoji)
    setOpen(false)
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label="이모지"
        aria-expanded={isOpen}
        className={cn(
          'inline-flex size-8 items-center justify-center rounded-ait-s transition-colors duration-[120ms]',
          isOpen
            ? 'bg-surface-muted text-navy-800'
            : 'text-ink-500 hover:bg-surface-muted hover:text-ink-700',
        )}
      >
        <SmilePlus aria-hidden="true" className="size-4" />
      </button>

      <AnimatePresence>
        {isOpen ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1, transition: { duration: 0.16, ease: EASE_OUT } }}
            exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.12, ease: EASE_OUT } }}
            role="group"
            aria-label="이모지 선택"
            className="absolute left-0 top-[calc(100%+0.5rem)] z-[var(--z-index-dropdown)] max-h-64 w-72 origin-top-left overflow-y-auto overscroll-contain rounded-ait-s border border-line bg-surface-default p-2 shadow-elevation-2"
          >
            <div className="grid grid-cols-8 gap-1">
              {studyChatEmojis.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => select(emoji)}
                  className="flex size-8 items-center justify-center rounded-ait-s text-lg leading-none hover:bg-surface-muted"
                  aria-label={`${emoji} 입력`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
