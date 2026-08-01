import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { tickerItem } from '@/lib/motion'
import { cn } from '@/lib/utils'
import type { TrendingKeyword } from '@/types/community'

const ROTATE_INTERVAL_MS = 3000

interface TrendingKeywordTickerProps {
  keywords: TrendingKeyword[]
  onSelect: (keyword: string) => void
}

// 인기 태그 한 줄이 아래→위로 밀려 올라가며 3초마다 교체되는 롤링 pill.
// hover·focus 중에는 롤링을 멈추고, 클릭하면 해당 태그로 검색한다.
export function TrendingKeywordTicker({
  keywords,
  onSelect,
}: TrendingKeywordTickerProps) {
  const [index, setIndex] = useState(0)
  const [isPaused, setPaused] = useState(false)

  useEffect(() => {
    if (isPaused || keywords.length <= 1) return
    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % keywords.length)
    }, ROTATE_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [isPaused, keywords.length])

  if (keywords.length === 0) return null
  const current = keywords[index]

  return (
    <div className="flex items-center gap-3">
      <span className="shrink-0 text-body-2 font-semibold text-ink-700">
        인기 태그
      </span>
      <button
        type="button"
        onClick={() => onSelect(current.keyword)}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
        aria-label={`인기 태그 ${current.rank}위 ${current.keyword}로 검색`}
        className="relative h-9 min-w-0 flex-1 overflow-hidden rounded-ait-pill border border-line bg-surface-default text-left transition-colors hover:border-ink-400"
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={`${current.rank}-${current.keyword}`}
            variants={tickerItem}
            initial="initial"
            animate="animate"
            exit="exit"
            className="absolute inset-0 flex items-center gap-3 px-4"
          >
            <span className="w-4 shrink-0 text-center text-body-2 font-semibold text-ink-900 tabular-nums">
              {current.rank}
            </span>
            <span className="flex-1 truncate text-body-2 text-ink-700">
              {current.keyword}
            </span>
            <KeywordChange change={current.change} />
          </motion.span>
        </AnimatePresence>
      </button>
    </div>
  )
}

function KeywordChange({ change }: { change: TrendingKeyword['change'] }) {
  if (change === undefined) return null

  if (change === 'new') {
    return (
      <span className="shrink-0 rounded-ait-pill bg-badge-review-surface px-1.5 py-0.5 text-[10px] font-bold text-badge-review">
        NEW
      </span>
    )
  }
  const isUp = change > 0
  const isSame = change === 0
  return (
    <span
      className={cn(
        'shrink-0 text-caption font-semibold tabular-nums',
        isSame ? 'text-ink-400' : isUp ? 'text-danger' : 'text-brand-blue',
      )}
      aria-label={isSame ? '변동 없음' : `${Math.abs(change)}단계 ${isUp ? '상승' : '하락'}`}
    >
      {isSame ? '−' : `${isUp ? '▲' : '▼'} ${Math.abs(change)}`}
    </span>
  )
}
