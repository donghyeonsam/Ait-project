import { Heart, MessageCircle } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAnimatedNumber } from '@/components/dashboard/useAnimatedNumber'
import {
  activityPosts,
  activityTabs,
  type ActivityPost,
  type ActivityTabId,
} from '@/mocks/mypage'

function motionDuration(token: string) {
  return Number.parseFloat(
    window.getComputedStyle(document.documentElement).getPropertyValue(token),
  )
}

function AnimatedMetric({ value }: { value: number }) {
  const animatedValue = useAnimatedNumber(
    value,
    true,
    motionDuration('--duration-base'),
  )
  return <span className="tabular-nums">{Math.round(animatedValue)}</span>
}

function ActivityItem({ post }: { post: ActivityPost }) {
  const navigate = useNavigate()

  return (
    <li>
      <button
        type="button"
        onClick={() => navigate(`/community/posts/${post.id}`)}
        className="activity-item flex w-full flex-col gap-3 rounded-ait-s px-4 py-4 text-left sm:flex-row sm:items-center sm:justify-between"
      >
        <span className="min-w-0">
          <span className="block truncate text-body-1 font-semibold text-text-primary">
            {post.title}
          </span>
          <span className="mt-2 inline-flex rounded-ait-pill border border-status-achievement-border bg-status-achievement-surface px-3 py-1 text-caption font-semibold text-action-primary">
            {post.category}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-4 text-caption text-text-secondary">
          <time>{post.date}</time>
          <span className="inline-flex items-center gap-1" aria-label={`좋아요 ${post.likes}개`}>
            <Heart className="size-4 text-status-error" aria-hidden="true" />
            <AnimatedMetric value={post.likes} />
          </span>
          <span className="inline-flex items-center gap-1" aria-label={`댓글 ${post.comments}개`}>
            <MessageCircle className="size-4" aria-hidden="true" />
            <AnimatedMetric value={post.comments} />
          </span>
        </span>
      </button>
    </li>
  )
}

export function ActivityTabs() {
  const [activeTab, setActiveTab] = useState<ActivityTabId>('written')
  const activeIndex = activityTabs.findIndex((tab) => tab.id === activeTab)

  return (
    <section className="mypage-panel mypage-enter" style={{ '--section-order': 2 } as React.CSSProperties} aria-labelledby="activity-title">
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
              className={`rounded-t-ait-s px-2 py-3 text-body-2 transition-colors [transition-duration:var(--duration-fast)] [transition-timing-function:var(--easing-standard)] ${
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

      <div
        id="activity-tab-panel"
        key={activeTab}
        role="tabpanel"
        className="activity-tab-panel mt-2 min-h-72"
      >
        <ul className="divide-y divide-border-default">
          {activityPosts[activeTab].map((post) => (
            <ActivityItem key={post.id} post={post} />
          ))}
        </ul>
        <div className="flex h-16 items-center justify-center gap-2" aria-label="더 불러올 게시글 있음">
          <span className="size-1.5 rounded-ait-pill bg-status-neutral-border" />
          <span className="size-1.5 rounded-ait-pill bg-status-neutral-border" />
          <span className="size-1.5 rounded-ait-pill bg-status-neutral-border" />
        </div>
      </div>
    </section>
  )
}
