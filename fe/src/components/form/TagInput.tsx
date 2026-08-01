import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useId, useMemo, useState } from 'react'

const MAX_TAGS = 5
const MAX_TAG_LENGTH = 12

interface TagInputProps {
  tags: string[]
  onChange: (tags: string[]) => void
  suggestions?: readonly string[]
}

// Enter/쉼표로 칩을 만드는 태그 입력. 중복·개수·길이 제한과 추천 태그를 지원한다.
export function TagInput({ tags, onChange, suggestions = [] }: TagInputProps) {
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSuggestionOpen, setSuggestionOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const listboxId = useId()

  const filteredSuggestions = useMemo(() => {
    const keyword = input.trim().replace(/^#/, '').toLowerCase()
    if (!keyword) return []
    return suggestions
      .filter((tag) => tag.toLowerCase().includes(keyword) && !tags.includes(tag))
      .slice(0, 5)
  }, [input, suggestions, tags])

  const addTag = (raw: string) => {
    const tag = raw.replace(/^#+/, '').trim().slice(0, MAX_TAG_LENGTH)
    if (!tag) return
    if (tags.includes(tag)) {
      setError('이미 추가한 태그예요.')
      return
    }
    if (tags.length >= MAX_TAGS) {
      setError('태그는 최대 5개까지 추가할 수 있어요.')
      return
    }
    setError(null)
    onChange([...tags, tag])
    setInput('')
    setSuggestionOpen(false)
    setActiveIndex(-1)
  }

  const removeTag = (tag: string) => {
    setError(null)
    onChange(tags.filter((item) => item !== tag))
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return
    if (event.key === 'Escape') {
      setSuggestionOpen(false)
      setActiveIndex(-1)
      return
    }
    if (event.key === 'ArrowDown' && filteredSuggestions.length > 0) {
      event.preventDefault()
      setSuggestionOpen(true)
      setActiveIndex((index) => (index + 1) % filteredSuggestions.length)
      return
    }
    if (event.key === 'ArrowUp' && filteredSuggestions.length > 0) {
      event.preventDefault()
      setSuggestionOpen(true)
      setActiveIndex((index) =>
        index <= 0 ? filteredSuggestions.length - 1 : index - 1,
      )
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      const activeSuggestion =
        isSuggestionOpen && activeIndex >= 0
          ? filteredSuggestions[activeIndex]
          : null
      addTag(activeSuggestion ?? input)
      return
    }
    if (event.key === ',') {
      event.preventDefault()
      addTag(input)
      return
    }
    if (event.key === 'Backspace' && input === '' && tags.length > 0) {
      removeTag(tags[tags.length - 1])
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 rounded-ait-s border border-line bg-surface-default px-3 py-2 transition-colors duration-[180ms] focus-within:border-brand-blue focus-within:ring-2 focus-within:ring-brand-blue/15">
        <AnimatePresence initial={false}>
          {tags.map((tag) => (
            <motion.span
              key={tag}
              layout="position"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{
                scale: 1,
                opacity: 1,
                transition: { type: 'spring', stiffness: 500, damping: 30 },
              }}
              exit={{ scale: 0.8, opacity: 0, transition: { duration: 0.12 } }}
              className="inline-flex items-center gap-1 rounded-ait-pill bg-tag-chip-surface px-3 py-1 text-caption font-medium text-tag-chip"
            >
              #{tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                aria-label={`${tag} 태그 삭제`}
                className="rounded-ait-pill p-0.5 hover:bg-brand-blue/10"
              >
                <X aria-hidden="true" className="size-3" />
              </button>
            </motion.span>
          ))}
        </AnimatePresence>
        <input
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isSuggestionOpen && filteredSuggestions.length > 0}
          aria-controls={
            isSuggestionOpen && filteredSuggestions.length > 0
              ? listboxId
              : undefined
          }
          aria-activedescendant={
            isSuggestionOpen && activeIndex >= 0
              ? `${listboxId}-${activeIndex}`
              : undefined
          }
          value={input}
          onChange={(event) => {
            setInput(event.target.value)
            setError(null)
            setSuggestionOpen(true)
            setActiveIndex(-1)
          }}
          onFocus={() => {
            if (filteredSuggestions.length > 0) setSuggestionOpen(true)
          }}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? '태그를 입력하고 Enter를 눌러주세요.' : ''}
          aria-label="태그 입력"
          className="min-w-40 flex-1 border-0 bg-transparent py-1 text-body-2 text-ink-900 outline-none placeholder:text-ink-400 focus-visible:outline-none"
        />
      </div>

      <AnimatePresence>
        {error ? (
          <motion.p
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1, transition: { duration: 0.18 } }}
            exit={{ height: 0, opacity: 0, transition: { duration: 0.14 } }}
            className="overflow-hidden pt-1.5 text-caption text-danger"
          >
            {error}
          </motion.p>
        ) : null}
      </AnimatePresence>

      {isSuggestionOpen && filteredSuggestions.length > 0 ? (
        <div className="mt-2 flex items-start gap-1.5">
          <span className="pt-1 text-caption text-ink-400">추천 태그</span>
          <ul
            id={listboxId}
            role="listbox"
            aria-label="태그 자동완성"
            className="flex flex-wrap gap-1.5"
          >
            {filteredSuggestions.map((tag, index) => (
              <li
                key={tag}
                id={`${listboxId}-${index}`}
                role="option"
                aria-selected={index === activeIndex}
              >
                <button
                  type="button"
                  onPointerEnter={() => setActiveIndex(index)}
                  onPointerDown={(event) => event.preventDefault()}
                  onClick={() => addTag(tag)}
                  className={`rounded-ait-pill border px-2.5 py-0.5 text-caption transition-colors ${
                    index === activeIndex
                      ? 'border-brand-blue text-brand-blue'
                      : 'border-line text-ink-500 hover:border-brand-blue hover:text-brand-blue'
                  }`}
                >
                  #{tag}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
