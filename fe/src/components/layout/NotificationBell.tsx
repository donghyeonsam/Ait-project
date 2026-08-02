import { AnimatePresence, motion } from 'framer-motion'
import { Bell, MessageSquare, Users, X } from 'lucide-react'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  deleteAllNotifications,
  deleteNotification,
  fetchNotifications,
  getNotificationRoute,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '@/api/notifications'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatRelativeTime } from '@/lib/format'
import { dropdownPanel, filterSlide } from '@/lib/motion'
import { cn } from '@/lib/utils'
import type { NotificationCategory, NotificationItem } from '@/types/notification'

type NotificationFilter = 'all' | NotificationCategory

const categoryIcons: Record<NotificationCategory, typeof Users> = {
  group: Users,
  board: MessageSquare,
}

const filterOptions: { value: NotificationFilter; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'group', label: '그룹' },
  { value: 'board', label: '게시판' },
]

// 헤더의 알림 벨. 그룹 알림과 게시판 알림을 필터로 나눠 보여주는 드롭다운을 연다.
export function NotificationBell() {
  const navigate = useNavigate()
  const [isOpen, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [isLoading, setLoading] = useState(true)
  const [hasError, setError] = useState(false)
  const [filter, setFilter] = useState<NotificationFilter>('all')
  const [slideDirection, setSlideDirection] = useState(1)
  const rootRef = useRef<HTMLDivElement>(null)
  const panelId = useId()

  // 목록을 서버 상태로 동기화한다. 스켈레톤 노출 여부(isLoading)는 호출하는 쪽에서 제어한다.
  const loadNotifications = useCallback(() => {
    return fetchNotifications()
      .then((items) => {
        setNotifications(items)
        setError(false)
      })
      .catch(() => {
        setError(true)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    void loadNotifications()
  }, [loadNotifications])

  useEffect(() => {
    if (!isOpen) return
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const unreadCount = notifications.filter((item) => !item.read).length
  const filteredNotifications =
    filter === 'all'
      ? notifications
      : notifications.filter((item) => item.category === filter)

  // 드롭다운을 열 때마다 스켈레톤 없이 최신 목록으로 동기화한다.
  const handleToggle = () => {
    const next = !isOpen
    setOpen(next)
    if (next) void loadNotifications()
  }

  const handleSelect = (item: NotificationItem) => {
    if (!item.read) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, read: true } : n)),
      )
      void markNotificationAsRead(item.id)
    }
    setOpen(false)
    navigate(getNotificationRoute(item))
  }

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    markAllNotificationsAsRead().catch(() => loadNotifications())
  }

  const handleDelete = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    deleteNotification(id).catch(() => loadNotifications())
  }

  const handleDeleteAll = () => {
    setNotifications([])
    deleteAllNotifications().catch(() => loadNotifications())
  }

  const handleFilterChange = (next: NotificationFilter) => {
    if (next === filter) return
    const currentIndex = filterOptions.findIndex((option) => option.value === filter)
    const nextIndex = filterOptions.findIndex((option) => option.value === next)
    setSlideDirection(nextIndex > currentIndex ? 1 : -1)
    setFilter(next)
  }

  return (
    <div ref={rootRef} className="relative">
      <Button
        type="button"
        variant="text"
        size="icon"
        className="relative"
        aria-label={unreadCount > 0 ? '알림, 읽지 않은 알림 있음' : '알림'}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? panelId : undefined}
        onClick={handleToggle}
      >
        <Bell aria-hidden="true" />
        {unreadCount > 0 ? (
          <span
            className="absolute top-1.5 right-1.5 size-2.5 rounded-full border-2 border-surface-default bg-status-error"
            aria-hidden="true"
          />
        ) : null}
      </Button>

      <AnimatePresence>
        {isOpen ? (
          <motion.div
            id={panelId}
            role="menu"
            aria-label="알림 목록"
            variants={dropdownPanel}
            initial="initial"
            animate="animate"
            exit="exit"
            className="absolute right-0 top-[calc(100%+0.375rem)] z-[var(--z-index-dropdown)] w-80 origin-top-right overflow-hidden rounded-ait-s border border-line bg-surface-default shadow-elevation-2"
          >
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <p className="text-body-1 font-semibold text-text-primary">알림</p>
              <div className="flex items-center gap-3">
                {unreadCount > 0 ? (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="text-body-2 text-action-primary hover:underline"
                  >
                    모두 읽음
                  </button>
                ) : null}
                {notifications.length > 0 ? (
                  <button
                    type="button"
                    onClick={handleDeleteAll}
                    className="text-body-2 text-text-secondary hover:text-status-error hover:underline"
                  >
                    전체 삭제
                  </button>
                ) : null}
              </div>
            </div>

            <div
              role="tablist"
              aria-label="알림 필터"
              className="flex items-center gap-1 border-b border-line px-3"
            >
              {filterOptions.map((option) => {
                const isActive = option.value === filter
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => handleFilterChange(option.value)}
                    className={cn(
                      'relative px-2 py-2.5 text-body-2 transition-colors [transition-duration:var(--duration-fast)]',
                      isActive
                        ? 'font-semibold text-action-primary after:absolute after:inset-x-2 after:-bottom-px after:h-px after:bg-status-achievement'
                        : 'text-text-secondary hover:text-action-primary',
                    )}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>

            <div className="overflow-hidden">
              {isLoading ? (
                <div className="space-y-3 p-4" role="status" aria-label="알림 불러오는 중">
                  {Array.from({ length: 3 }, (_, index) => (
                    <Skeleton key={index} className="h-12 w-full" />
                  ))}
                </div>
              ) : hasError ? (
                <div className="px-4 py-10 text-center">
                  <p className="text-body-2 text-text-secondary">
                    알림을 불러오지 못했어요.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setLoading(true)
                      void loadNotifications()
                    }}
                    className="mt-2 text-body-2 text-action-primary hover:underline"
                  >
                    다시 시도
                  </button>
                </div>
              ) : (
                <AnimatePresence mode="wait" initial={false} custom={slideDirection}>
                  <motion.div
                    key={filter}
                    custom={slideDirection}
                    variants={filterSlide}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="max-h-[26rem] overflow-y-auto"
                  >
                    {filteredNotifications.length === 0 ? (
                      <p className="px-4 py-10 text-center text-body-2 text-text-secondary">
                        표시할 알림이 없어요.
                      </p>
                    ) : (
                      <ul>
                        {filteredNotifications.map((item) => {
                          const CategoryIcon = categoryIcons[item.category]
                          return (
                            <li key={item.id} className="group/item relative">
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => handleSelect(item)}
                                className="flex w-full items-start gap-2.5 py-2.5 pr-10 pl-4 text-left transition-colors [transition-duration:var(--duration-fast)] hover:bg-surface-muted"
                              >
                                <span className="relative mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-muted">
                                  <CategoryIcon
                                    aria-hidden="true"
                                    className="size-3.5 text-text-secondary"
                                  />
                                  {item.read ? null : (
                                    <span
                                      className="absolute -top-0.5 -right-0.5 size-2 rounded-full border-2 border-surface-default bg-status-error"
                                      aria-hidden="true"
                                    />
                                  )}
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span
                                    className={cn(
                                      'block text-body-2',
                                      item.read
                                        ? 'text-text-secondary'
                                        : 'font-semibold text-text-primary',
                                    )}
                                  >
                                    {item.title}
                                  </span>
                                  <span className="mt-0.5 block text-caption text-ink-400">
                                    {formatRelativeTime(item.createdAt)}
                                  </span>
                                </span>
                              </button>
                              <button
                                type="button"
                                aria-label="알림 삭제"
                                onClick={() => handleDelete(item.id)}
                                className="absolute top-2.5 right-2.5 flex size-6 items-center justify-center rounded-full text-ink-400 opacity-0 transition-opacity [transition-duration:var(--duration-fast)] group-hover/item:opacity-100 hover:bg-surface-default hover:text-status-error focus-visible:opacity-100"
                              >
                                <X aria-hidden="true" className="size-3.5" />
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </motion.div>
                </AnimatePresence>
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
