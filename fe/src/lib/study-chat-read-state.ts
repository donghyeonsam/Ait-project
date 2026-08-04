// 그룹톡의 그룹별 마지막 읽은 chatId를 계정 단위로 저장·조회하는 모듈.
// TODO: 실제 API 연동 필요 - 읽음 상태는 현재 이 기기 localStorage에만 기록하며 서버 읽음 API가 생기면 대체한다.
import type { StudyGroupChatMessage } from '@/api/study-group-chat'

type LastReadMap = Record<number, number>

const storageKeyPrefix = 'ait-study-chat-last-read'

// localStorage 접근 불가(프라이빗 모드 등) 시에도 세션 동안 배지가 동작하도록 메모리 캐시를 진실 소스로 쓴다.
const memoryCache = new Map<number, LastReadMap>()
const listeners = new Set<() => void>()

function storageKey(userId: number) {
  return `${storageKeyPrefix}:${userId}`
}

function readFromStorage(userId: number): LastReadMap {
  try {
    const raw = localStorage.getItem(storageKey(userId))
    const parsed: unknown = raw ? JSON.parse(raw) : null
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {}
    }

    const map: LastReadMap = {}
    for (const [groupId, chatId] of Object.entries(parsed)) {
      const numericGroupId = Number(groupId)
      if (Number.isFinite(numericGroupId) && typeof chatId === 'number') {
        map[numericGroupId] = chatId
      }
    }
    return map
  } catch {
    return {}
  }
}

function persist(userId: number, map: LastReadMap) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(map))
  } catch {
    // 저장 실패 시 메모리 캐시로만 유지하고 조용히 넘어간다.
  }
}

function notify() {
  listeners.forEach((listener) => listener())
}

export function readLastReadMap(userId: number): LastReadMap {
  const cached = memoryCache.get(userId)
  if (cached) return cached

  const stored = readFromStorage(userId)
  memoryCache.set(userId, stored)
  return stored
}

// 저장값보다 큰 chatId일 때만 갱신한다 — 과거 이력 재로드로 읽음 위치가 되돌아가지 않게 한다.
export function markStudyChatRead(
  userId: number,
  groupId: number,
  chatId: number,
) {
  const map = readLastReadMap(userId)
  if ((map[groupId] ?? 0) >= chatId) return

  const next = { ...map, [groupId]: chatId }
  memoryCache.set(userId, next)
  persist(userId, next)
  notify()
}

export function markStudyChatReadBulk(
  userId: number,
  entries: Array<[groupId: number, chatId: number]>,
) {
  const map = readLastReadMap(userId)
  let changed = false
  const next = { ...map }

  for (const [groupId, chatId] of entries) {
    if ((next[groupId] ?? 0) >= chatId) continue
    next[groupId] = chatId
    changed = true
  }

  if (!changed) return
  memoryCache.set(userId, next)
  persist(userId, next)
  notify()
}

// 탈퇴·삭제로 목록에서 사라진 그룹의 읽음 기록을 정리한다.
export function pruneStudyChatReadState(
  userId: number,
  validGroupIds: Set<number>,
) {
  const map = readLastReadMap(userId)
  const staleIds = Object.keys(map)
    .map(Number)
    .filter((groupId) => !validGroupIds.has(groupId))
  if (staleIds.length === 0) return

  const next = { ...map }
  staleIds.forEach((groupId) => delete next[groupId])
  memoryCache.set(userId, next)
  persist(userId, next)
}

// 같은 탭 안에서 읽음 기록 변경을 구독한다. 반환값은 구독 해제 함수다.
export function subscribeStudyChatReadState(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

// 안읽은 메시지 수를 세는 순수 함수. 내가 보낸 메시지는 제외한다.
export function countUnreadChats(
  chats: StudyGroupChatMessage[],
  lastReadChatId: number | undefined,
  currentUserId: number | null,
) {
  return chats.filter(
    (chat) =>
      chat.chatId > (lastReadChatId ?? 0) &&
      chat.senderId !== currentUserId,
  ).length
}
