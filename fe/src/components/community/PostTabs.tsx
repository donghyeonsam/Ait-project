import { motion } from 'framer-motion'
import { tabSpring } from '@/lib/motion'
import { cn } from '@/lib/utils'
import type { CommunityTab } from '@/types/community'

const TABS: { value: CommunityTab; label: string }[] = [
  { value: 'recommend', label: '추천' },
  { value: 'latest', label: '최신' },
  { value: 'popular', label: '인기' },
  { value: 'mine', label: '내 게시글' },
]

interface PostTabsProps {
  value: CommunityTab
  onChange: (tab: CommunityTab) => void
}

// 추천/최신/인기/내 게시글 탭. 활성 인디케이터가 layoutId로 좌우 슬라이드한다.
export function PostTabs({ value, onChange }: PostTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="게시글 목록 탭"
      className="flex items-center gap-2 border-b border-line"
    >
      {TABS.map((tab) => {
        const isActive = tab.value === value
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.value)}
            className={cn(
              'relative px-6 pb-3 pt-2 text-body-1 transition-colors [transition-duration:var(--duration-fast)]',
              isActive
                ? 'font-semibold text-navy-900'
                : 'text-ink-500 hover:text-ink-700',
            )}
          >
            {tab.label}
            {isActive ? (
              <motion.span
                layoutId="tab-indicator"
                transition={tabSpring}
                className="absolute inset-x-2 -bottom-px h-0.5 bg-navy-900"
                aria-hidden="true"
              />
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
