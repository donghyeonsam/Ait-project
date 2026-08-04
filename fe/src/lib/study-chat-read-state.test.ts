import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { StudyGroupChatMessage } from '@/api/study-group-chat'

// 모듈 내부 메모리 캐시를 테스트마다 비우기 위해 매번 새로 로드한다.
async function loadModule() {
  vi.resetModules()
  return import('@/lib/study-chat-read-state')
}

function createChat(
  overrides: Partial<StudyGroupChatMessage> = {},
): StudyGroupChatMessage {
  return {
    chatId: 1,
    groupId: 10,
    senderId: 2,
    senderNickname: '김싸피',
    profileImageUrl: null,
    message: '안녕하세요',
    createdAt: '2026-08-04T10:00:00Z',
    ...overrides,
  }
}

beforeEach(() => {
  localStorage.clear()
})

describe('markStudyChatRead / readLastReadMap', () => {
  it('그룹별 마지막 읽은 chatId를 기록하고 다시 읽는다', async () => {
    const { markStudyChatRead, readLastReadMap } = await loadModule()

    markStudyChatRead(1, 10, 5)
    markStudyChatRead(1, 20, 7)

    expect(readLastReadMap(1)).toEqual({ 10: 5, 20: 7 })
  })

  it('저장값보다 작은 chatId는 무시한다', async () => {
    const { markStudyChatRead, readLastReadMap } = await loadModule()

    markStudyChatRead(1, 10, 5)
    markStudyChatRead(1, 10, 3)

    expect(readLastReadMap(1)).toEqual({ 10: 5 })
  })

  it('계정별로 분리해 저장한다', async () => {
    const { markStudyChatRead, readLastReadMap } = await loadModule()

    markStudyChatRead(1, 10, 5)
    markStudyChatRead(2, 10, 9)

    expect(readLastReadMap(1)).toEqual({ 10: 5 })
    expect(readLastReadMap(2)).toEqual({ 10: 9 })
  })

  it('깨진 저장값은 빈 맵으로 처리한다', async () => {
    localStorage.setItem('ait-study-chat-last-read:1', '{잘못된 json')
    const { readLastReadMap } = await loadModule()

    expect(readLastReadMap(1)).toEqual({})
  })

  it('localStorage 접근이 막혀도 메모리로 동작한다', async () => {
    const { markStudyChatRead, readLastReadMap } = await loadModule()
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('접근 불가')
    })

    markStudyChatRead(1, 10, 5)

    expect(readLastReadMap(1)).toEqual({ 10: 5 })
    vi.restoreAllMocks()
  })
})

describe('markStudyChatReadBulk', () => {
  it('여러 그룹을 한 번에 기록하되 더 큰 저장값은 유지한다', async () => {
    const { markStudyChatRead, markStudyChatReadBulk, readLastReadMap } =
      await loadModule()

    markStudyChatRead(1, 10, 9)
    markStudyChatReadBulk(1, [
      [10, 5],
      [20, 7],
    ])

    expect(readLastReadMap(1)).toEqual({ 10: 9, 20: 7 })
  })
})

describe('pruneStudyChatReadState', () => {
  it('목록에 없는 그룹의 기록을 제거한다', async () => {
    const { markStudyChatRead, pruneStudyChatReadState, readLastReadMap } =
      await loadModule()

    markStudyChatRead(1, 10, 5)
    markStudyChatRead(1, 20, 7)
    pruneStudyChatReadState(1, new Set([10]))

    expect(readLastReadMap(1)).toEqual({ 10: 5 })
  })
})

describe('subscribeStudyChatReadState', () => {
  it('읽음 기록이 갱신될 때 구독자에게 알리고 해제하면 멈춘다', async () => {
    const { markStudyChatRead, subscribeStudyChatReadState } =
      await loadModule()
    const listener = vi.fn()
    const unsubscribe = subscribeStudyChatReadState(listener)

    markStudyChatRead(1, 10, 5)
    expect(listener).toHaveBeenCalledTimes(1)

    // 변화 없는 기록(더 작은 chatId)은 알리지 않는다.
    markStudyChatRead(1, 10, 3)
    expect(listener).toHaveBeenCalledTimes(1)

    unsubscribe()
    markStudyChatRead(1, 10, 9)
    expect(listener).toHaveBeenCalledTimes(1)
  })
})

describe('countUnreadChats', () => {
  it('마지막 읽은 chatId 이후의 남의 메시지만 센다', async () => {
    const { countUnreadChats } = await loadModule()
    const chats = [
      createChat({ chatId: 5, senderId: 2 }),
      createChat({ chatId: 4, senderId: 1 }),
      createChat({ chatId: 3, senderId: 2 }),
      createChat({ chatId: 2, senderId: 2 }),
    ]

    expect(countUnreadChats(chats, 2, 1)).toBe(2)
  })

  it('기록이 없으면 남의 메시지 전체를 센다', async () => {
    const { countUnreadChats } = await loadModule()
    const chats = [
      createChat({ chatId: 2, senderId: 2 }),
      createChat({ chatId: 1, senderId: 1 }),
    ]

    expect(countUnreadChats(chats, undefined, 1)).toBe(1)
  })
})
