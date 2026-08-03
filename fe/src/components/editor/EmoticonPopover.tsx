import type { Editor } from '@tiptap/react'
import { AnimatePresence, motion } from 'framer-motion'
import { Sticker } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { aitEmoticons, type AitEmoticon } from '@/lib/emoticons'
import { EASE_OUT } from '@/lib/motion'
import { cn } from '@/lib/utils'

interface EmoticonPopoverProps {
  editor: Editor
}

// 커서 위치에 Ait 캐릭터 이모티콘을 본문 이미지로 넣는 팝오버.
export function EmoticonPopover({ editor }: EmoticonPopoverProps) {
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

  const insertEmoticon = (emoticon: AitEmoticon) => {
    // 원본 PNG가 크므로 본문에서는 이모티콘 크기로 줄여 넣는다. 이후 크기 조절이 가능하다.
    editor
      .chain()
      .focus()
      .insertContent({
        type: 'image',
        attrs: {
          src: emoticon.src,
          alt: `${emoticon.label} 이모티콘`,
          width: '120px',
        },
      })
      .run()
    setOpen(false)
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label="이모티콘"
        aria-expanded={isOpen}
        className={cn(
          'inline-flex size-8 items-center justify-center rounded-ait-s transition-colors duration-[120ms]',
          isOpen
            ? 'bg-surface-muted text-navy-800'
            : 'text-ink-500 hover:bg-surface-muted hover:text-ink-700',
        )}
      >
        <Sticker aria-hidden="true" className="size-4" />
      </button>

      <AnimatePresence>
        {isOpen ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1, transition: { duration: 0.16, ease: EASE_OUT } }}
            exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.12, ease: EASE_OUT } }}
            role="group"
            aria-label="이모티콘 선택"
            className="absolute left-0 top-[calc(100%+0.5rem)] z-[var(--z-index-dropdown)] max-h-72 w-72 origin-top-left overflow-y-auto overscroll-contain rounded-ait-s border border-line bg-surface-default p-2 shadow-elevation-2"
          >
            <div className="grid grid-cols-4 gap-1">
              {aitEmoticons.map((emoticon) => (
                <button
                  key={emoticon.id}
                  type="button"
                  onClick={() => insertEmoticon(emoticon)}
                  className="flex aspect-square items-center justify-center rounded-ait-s p-1 hover:bg-surface-muted"
                  aria-label={`${emoticon.label} 이모티콘 삽입`}
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
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
