// 알림 SSE 연결을 하나만 유지하고 여러 화면에 팬아웃한다. 서버가 사용자당 단일 연결을 전제해도 안전하다.
import { subscribeNotifications } from '@/api/notifications'
import type { NotificationItem } from '@/types/notification'

type NotificationListener = (item: NotificationItem) => void

const listeners = new Set<NotificationListener>()
let controller: AbortController | null = null

// 첫 리스너 등록 시 연결을 열고 마지막 리스너 해제 시 닫는다. 반환된 함수로 구독을 해제한다.
export function addNotificationListener(listener: NotificationListener) {
  listeners.add(listener)

  if (listeners.size === 1) {
    controller = new AbortController()
    void subscribeNotifications((item) => {
      listeners.forEach((registeredListener) => registeredListener(item))
    }, controller.signal)
  }

  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) {
      controller?.abort()
      controller = null
    }
  }
}
