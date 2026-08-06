import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useId, useState } from 'react'
import { EASE_OUT, tickerItem } from '@/lib/motion'
import { cn } from '@/lib/utils'
import type { TrendingKeyword } from '@/types/community'

const ROTATE_INTERVAL_MS = 3000

interface TrendingKeywordTickerProps {
  keywords: TrendingKeyword[]
  onSelect: (keyword: string) => void
}

// 인기 태그 한 줄이 아래→위로 밀려 올라가며 3초마다 교체되는 롤링 pill.
// 마우스를 올리거나 포커스하면 롤링을 멈추고 전체 인기 태그 목록을 펼쳐 보여주며,
// 롤링 pill이나 목록 항목을 클릭하면 해당 태그로 검색한다.
export function TrendingKeywordTicker({
  keywords,
  onSelect,
}: TrendingKeywordTickerProps) {
  const [index, setIndex] = useState(0)
  const [isExpanded, setExpanded] = useState(false)
  const listboxId = useId()

  useEffect(() => {
    if (isExpanded || keywords.length <= 1) return
    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % keywords.length)
    }, ROTATE_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [isExpanded, keywords.length])

  // 데이터가 늦게 도착해도 Hero 왼쪽 열의 높이가 바뀌지 않도록 태그 행 공간을 유지한다.
  if (keywords.length === 0) return <div className="h-9" aria-hidden="true" />
  // 펼친 상태에서는 롤링을 멈추고 항상 1위부터 보여준다. pill이 1위 행을 맡고
  // 목록은 2위부터 이어 붙어 같은 태그가 두 번 나오지 않게 한다.
  const displayed = isExpanded ? keywords[0] : keywords[index]
  const rest = keywords.slice(1)

  const select = (keyword: string) => {
    setExpanded(false)
    onSelect(keyword)
  }

  // 목록 밖으로 포커스가 옮겨갈 때만 펼침을 닫는다(항목 간 Tab 이동에는 유지).
  const handleBlur = (event: React.FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node)) {
      setExpanded(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      <span className="shrink-0 text-body-2 font-semibold text-ink-700">
        인기 태그
      </span>
      <div
        className="relative min-w-0 flex-1"
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        onFocus={() => setExpanded(true)}
        onBlur={handleBlur}
      >
        <button
          type="button"
          onClick={() => select(displayed.keyword)}
          aria-label={`인기 태그 ${displayed.rank}위 ${displayed.keyword}로 검색`}
          aria-haspopup="listbox"
          aria-expanded={isExpanded}
          aria-controls={listboxId}
          className={cn(
            'relative z-[var(--z-index-dropdown)] h-9 w-full min-w-0 overflow-hidden border border-line bg-surface-default text-left transition-[border-radius,box-shadow] duration-150 [transition-timing-function:var(--easing-standard)] hover:border-ink-400',
            isExpanded ? 'rounded-t-ait-m shadow-elevation-2' : 'rounded-ait-pill',
          )}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={`${displayed.rank}-${displayed.keyword}`}
              variants={tickerItem}
              initial="initial"
              animate="animate"
              exit="exit"
              className="absolute inset-0 flex items-center gap-3 px-4"
            >
              <span className="w-4 shrink-0 text-center text-body-2 font-semibold text-ink-900 tabular-nums">
                {displayed.rank}
              </span>
              <span className="flex-1 truncate text-body-2 text-ink-700">
                {displayed.keyword}
              </span>
              <KeywordChange change={displayed.change} />
            </motion.span>
          </AnimatePresence>
        </button>

        {/* 2위 이하 목록. pill(1위) 바로 아래에 테두리를 겹쳐 붙여 하나의 카드처럼 이어지게 한다. */}
        <AnimatePresence initial={false}>
          {isExpanded && rest.length > 0 ? (
            <motion.ul
              id={listboxId}
              role="listbox"
              aria-label="전체 인기 태그"
              initial={{ height: 0, opacity: 0 }}
              animate={{
                height: 'auto',
                opacity: 1,
                transition: { duration: 0.18, ease: EASE_OUT },
              }}
              exit={{
                height: 0,
                opacity: 0,
                transition: { duration: 0.14, ease: EASE_OUT },
              }}
              className="absolute inset-x-0 top-full z-[var(--z-index-dropdown)] -mt-px overflow-hidden rounded-b-ait-m border border-t-0 border-line bg-surface-default py-1 shadow-elevation-2"
            >
              {rest.map((item) => (
                <li key={item.rank} role="presentation">
                  <button
                    type="button"
                    role="option"
                    onClick={() => select(item.keyword)}
                    className="flex w-full items-center gap-3 px-4 py-2 text-left text-body-2 text-ink-700 transition-colors hover:bg-surface-muted"
                  >
                    <span className="w-4 shrink-0 text-center font-semibold text-ink-900 tabular-nums">
                      {item.rank}
                    </span>
                    <span className="flex-1 truncate">{item.keyword}</span>
                    <KeywordChange change={item.change} />
                  </button>
                </li>
              ))}
            </motion.ul>
          ) : null}
        </AnimatePresence>
      </div>
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
