import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  deleteAllNotifications,
  deleteNotification,
  fetchNotifications,
  getNotificationRoute,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '@/api/notifications'

const jsonResponse = (data: unknown) =>
  new Response(
    JSON.stringify({
      statusCode: 200,
      timestamp: '2026-08-02T00:00:00Z',
      path: '/api/notifications',
      message: 'ok',
      data,
      error: null,
    }),
    {
      status: 200,
      headers: { 'content-type': 'application/json' },
    },
  )

describe('fetchNotifications', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('백엔드 응답을 화면용 NotificationItem으로 변환한다', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse([
        {
          id: 1,
          type: 'COMMENT',
          targetId: 42,
          content: '회원님의 게시글에 새로운 댓글이 달렸습니다.',
          checked: false,
          createdAt: '2026-08-02T10:00:00',
        },
        {
          id: 2,
          type: 'GROUP_APPROVE',
          targetId: 7,
          content: '[면접 스터디] 그룹 가입이 승인되었습니다!',
          isChecked: true,
          createdAt: '2026-08-01T09:00:00',
        },
      ]),
    )
    vi.stubGlobal('fetch', fetchMock)

    const items = await fetchNotifications()

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/backend/api/notifications')
    expect(items).toEqual([
      {
        id: '1',
        type: 'COMMENT',
        category: 'board',
        targetId: 42,
        title: '회원님의 게시글에 새로운 댓글이 달렸습니다.',
        createdAt: '2026-08-02T10:00:00',
        read: false,
      },
      {
        id: '2',
        type: 'GROUP_APPROVE',
        category: 'group',
        targetId: 7,
        title: '[면접 스터디] 그룹 가입이 승인되었습니다!',
        createdAt: '2026-08-01T09:00:00',
        read: true,
      },
    ])
  })

  it('data가 null이면 빈 배열을 반환한다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(null)))

    await expect(fetchNotifications()).resolves.toEqual([])
  })
})

describe('알림 읽음·삭제 요청', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('단일 읽음 처리를 PATCH로 호출한다', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(null))
    vi.stubGlobal('fetch', fetchMock)

    await markNotificationAsRead('3')

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/backend/api/notifications/3/read')
    expect((fetchMock.mock.calls[0]?.[1] as RequestInit).method).toBe('PATCH')
  })

  it('전체 읽음 처리를 PATCH로 호출한다', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(null))
    vi.stubGlobal('fetch', fetchMock)

    await markAllNotificationsAsRead()

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/backend/api/notifications/read-all')
    expect((fetchMock.mock.calls[0]?.[1] as RequestInit).method).toBe('PATCH')
  })

  it('단일 삭제를 DELETE로 호출한다', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(null))
    vi.stubGlobal('fetch', fetchMock)

    await deleteNotification('3')

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/backend/api/notifications/3')
    expect((fetchMock.mock.calls[0]?.[1] as RequestInit).method).toBe('DELETE')
  })

  it('전체 삭제를 DELETE로 호출한다', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(null))
    vi.stubGlobal('fetch', fetchMock)

    await deleteAllNotifications()

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/backend/api/notifications')
    expect((fetchMock.mock.calls[0]?.[1] as RequestInit).method).toBe('DELETE')
  })
})

describe('getNotificationRoute', () => {
  it('게시판 알림은 게시글 상세로, 그룹 알림은 그룹 상세로 이동한다', () => {
    const base = { id: '1', title: '', createdAt: '', read: false } as const

    expect(
      getNotificationRoute({ ...base, type: 'LIKE', category: 'board', targetId: 42 }),
    ).toBe('/community/posts/42')
    expect(
      getNotificationRoute({
        ...base,
        type: 'GROUP_KICKED',
        category: 'group',
        targetId: 7,
      }),
    ).toBe('/study/groups/7')
  })
})
