import { getStoredAccessToken } from '@/api/auth-storage'
import { backendRequest, getBackendAssetUrl } from '@/api/http'
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

// 백엔드 무한 스크롤 응답. notifications 한 페이지와 다음 페이지 존재 여부를 내려준다.
interface NotificationScrollResponse {
  notifications: NotificationApiItem[]
  hasNext: boolean
}

export interface NotificationPage {
  items: NotificationItem[]
  hasNext: boolean
}

const PAGE_SIZE = 10

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

export async function fetchNotifications(page = 0): Promise<NotificationPage> {
  const data = await backendRequest<NotificationScrollResponse>(
    `/api/notifications?page=${page}&size=${PAGE_SIZE}`,
  )
  return {
    items: (data?.notifications ?? []).map(toNotificationItem),
    hasNext: data?.hasNext ?? false,
  }
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

const SSE_RECONNECT_DELAY_MS = 5_000

// EventSource는 Authorization 헤더를 붙일 수 없어 fetch 스트림을 직접 파싱해 SSE를 구독한다.
// 연결이 끊기면(서버의 1시간 타임아웃 포함) 신호가 중단될 때까지 일정 간격으로 재연결한다.
export async function subscribeNotifications(
  onNotification: (item: NotificationItem) => void,
  signal: AbortSignal,
): Promise<void> {
  while (!signal.aborted) {
    try {
      const headers = new Headers({ Accept: 'text/event-stream' })
      const accessToken = getStoredAccessToken()
      if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)

      const response = await fetch(getBackendAssetUrl('/api/notifications/stream'), {
        headers,
        credentials: 'include',
        signal,
      })
      if (response.ok && response.body) {
        await readNotificationStream(response.body, onNotification, signal)
      }
    } catch {
      // 연결 실패·중단은 아래 재연결 대기로 넘어간다.
    }
    if (signal.aborted) return
    await new Promise((resolve) => setTimeout(resolve, SSE_RECONNECT_DELAY_MS))
  }
}

async function readNotificationStream(
  body: ReadableStream<Uint8Array>,
  onNotification: (item: NotificationItem) => void,
  signal: AbortSignal,
) {
  const reader = body.getReader()
  // fetch 중단이 스트림까지 전달되지 않는 환경에서도 대기 중인 read가 풀리도록 직접 취소한다.
  const cancelOnAbort = () => void reader.cancel().catch(() => undefined)
  signal.addEventListener('abort', cancelOnAbort)

  const decoder = new TextDecoder()
  let buffer = ''
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) return
      buffer += decoder.decode(value, { stream: true })
      // SSE 이벤트는 빈 줄로 구분된다. 아직 안 끝난 마지막 조각은 다음 청크와 이어 붙인다.
      const events = buffer.split('\n\n')
      buffer = events.pop() ?? ''
      for (const event of events) handleSseEvent(event, onNotification)
    }
  } finally {
    signal.removeEventListener('abort', cancelOnAbort)
  }
}

function handleSseEvent(
  rawEvent: string,
  onNotification: (item: NotificationItem) => void,
) {
  let eventName = 'message'
  const dataLines: string[] = []
  for (const line of rawEvent.split('\n')) {
    if (line.startsWith('event:')) eventName = line.slice(6).trim()
    else if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart())
  }
  if (eventName !== 'notification' || dataLines.length === 0) return

  // 최초 연결 안내 문자열처럼 JSON이 아닌 데이터는 무시한다.
  try {
    const raw = JSON.parse(dataLines.join('\n')) as NotificationApiItem
    onNotification(toNotificationItem(raw))
  } catch {
    return
  }
}
