import { Bookmark, ChevronRight, Eye, FileText, Heart } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  fetchMyActivityPosts,
  type MyPostActivity,
} from '@/api/community'
import { toErrorMessage } from '@/api/http'
import { CategoryBadge } from '@/components/community/badges'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatNumber } from '@/lib/format'
import type { CommunityPost } from '@/types/community'

type ActivityTabId = MyPostActivity

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

// 마이페이지에서 사용자의 작성·저장·좋아요 게시글을 탭별로 조회해 보여준다.
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
      <h2 id="activity-title" className="text-h2 text-action-primary">
        나의 활동
      </h2>

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

// 조회 단계를 하나의 상태로 관리해 로딩·에러·목록 화면을 전환한다.
type ActivityPanelState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'loaded'; posts: CommunityPost[] }

function ActivityTabPanel({ tab }: { tab: ActivityTabConfig }) {
  const [state, setState] = useState<ActivityPanelState>({ status: 'loading' })
  const [requestKey, setRequestKey] = useState(0)

  useEffect(() => {
    let cancelled = false

    fetchMyActivityPosts(tab.id)
      .then((result) => {
        if (!cancelled) setState({ status: 'loaded', posts: result.items })
      })
      .catch((requestError: unknown) => {
        if (!cancelled) {
          setState({ status: 'error', message: toErrorMessage(requestError) })
        }
      })

    return () => {
      cancelled = true
    }
  }, [requestKey, tab.id])

  if (state.status === 'loading') {
    return (
      <div className="space-y-3 py-6" role="status" aria-label={`${tab.label} 불러오는 중`}>
        {Array.from({ length: 3 }, (_, index) => (
          <div
            key={index}
            className="flex items-center gap-3 rounded-ait-s bg-status-neutral-surface p-4"
          >
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-full" />
            </div>
            <Skeleton className="h-4 w-16 shrink-0" />
          </div>
        ))}
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="flex h-72 flex-col items-center justify-center gap-3 text-center" role="alert">
        <tab.icon className="size-8 text-status-error" aria-hidden="true" />
        <p className="text-body-2 text-status-error">{state.message}</p>
        <Button
          type="button"
          variant="secondary"
          className="mt-1"
          onClick={() => {
            setState({ status: 'loading' })
            setRequestKey((key) => key + 1)
          }}
        >
          다시 시도
        </Button>
      </div>
    )
  }

  const { posts } = state

  if (posts.length === 0) {
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

  return (
    <ul className="divide-y divide-border-default py-2">
      {posts.map((post) => (
        <li key={post.id}>
          <Link
            to={`/community/posts/${post.id}`}
            className="activity-item flex items-center gap-4 rounded-ait-s px-4 py-4"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <CategoryBadge category={post.category} />
              </div>
              <p className="mt-2 truncate text-body-1 font-semibold text-text-primary">
                {post.title}
              </p>
              <p className="mt-1 truncate text-body-2 text-text-secondary">
                {post.excerpt || '내용 미리보기가 없습니다.'}
              </p>
            </div>
            <div className="hidden shrink-0 items-center gap-3 text-caption text-text-secondary sm:flex">
              <span className="inline-flex items-center gap-1">
                <Eye className="size-3.5" aria-hidden="true" />
                {formatNumber(post.viewCount)}
              </span>
              <span className="inline-flex items-center gap-1">
                <Heart className="size-3.5" aria-hidden="true" />
                {formatNumber(post.likeCount)}
              </span>
              <ChevronRight className="size-4" aria-hidden="true" />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  )
}
