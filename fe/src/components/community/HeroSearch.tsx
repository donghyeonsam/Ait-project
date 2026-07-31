import { AnimatePresence, motion } from 'framer-motion'
import { Search } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { fetchSearchSuggestions } from '@/api/community'
import { dropdownPanel } from '@/lib/motion'
import { cn } from '@/lib/utils'

interface HeroSearchProps {
  value: string
  onSearch: (query: string) => void
}

// 히어로 검색 입력. 2자 이상 입력하면 자동완성을 보여주고 ↑↓/Enter/Esc로 조작한다.
export function HeroSearch({ value, onSearch }: HeroSearchProps) {
  const [input, setInput] = useState(value)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [isOpen, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const rootRef = useRef<HTMLDivElement>(null)
  const listboxId = useId()

  // 인기 태그 클릭 등 바깥에서 검색어가 바뀌면 입력값을 동기화한다(렌더 중 파생 상태 보정).
  const [lastExternalValue, setLastExternalValue] = useState(value)
  if (value !== lastExternalValue) {
    setLastExternalValue(value)
    setInput(value)
  }

  useEffect(() => {
    let cancelled = false
    const keyword = input.trim()
    const timer = setTimeout(async () => {
      if (keyword.length < 2) {
        if (cancelled) return
        setSuggestions([])
        setOpen(false)
        return
      }
      const result = await fetchSearchSuggestions(keyword)
      if (cancelled) return
      setSuggestions(result)
      setOpen(result.length > 0)
      setActiveIndex(-1)
    }, 200)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [input])

  useEffect(() => {
    if (!isOpen) return
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [isOpen])

  const submit = (query: string) => {
    setOpen(false)
    setInput(query)
    onSearch(query)
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return
    if (event.key === 'Escape') {
      setOpen(false)
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      if (isOpen && activeIndex >= 0 && suggestions[activeIndex]) {
        submit(suggestions[activeIndex])
      } else {
        submit(input.trim())
      }
      return
    }
    if (!isOpen || suggestions.length === 0) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((index) => (index + 1) % suggestions.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((index) =>
        index <= 0 ? suggestions.length - 1 : index - 1,
      )
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <div className="flex items-center gap-3 rounded-ait-pill border border-line bg-surface-default px-5 py-3 transition-[border-color] duration-[180ms] focus-within:border-brand-blue focus-within:ring-2 focus-within:ring-brand-blue/15">
        <Search aria-hidden="true" className="size-4 shrink-0 text-ink-400" />
        <input
          type="search"
          role="combobox"
          aria-label="커뮤니티 검색"
          aria-expanded={isOpen}
          aria-controls={isOpen ? listboxId : undefined}
          aria-activedescendant={
            isOpen && activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined
          }
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="직무, 기업 또는 스터디 명을 검색해보세요."
          className="w-full border-0 bg-transparent text-body-2 text-ink-900 outline-none placeholder:text-ink-400 focus-visible:outline-none [&::-webkit-search-cancel-button]:hidden"
        />
      </div>

      <AnimatePresence>
        {isOpen ? (
          <motion.ul
            id={listboxId}
            role="listbox"
            aria-label="검색어 자동완성"
            variants={dropdownPanel}
            initial="initial"
            animate="animate"
            exit="exit"
            className="absolute inset-x-0 top-[calc(100%+0.375rem)] z-[var(--z-index-dropdown)] origin-top overflow-hidden rounded-ait-s border border-line bg-surface-default py-1 shadow-elevation-2"
          >
            {suggestions.map((suggestion, index) => (
              <li
                key={suggestion}
                id={`${listboxId}-${index}`}
                role="option"
                aria-selected={index === activeIndex}
                onPointerEnter={() => setActiveIndex(index)}
                onClick={() => submit(suggestion)}
                className={cn(
                  'flex cursor-pointer items-center gap-3 px-4 py-2 text-body-2 text-ink-700',
                  index === activeIndex && 'bg-surface-muted',
                )}
              >
                <Search aria-hidden="true" className="size-3.5 text-ink-400" />
                {suggestion}
              </li>
            ))}
          </motion.ul>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
