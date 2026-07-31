import { mockNotifications } from '@/mocks/notifications'
import type { NotificationItem } from '@/types/notification'

// 알림 API 레이어. 지금은 목업 데이터를 지연과 함께 돌려주며,
// 실제 API가 준비되면 이 모듈의 함수 내부만 교체한다.
// TODO: 실제 API 연동 필요

const delay = () =>
  new Promise((resolve) => setTimeout(resolve, 300 + Math.random() * 300))

// 읽음 처리를 화면 새로고침 없이 확인할 수 있도록 세션 동안 유지하는 인메모리 저장소.
let notifications: NotificationItem[] = structuredClone(mockNotifications)

export async function fetchNotifications(): Promise<NotificationItem[]> {
  await delay()
  return structuredClone(notifications)
}

export async function markNotificationAsRead(id: string): Promise<void> {
  await delay()
  notifications = notifications.map((item) =>
    item.id === id ? { ...item, read: true } : item,
  )
}

export async function markAllNotificationsAsRead(): Promise<void> {
  await delay()
  notifications = notifications.map((item) => ({ ...item, read: true }))
}
