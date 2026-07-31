import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { dropdownPanel } from '@/lib/motion'
import { cn } from '@/lib/utils'

export interface DropdownOption<T extends string = string> {
  value: T
  label: string
}

interface DropdownProps<T extends string> {
  options: DropdownOption<T>[]
  value: T | null
  onChange: (value: T) => void
  ariaLabel: string
  placeholder?: string
  className?: string
  buttonClassName?: string
  invalid?: boolean
  /** 트리거가 화면/컨테이너 하단에 가까워 아래로 펼치면 잘리는 경우, 위로 펼치도록 전환한다. */
  openUpward?: boolean
}

// 네이티브 select 대신 쓰는 커스텀 드롭다운. 키보드 조작과 listbox ARIA 패턴을 지원한다.
export function Dropdown<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  placeholder = '선택',
  className,
  buttonClassName,
  invalid = false,
  openUpward = false,
}: DropdownProps<T>) {
  const [isOpen, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const rootRef = useRef<HTMLDivElement>(null)
  const listboxId = useId()

  const selected = options.find((option) => option.value === value) ?? null

  useEffect(() => {
    if (!isOpen) return
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [isOpen])

  const openList = () => {
    setActiveIndex(Math.max(0, options.findIndex((o) => o.value === value)))
    setOpen(true)
  }

  const select = (option: DropdownOption<T>) => {
    onChange(option.value)
    setOpen(false)
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!isOpen) {
      if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(event.key)) {
        event.preventDefault()
        openList()
      }
      return
    }
    switch (event.key) {
      case 'Escape':
        event.preventDefault()
        setOpen(false)
        break
      case 'ArrowDown':
        event.preventDefault()
        setActiveIndex((index) => Math.min(options.length - 1, index + 1))
        break
      case 'ArrowUp':
        event.preventDefault()
        setActiveIndex((index) => Math.max(0, index - 1))
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        if (options[activeIndex]) select(options[activeIndex])
        break
      case 'Tab':
        setOpen(false)
        break
    }
  }

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listboxId : undefined}
        aria-activedescendant={
          isOpen && activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined
        }
        onClick={() => (isOpen ? setOpen(false) : openList())}
        onKeyDown={handleKeyDown}
        className={cn(
          'flex w-full items-center justify-between gap-2 rounded-ait-s border bg-surface-default px-4 py-2.5 text-body-2 transition-colors [transition-duration:var(--duration-fast)]',
          invalid ? 'border-danger' : 'border-line hover:border-ink-400',
          selected ? 'text-ink-900' : 'text-ink-400',
          buttonClassName,
        )}
      >
        <span className="truncate">{selected?.label ?? placeholder}</span>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            'size-4 shrink-0 text-ink-500 transition-transform duration-[180ms]',
            isOpen && 'rotate-180',
          )}
        />
      </button>

      <AnimatePresence>
        {isOpen ? (
          <motion.ul
            id={listboxId}
            role="listbox"
            aria-label={ariaLabel}
            variants={dropdownPanel}
            initial="initial"
            animate="animate"
            exit="exit"
            className={cn(
              'absolute left-0 z-(--z-index-dropdown) min-w-full overflow-hidden rounded-ait-s border border-line bg-surface-default py-1 shadow-elevation-2',
              openUpward ? 'bottom-[calc(100%+0.375rem)] origin-bottom' : 'top-[calc(100%+0.375rem)] origin-top',
            )}
          >
            {options.map((option, index) => (
              <li
                key={option.value}
                id={`${listboxId}-${index}`}
                role="option"
                aria-selected={option.value === value}
                onPointerEnter={() => setActiveIndex(index)}
                onClick={() => select(option)}
                className={cn(
                  'flex cursor-pointer items-center justify-between gap-3 whitespace-nowrap px-4 py-2 text-body-2 text-ink-700',
                  index === activeIndex && 'bg-surface-muted',
                )}
              >
                {option.label}
                {option.value === value ? (
                  <Check aria-hidden="true" className="size-4 text-navy-800" />
                ) : null}
              </li>
            ))}
          </motion.ul>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
