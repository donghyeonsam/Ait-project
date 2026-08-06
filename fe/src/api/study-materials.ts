// 전용 자료실 API가 없어 그룹톡 히스토리에서 파일 토큰 메시지를 걸러 자료 목록을 만든다.
import {
  getStudyGroupChats,
  type StudyGroupChatMessage,
} from '@/api/study-group-chat'
import { downloadAttachment } from '@/lib/attachment-actions'
import { parseFileToken } from '@/lib/study-chat-file'
import { parseReplyMessage } from '@/lib/study-chat-reply'
import type { StudyMaterialItem } from '@/types/study-materials'

export interface StudyMaterialsPage {
  // 최신순으로 정렬된 자료 목록.
  items: StudyMaterialItem[]
  // 다음 조회에 넘길 커서. 이 chatId보다 오래된 메시지를 이어서 조회한다.
  lastChatId: number | null
  hasNext: boolean
}

// 첨부가 드문 그룹에서 요청이 무한히 이어지지 않도록 한 번에 조회할 채팅 페이지 수를 제한한다.
const MAX_CHAT_PAGES_PER_LOAD = 10
// 이 개수를 채우면 페이지 제한 전이라도 조회를 멈춘다.
const TARGET_ITEMS_PER_LOAD = 12

// 답글 토큰을 벗긴 본문 전체가 파일 토큰일 때만 자료로 취급한다. 그룹톡 첨부 표시와 같은 규칙이다.
export function toStudyMaterialItem(
  chat: Pick<
    StudyGroupChatMessage,
    'chatId' | 'senderNickname' | 'message' | 'createdAt'
  >,
): StudyMaterialItem | null {
  const { body } = parseReplyMessage(chat.message)
  const file = parseFileToken(body)
  if (!file) return null

  return {
    id: String(chat.chatId),
    storedFilename: file.storedFilename,
    originalFilename: file.originalFilename,
    url: file.url,
    isImage: file.isImage,
    uploaderNickname: chat.senderNickname,
    createdAt: chat.createdAt,
  }
}

export async function fetchStudyGroupMaterials(
  groupId: number,
  lastChatId?: number,
): Promise<StudyMaterialsPage> {
  const items: StudyMaterialItem[] = []
  let cursor = lastChatId ?? null
  let hasNext = true

  for (let page = 0; page < MAX_CHAT_PAGES_PER_LOAD && hasNext; page += 1) {
    const result = await getStudyGroupChats(groupId, cursor ?? undefined)
    const oldestChat = result.chats[result.chats.length - 1]
    // 응답이 비면 커서를 더 진행할 수 없으므로 조회를 끝낸 것으로 본다.
    if (!oldestChat) {
      hasNext = false
      break
    }

    for (const chat of result.chats) {
      const item = toStudyMaterialItem(chat)
      if (item) items.push(item)
    }

    hasNext = result.hasNext
    cursor = oldestChat.chatId
    if (items.length >= TARGET_ITEMS_PER_LOAD) break
  }

  return { items, lastChatId: cursor, hasNext }
}

// 보호된 첨부파일을 인증 요청으로 받은 뒤 원본 파일명으로 내려받는다.
export function downloadStudyMaterial(item: StudyMaterialItem): Promise<void> {
  return downloadAttachment(item.url, item.originalFilename)
}
