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

export type StudyGroupChatType = 'TEXT' | 'FILE' | 'SYSTEM'

export type StudyGroupChatFileType =
  | 'IMAGE'
  | 'PDF'
  | 'DOCUMENT'
  | 'ZIP'
  | 'OTHER'

// 서버 study_group_files 스키마와 같은 첨부 파일 정보. 전송·수신 양쪽에서 같은 형태를 쓴다.
export interface StudyGroupChatFile {
  originalFilename: string
  storedFilename: string
  fileType: StudyGroupChatFileType
  fileSize: number | null
}

export interface StudyGroupChatMessage {
  chatId: number
  groupId: number
  senderId: number
  senderNickname: string
  profileImageUrl: string | null
  chatType?: StudyGroupChatType
  message: string
  files?: StudyGroupChatFile[]
  createdAt: string
  reactions?: StudyGroupChatReactionSummary[]
}

// 파일 메시지는 서버가 message를 null로 줄 수 있어, 문자열을 전제한 기존 파싱이 깨지지 않게 빈 문자열로 보정한다.
function normalizeStudyGroupChatMessage(
  raw: StudyGroupChatMessage,
): StudyGroupChatMessage {
  return { ...raw, message: raw.message ?? '' }
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

export function setStudyGroupChatReactionForUser(
  currentReactions: StudyGroupChatReactionSummary[] | undefined,
  emoji: string,
  userId: number,
  reacted: boolean,
) {
  const nextReactions = (currentReactions ?? []).map((reaction) => ({
    ...reaction,
    userIds: [...reaction.userIds],
  }))
  const reactionIndex = nextReactions.findIndex(
    (reaction) => reaction.emoji === emoji,
  )

  if (reacted) {
    if (reactionIndex === -1) {
      return [
        ...nextReactions,
        { emoji, count: 1, userIds: [userId] },
      ]
    }

    const reaction = nextReactions[reactionIndex]
    if (!reaction.userIds.includes(userId)) {
      reaction.userIds.push(userId)
      reaction.count = reaction.userIds.length
    }
    return nextReactions
  }

  if (reactionIndex === -1) return nextReactions

  const reaction = nextReactions[reactionIndex]
  reaction.userIds = reaction.userIds.filter(
    (reactionUserId) => reactionUserId !== userId,
  )
  reaction.count = reaction.userIds.length

  return reaction.count === 0
    ? nextReactions.filter((_, index) => index !== reactionIndex)
    : nextReactions
}

// 서버의 전체 목록 응답이 교차 도착해도 이 브라우저에서 선택한 내 반응은 덮어쓰지 않는다.
export function applyStudyGroupChatReactionUpdate(
  currentReactions: StudyGroupChatReactionSummary[] | undefined,
  update: StudyGroupChatReactionUpdate,
  preserveUserId: number | null,
) {
  if (preserveUserId === null) return update.reactions

  let mergedReactions = update.reactions
    .map((reaction) => {
      const userIds = reaction.userIds.filter(
        (userId) => userId !== preserveUserId,
      )
      return { ...reaction, count: userIds.length, userIds }
    })
    .filter((reaction) => reaction.count > 0)

  for (const currentReaction of currentReactions ?? []) {
    if (!currentReaction.userIds.includes(preserveUserId)) continue
    mergedReactions = setStudyGroupChatReactionForUser(
      mergedReactions,
      currentReaction.emoji,
      preserveUserId,
      true,
    )
  }

  return mergedReactions
}

export interface StudyGroupChatNotice {
  groupId: number
  notice: string | null
  updatedAt: string
}

// 첨부 파일을 채팅 전용 업로드 API에 올리고 저장 파일명을 돌려받는다.
// 이 경로로 올려야 서버가 CHAT 카테고리로 저장해 자료실 모아보기에 잡힌다.
export async function uploadStudyGroupChatFile(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  return backendRequest<string>('/api/study-groups/files/upload', {
    method: 'POST',
    body: formData,
  })
}

// 여러 파일을 한 번에 올리고 저장 파일명 목록을 순서대로 돌려받는다.
export async function uploadStudyGroupChatFiles(files: File[]) {
  const formData = new FormData()
  for (const file of files) {
    formData.append('files', file)
  }
  return backendRequest<string[]>('/api/study-groups/files/uploads', {
    method: 'POST',
    body: formData,
  })
}

export async function getStudyGroupChats(groupId: number, lastChatId?: number) {
  const query = lastChatId ? `?lastChatId=${lastChatId}` : ''
  const result = await backendRequest<StudyGroupChatCursorResult>(
    `/api/study-groups/${groupId}/chats${query}`,
  )
  return {
    ...result,
    chats: result.chats.map(normalizeStudyGroupChatMessage),
  }
}

interface StudyGroupChatSocketHandlers {
  onMessage: (message: StudyGroupChatMessage) => void
  onNotice: (notice: StudyGroupChatNotice) => void
  onReaction: (reaction: StudyGroupChatReactionUpdate) => void
  onError?: (message: string) => void
  onConnect?: () => void
  onDisconnect?: () => void
}

interface StudyChatConnectionHandlers {
  onConnect?: () => void
  onDisconnect?: () => void
  onError?: (message: string) => void
}

// 연결 옵션과 오류 문구를 공유하는 STOMP 클라이언트를 만들고, 구독 구성만 호출부에 맡긴다.
function createStudyChatClient(
  subscribeTopics: (client: Client) => void,
  handlers: StudyChatConnectionHandlers,
) {
  const client = new Client({
    webSocketFactory: () => new SockJS(`${websocketBaseUrl}/ws/chat`),
    connectHeaders: {
      Authorization: `Bearer ${getStoredAccessToken() ?? ''}`,
    },
    connectionTimeout: 10_000,
    reconnectDelay: 5000,
    onConnect: () => {
      subscribeTopics(client)
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

// 그룹톡용 STOMP 연결을 열고, 메시지·공지 토픽을 구독한다. 반환된 client로 발행·연결 해제를 처리한다.
export function connectStudyGroupChat(
  groupId: number,
  handlers: StudyGroupChatSocketHandlers,
) {
  return createStudyChatClient((client) => {
    client.subscribe(
      `/topic/study-groups/${groupId}`,
      (frame: IMessage) => {
        handlers.onMessage(
          normalizeStudyGroupChatMessage(
            JSON.parse(frame.body) as StudyGroupChatMessage,
          ),
        )
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
  }, handlers)
}

interface StudyGroupChatMultiSocketHandlers extends StudyChatConnectionHandlers {
  onMessage: (message: StudyGroupChatMessage) => void
}

// 여러 그룹의 메시지 토픽을 한 연결로 구독한다. 헤더 안읽음 배지처럼 전역 수신이 필요한 곳에서 쓴다.
export function connectStudyGroupChatMulti(
  groupIds: number[],
  handlers: StudyGroupChatMultiSocketHandlers,
) {
  return createStudyChatClient((client) => {
    groupIds.forEach((groupId) => {
      client.subscribe(
        `/topic/study-groups/${groupId}`,
        (frame: IMessage) => {
          handlers.onMessage(
            normalizeStudyGroupChatMessage(
              JSON.parse(frame.body) as StudyGroupChatMessage,
            ),
          )
        },
      )
    })
  }, handlers)
}

export function sendStudyGroupChatMessage(
  client: Client,
  groupId: number,
  message: string,
) {
  client.publish({
    destination: `/app/study-groups/${groupId}/messages`,
    body: JSON.stringify({ chatType: 'TEXT', message }),
  })
}

// 첨부 파일 메시지를 보낸다. message에는 답글 토큰 같은 부가 텍스트만 담고 파일 정보는 files로 보낸다.
export function sendStudyGroupChatFileMessage(
  client: Client,
  groupId: number,
  files: StudyGroupChatFile[],
  message: string | null = null,
) {
  client.publish({
    destination: `/app/study-groups/${groupId}/messages`,
    body: JSON.stringify({ chatType: 'FILE', message, files }),
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
