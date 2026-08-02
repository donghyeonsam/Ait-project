import { backendRequest } from '@/api/http'
import type {
  NotificationCategory,
  NotificationItem,
  NotificationType,
} from '@/types/notification'

// 알림 API 레이어. 백엔드 /api/notifications 응답을 화면용 NotificationItem으로 변환한다.

interface NotificationApiItem {
  id: number
  type: NotificationType
  targetId: number
  content: string
  // 백엔드 boolean 필드(isChecked)의 직렬화 이름이 checked로 바뀔 수 있어 둘 다 대응한다.
  checked?: boolean
  isChecked?: boolean
  createdAt: string
}

const toCategory = (type: NotificationType): NotificationCategory =>
  type.startsWith('GROUP') ? 'group' : 'board'

function toNotificationItem(raw: NotificationApiItem): NotificationItem {
  return {
    id: String(raw.id),
    type: raw.type,
    category: toCategory(raw.type),
    targetId: raw.targetId,
    title: raw.content,
    createdAt: raw.createdAt,
    read: raw.isChecked ?? raw.checked ?? false,
  }
}

// 알림 클릭 시 이동할 경로. targetId는 그룹 알림이면 groupId, 게시판 알림이면 postId다.
export function getNotificationRoute(item: NotificationItem): string {
  return item.category === 'group'
    ? `/study/groups/${item.targetId}`
    : `/community/posts/${item.targetId}`
}

export async function fetchNotifications(): Promise<NotificationItem[]> {
  const data = await backendRequest<NotificationApiItem[]>('/api/notifications')
  return (data ?? []).map(toNotificationItem)
}

export async function markNotificationAsRead(id: string): Promise<void> {
  await backendRequest<null>(`/api/notifications/${id}/read`, {
    method: 'PATCH',
  })
}

export async function markAllNotificationsAsRead(): Promise<void> {
  await backendRequest<null>('/api/notifications/read-all', {
    method: 'PATCH',
  })
}

export async function deleteNotification(id: string): Promise<void> {
  await backendRequest<null>(`/api/notifications/${id}`, {
    method: 'DELETE',
  })
}

export async function deleteAllNotifications(): Promise<void> {
  await backendRequest<null>('/api/notifications', {
    method: 'DELETE',
  })
}
