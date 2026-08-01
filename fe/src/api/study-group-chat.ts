// 스터디 그룹톡의 과거 메시지 조회(REST)와 실시간 송수신(STOMP)을 담당하는 API 모듈.
import { Client, type IMessage } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import { backendRequest } from '@/api/http'
import { getStoredAccessToken } from '@/api/auth-storage'

const configuredWebsocketUrl = import.meta.env.VITE_WS_URL?.trim()

// 개발 환경은 Vite의 /backend 프록시를 사용해 REST와 WebSocket이 같은 백엔드를 보게 한다.
// Vercel은 WebSocket 프록시를 보장하지 않으므로 배포 빌드는 Spring Boot 서버에 직접 연결한다.
const websocketBaseUrl = (
  configuredWebsocketUrl ||
  (import.meta.env.DEV
    ? (import.meta.env.VITE_BE_API_URL ?? '/backend')
    : 'https://i15d202.p.ssafy.io')
).replace(/\/$/, '')

export interface StudyGroupChatMessage {
  chatId: number
  groupId: number
  senderId: number
  senderNickname: string
  profileImageUrl: string | null
  message: string
  createdAt: string
  reactions?: StudyGroupChatReactionSummary[]
}

export interface StudyGroupChatReactionSummary {
  emoji: string
  count: number
  userIds: number[]
}

export interface StudyGroupChatReactionUpdate {
  groupId: number
  chatId: number
  reactions: StudyGroupChatReactionSummary[]
}

export interface StudyGroupChatCursorResult {
  chats: StudyGroupChatMessage[]
  hasNext: boolean
}

export interface StudyGroupChatNotice {
  groupId: number
  notice: string | null
  updatedAt: string
}

export function getStudyGroupChats(groupId: number, lastChatId?: number) {
  const query = lastChatId ? `?lastChatId=${lastChatId}` : ''
  return backendRequest<StudyGroupChatCursorResult>(
    `/api/study-groups/${groupId}/chats${query}`,
  )
}

interface StudyGroupChatSocketHandlers {
  onMessage: (message: StudyGroupChatMessage) => void
  onNotice: (notice: StudyGroupChatNotice) => void
  onReaction: (reaction: StudyGroupChatReactionUpdate) => void
  onError?: (message: string) => void
  onConnect?: () => void
  onDisconnect?: () => void
}

// 그룹톡용 STOMP 연결을 열고, 메시지·공지 토픽을 구독한다. 반환된 client로 발행·연결 해제를 처리한다.
export function connectStudyGroupChat(
  groupId: number,
  handlers: StudyGroupChatSocketHandlers,
) {
  const client = new Client({
    webSocketFactory: () => new SockJS(`${websocketBaseUrl}/ws/chat`),
    connectHeaders: {
      Authorization: `Bearer ${getStoredAccessToken() ?? ''}`,
    },
    connectionTimeout: 10_000,
    reconnectDelay: 5000,
    onConnect: () => {
      client.subscribe(
        `/topic/study-groups/${groupId}`,
        (frame: IMessage) => {
          handlers.onMessage(JSON.parse(frame.body) as StudyGroupChatMessage)
        },
      )
      client.subscribe(
        `/topic/study-groups/${groupId}/notices`,
        (frame: IMessage) => {
          handlers.onNotice(JSON.parse(frame.body) as StudyGroupChatNotice)
        },
      )
      client.subscribe(
        `/topic/study-groups/${groupId}/reactions`,
        (frame: IMessage) => {
          handlers.onReaction(
            JSON.parse(frame.body) as StudyGroupChatReactionUpdate,
          )
        },
      )
      handlers.onConnect?.()
    },
    onDisconnect: () => {
      handlers.onDisconnect?.()
    },
    onStompError: (frame) => {
      handlers.onError?.(
        frame.headers.message ?? '그룹톡 연결 중 오류가 발생했습니다.',
      )
    },
    onWebSocketError: () => {
      handlers.onError?.('그룹톡 서버에 연결할 수 없습니다.')
    },
    onWebSocketClose: () => {
      handlers.onDisconnect?.()
      if (client.active) {
        handlers.onError?.(
          '그룹톡 연결이 끊겼습니다. 자동으로 다시 연결하고 있습니다.',
        )
      }
    },
  })
  client.activate()
  return client
}

export function sendStudyGroupChatMessage(
  client: Client,
  groupId: number,
  message: string,
) {
  client.publish({
    destination: `/app/study-groups/${groupId}/messages`,
    body: JSON.stringify({ message }),
  })
}

export function sendStudyGroupChatNotice(
  client: Client,
  groupId: number,
  notice: string,
) {
  client.publish({
    destination: `/app/study-groups/${groupId}/notices`,
    body: JSON.stringify({ notice }),
  })
}

export function deleteStudyGroupChatNotice(client: Client, groupId: number) {
  client.publish({
    destination: `/app/study-groups/${groupId}/notices/delete`,
  })
}

export function toggleStudyGroupChatReaction(
  client: Client,
  groupId: number,
  chatId: number,
  emoji: string,
) {
  client.publish({
    destination: `/app/study-groups/${groupId}/messages/${chatId}/reactions`,
    body: JSON.stringify({ emoji }),
  })
}
