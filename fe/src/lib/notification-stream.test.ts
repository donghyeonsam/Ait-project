import { describe, expect, it, vi } from 'vitest'
import { subscribeNotifications } from '@/api/notifications'
import { addNotificationListener } from '@/lib/notification-stream'
import type { NotificationItem } from '@/types/notification'

vi.mock('@/api/notifications', () => ({
  subscribeNotifications: vi.fn().mockResolvedValue(undefined),
}))

const notification: NotificationItem = {
  id: '1',
  type: 'GROUP_APPLY',
  category: 'group',
  targetId: 101,
  title: '새 가입 신청이 도착했습니다.',
  createdAt: '2026-08-04T10:00:00',
  read: false,
}

describe('addNotificationListener', () => {
  it('리스너가 여럿이어도 SSE 연결은 하나만 열고 모두에게 전달한다', () => {
    const firstListener = vi.fn()
    const secondListener = vi.fn()
    const removeFirst = addNotificationListener(firstListener)
    const removeSecond = addNotificationListener(secondListener)

    expect(subscribeNotifications).toHaveBeenCalledTimes(1)

    const [emit, signal] = vi.mocked(subscribeNotifications).mock.calls[0]
    emit(notification)
    expect(firstListener).toHaveBeenCalledWith(notification)
    expect(secondListener).toHaveBeenCalledWith(notification)

    // 마지막 리스너가 해제될 때에만 연결을 닫는다.
    removeFirst()
    expect(signal.aborted).toBe(false)
    removeSecond()
    expect(signal.aborted).toBe(true)
  })

  it('연결이 닫힌 뒤 리스너가 다시 등록되면 새 연결을 연다', () => {
    const listener = vi.fn()
    const removeListener = addNotificationListener(listener)

    // 앞 테스트에서 연결이 닫혔으므로 이 등록으로 새 연결이 열려야 한다. (mock 호출 기록은 테스트마다 초기화된다)
    expect(subscribeNotifications).toHaveBeenCalledTimes(1)
    const [, signal] = vi.mocked(subscribeNotifications).mock.calls[0]
    expect(signal.aborted).toBe(false)

    removeListener()
    expect(signal.aborted).toBe(true)
  })
})
