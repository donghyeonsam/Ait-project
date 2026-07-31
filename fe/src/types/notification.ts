// 알림 도메인 타입. 그룹 알림과 게시판 알림 두 종류로 구분한다.

export type NotificationCategory = 'group' | 'board'

export interface NotificationItem {
  id: string
  category: NotificationCategory
  title: string
  description: string
  createdAt: string
  read: boolean
}
