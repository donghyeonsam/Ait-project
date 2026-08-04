// 알림 도메인 타입. 그룹 알림과 게시판 알림 두 종류로 구분한다.

// 백엔드 NotificationType enum과 동일한 값.
export type NotificationType =
  | 'COMMENT'
  | 'REPLY'
  | 'LIKE'
  | 'GROUP_APPLY'
  | 'GROUP_APPROVE'
  | 'GROUP_REJECT'
  | 'GROUP_KICKED'

export type NotificationCategory = 'group' | 'board'

export interface NotificationItem {
  id: string
  type: NotificationType
  category: NotificationCategory
  targetId: number
  title: string
  createdAt: string
  read: boolean
}
