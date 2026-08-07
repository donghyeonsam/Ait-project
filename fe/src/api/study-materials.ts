// 자료실 조회 모듈. 서버 파일 모아보기 API를 우선 쓰고, 새 스키마 도입 전
// 파일 토큰으로 공유된 과거 자료는 그룹톡 히스토리를 이어서 훑어 보여준다.
import { backendRequest } from '@/api/http'
import {
  getStudyGroupChats,
  type StudyGroupChatFileType,
  type StudyGroupChatMessage,
} from '@/api/study-group-chat'
import { downloadAttachment } from '@/lib/attachment-actions'
import {
  fromStudyGroupChatFile,
  parseFileToken,
} from '@/lib/study-chat-file'
import { parseReplyMessage } from '@/lib/study-chat-reply'
import type {
  StudyMaterialItem,
  StudyMaterialTab,
} from '@/types/study-materials'

const FILES_PAGE_SIZE = 20
// 첨부가 드문 그룹에서 요청이 무한히 이어지지 않도록 한 번에 조회할 채팅 페이지 수를 제한한다.
const MAX_CHAT_PAGES_PER_LOAD = 10
// 이 개수를 채우면 페이지 제한 전이라도 조회를 멈춘다.
const TARGET_ITEMS_PER_LOAD = 12

// GET /api/study-groups/{groupId}/files 응답 항목.
interface StudyGroupFileResponse {
  fileId: number
  chatId: number
  uploaderId: number
  uploaderNickname: string
  originalFilename: string
  storedFilename: string
  fileType: StudyGroupChatFileType
  fileSize: number | null
  createdAt: string
}

// Spring Data Page 응답에서 화면이 쓰는 필드만 정의한다.
interface SpringPage<T> {
  content: T[]
  totalElements: number
  last: boolean
}

// 조회 진행 상태. 전용 API 페이지를 다 읽으면 legacy(과거 토큰 스캔) 단계로 넘어간다.
// 토큰 자료는 모두 파일 API 도입 이전 것이라 시간순으로도 전용 API 자료 뒤에 온다.
export type StudyMaterialsSource =
  | { phase: 'files'; page: number }
  | { phase: 'legacy'; lastChatId?: number }

export interface StudyMaterialsPageResult {
  items: StudyMaterialItem[]
  // null이면 더 불러올 자료가 없다.
  nextSource: StudyMaterialsSource | null
  // 전용 API가 알려주는 종류별 전체 개수. legacy 단계 자료는 포함하지 않는다.
  totalCount: number | null
}

function toItemFromFileResponse(
  file: StudyGroupFileResponse,
): StudyMaterialItem {
  const attachment = fromStudyGroupChatFile(file)
  return {
    id: attachment.storedFilename,
    storedFilename: attachment.storedFilename,
    originalFilename: attachment.originalFilename,
    url: attachment.url,
    isImage: attachment.isImage,
    fileSize: file.fileSize,
    uploaderNickname: file.uploaderNickname,
    createdAt: file.createdAt,
  }
}

// 채팅 메시지에서 자료 항목을 뽑는다. 서버 files 첨부가 정식 경로이고 파일 토큰은 하위 호환이다.
export function toStudyMaterialItems(
  chat: Pick<
    StudyGroupChatMessage,
    'senderNickname' | 'message' | 'createdAt' | 'files'
  >,
): StudyMaterialItem[] {
  if (chat.files?.length) {
    return chat.files.map((file) => {
      const attachment = fromStudyGroupChatFile(file)
      return {
        id: attachment.storedFilename,
        storedFilename: attachment.storedFilename,
        originalFilename: attachment.originalFilename,
        url: attachment.url,
        isImage: attachment.isImage,
        fileSize: file.fileSize,
        uploaderNickname: chat.senderNickname,
        createdAt: chat.createdAt,
      }
    })
  }

  const { body } = parseReplyMessage(chat.message)
  const token = parseFileToken(body)
  if (!token) return []
  return [
    {
      id: token.storedFilename,
      storedFilename: token.storedFilename,
      originalFilename: token.originalFilename,
      url: token.url,
      isImage: token.isImage,
      fileSize: null,
      uploaderNickname: chat.senderNickname,
      createdAt: chat.createdAt,
    },
  ]
}

async function fetchFilesPage(
  groupId: number,
  kind: StudyMaterialTab,
  page: number,
): Promise<StudyMaterialsPageResult> {
  const result = await backendRequest<SpringPage<StudyGroupFileResponse>>(
    `/api/study-groups/${groupId}/files?type=${
      kind === 'image' ? 'image' : 'other'
    }&page=${page}&size=${FILES_PAGE_SIZE}`,
  )
  return {
    items: result.content.map(toItemFromFileResponse),
    nextSource: result.last
      ? { phase: 'legacy' }
      : { phase: 'files', page: page + 1 },
    totalCount: result.totalElements,
  }
}

async function fetchLegacyChunk(
  groupId: number,
  kind: StudyMaterialTab,
  lastChatId?: number,
): Promise<StudyMaterialsPageResult> {
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
      // files 첨부 메시지는 전용 API 단계에서 이미 나왔으므로 과거 토큰 자료만 줍는다.
      if (chat.files?.length) continue
      const item = toStudyMaterialItems(chat)[0]
      if (item && item.isImage === (kind === 'image')) items.push(item)
    }

    hasNext = result.hasNext
    cursor = oldestChat.chatId
    if (items.length >= TARGET_ITEMS_PER_LOAD) break
  }

  return {
    items,
    nextSource: hasNext
      ? { phase: 'legacy', lastChatId: cursor ?? undefined }
      : null,
    totalCount: null,
  }
}

// 한 번 호출에 목표 개수를 채울 때까지 전용 API 페이지를 읽고, 다 읽으면 legacy 스캔으로 이어간다.
// 새 자료가 없는 그룹도 첫 조회에서 과거 토큰 자료까지 바로 보이게 하기 위함이다.
export async function fetchStudyGroupMaterials(
  groupId: number,
  kind: StudyMaterialTab,
  source: StudyMaterialsSource = { phase: 'files', page: 0 },
): Promise<StudyMaterialsPageResult> {
  const items: StudyMaterialItem[] = []
  let totalCount: number | null = null
  let next: StudyMaterialsSource | null = source

  while (next && items.length < TARGET_ITEMS_PER_LOAD) {
    if (next.phase === 'files') {
      const page = await fetchFilesPage(groupId, kind, next.page)
      items.push(...page.items)
      totalCount = page.totalCount
      next = page.nextSource
    } else {
      const legacy = await fetchLegacyChunk(groupId, kind, next.lastChatId)
      items.push(...legacy.items)
      next = legacy.nextSource
      // legacy 청크가 내부에서 목표 개수·페이지 제한까지 훑으므로 한 번이면 충분하다.
      break
    }
  }

  return { items, nextSource: next, totalCount }
}

// 보호된 첨부파일을 인증 요청으로 받은 뒤 원본 파일명으로 내려받는다.
export function downloadStudyMaterial(item: StudyMaterialItem): Promise<void> {
  return downloadAttachment(item.url, item.originalFilename)
}
