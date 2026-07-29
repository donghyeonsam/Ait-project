import { useState } from 'react'

type ActivityTabId = 'written' | 'scrapped' | 'liked'

const activityTabs: Array<{ id: ActivityTabId; label: string }> = [
  { id: 'written', label: '작성한 게시글' },
  { id: 'scrapped', label: '저장한 게시글' },
  { id: 'liked', label: '좋아요한 게시글' },
]

// 마이페이지의 활동 탭(작성/저장/좋아요). 탭 전환 UI만 구현하고 목록은 API 연동 전 빈 상태다.
export function ActivityTabs() {
  const [activeTab, setActiveTab] = useState<ActivityTabId>('written')
  const activeIndex = activityTabs.findIndex((tab) => tab.id === activeTab)

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
        className="activity-tab-panel flex min-h-72 items-center justify-center"
      >
        <p className="text-body-2 text-text-secondary">
          활동 데이터 API가 연결되면 이곳에 표시됩니다.
        </p>
      </div>
    </section>
  )
}
