import { Bookmark, FileText, Heart } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

type ActivityTabId = 'written' | 'scrapped' | 'liked'

interface ActivityTabConfig {
  id: ActivityTabId
  label: string
  icon: typeof FileText
  emptyMessage: string
  ctaLabel: string
  ctaTo: string
}

const activityTabs: ActivityTabConfig[] = [
  {
    id: 'written',
    label: '작성한 게시글',
    icon: FileText,
    emptyMessage: '아직 작성한 게시글이 없어요.',
    ctaLabel: '글쓰기',
    ctaTo: '/community/write',
  },
  {
    id: 'scrapped',
    label: '저장한 게시글',
    icon: Bookmark,
    emptyMessage: '아직 저장한 게시글이 없어요.',
    ctaLabel: '커뮤니티 둘러보기',
    ctaTo: '/community',
  },
  {
    id: 'liked',
    label: '좋아요한 게시글',
    icon: Heart,
    emptyMessage: '아직 좋아요한 게시글이 없어요.',
    ctaLabel: '커뮤니티 둘러보기',
    ctaTo: '/community',
  },
]

// 마이페이지의 활동 탭(작성/저장/좋아요). 탭을 전환할 때마다 목록을 다시 불러오는 로딩 상태를 보여준다.
export function ActivityTabs() {
  const [activeTab, setActiveTab] = useState<ActivityTabId>('written')
  const activeIndex = activityTabs.findIndex((tab) => tab.id === activeTab)
  const current = activityTabs[activeIndex]

  return (
    <section
      className="mypage-panel mypage-enter"
      style={{ '--section-order': 2 } as React.CSSProperties}
      aria-labelledby="activity-title"
    >
      <h2 id="activity-title" className="text-h2 text-action-primary">나의 활동</h2>

      <div className="relative mt-4 border-b border-border-default">
        <div className="grid grid-cols-3" role="tablist" aria-label="나의 활동 목록">
          {activityTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls="activity-tab-panel"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-t-ait-s px-2 py-3 text-body-2 transition-colors duration-(--duration-fast) [transition-timing-function:var(--easing-standard)] ${
                activeTab === tab.id
                  ? 'font-semibold text-action-primary'
                  : 'text-text-secondary hover:bg-status-neutral-surface hover:text-action-primary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <span
          className="activity-tab-indicator absolute bottom-0 left-0 h-0.5 w-1/3 bg-action-primary"
          style={{ transform: `translateX(${activeIndex * 100}%)` }}
          aria-hidden="true"
        />
      </div>

      <div id="activity-tab-panel" role="tabpanel" className="activity-tab-panel min-h-72">
        <ActivityTabPanel key={activeTab} tab={current} />
      </div>
    </section>
  )
}

// TODO: 실제 API 연동 필요 - 활동 목록 API가 아직 없어 탭을 전환하면 잠시 로딩한 뒤 항상 빈 상태를 보여준다.
function ActivityTabPanel({ tab }: { tab: ActivityTabConfig }) {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500)
    return () => clearTimeout(timer)
  }, [])

  if (isLoading) {
    return (
      <div className="space-y-3 py-6" role="status" aria-label={`${tab.label} 불러오는 중`}>
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="flex items-center gap-3 rounded-ait-s bg-status-neutral-surface p-3">
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-16 shrink-0" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex h-72 flex-col items-center justify-center gap-3 text-center">
      <tab.icon className="size-8 text-text-secondary" aria-hidden="true" />
      <p className="text-body-2 text-text-secondary">{tab.emptyMessage}</p>
      <Button asChild variant="secondary" className="mt-1">
        <Link to={tab.ctaTo}>{tab.ctaLabel}</Link>
      </Button>
    </div>
  )
}
