import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { Client } from '@stomp/stompjs'
import {
  connectStudyGroupChatMulti,
  getStudyGroupChats,
  type StudyGroupChatMessage,
} from '@/api/study-group-chat'
import { getMyActiveStudyGroups } from '@/api/study-groups'
import { StudyChatContext } from '@/app/study-chat-context'
import { StudyChatModal } from '@/components/study/StudyChatModal'
import {
  markStudyChatRead,
  pruneStudyChatReadState,
  readLastReadMap,
  subscribeStudyChatReadState,
} from '@/lib/study-chat-read-state'
import { useAuth } from '@/lib/useAuth'

interface StudyChatProviderProps {
  children: ReactNode
}

// 페이지마다 헤더가 리마운트되어도 유지되도록 창 포커스 재계산의 최소 간격을 모듈 상수로 둔다.
const focusRefreshIntervalMs = 30_000

// 전 그룹의 안읽은 그룹톡 수를 어느 화면에서든 실시간으로 제공하고, 그룹톡 모달을 라우트와 무관하게 유지한다.
export function StudyChatProvider({ children }: StudyChatProviderProps) {
  const { user } = useAuth()
  const userId = user?.userId ?? null

  const [isChatOpen, setIsChatOpen] = useState(false)
  const [unreadByGroup, setUnreadByGroup] = useState<Record<
    number,
    number
  > | null>(null)
  const [refreshTick, setRefreshTick] = useState(0)
  // 그룹별 안읽은 chatId 집합. Set이라 모달·인라인 패널과 같은 메시지를 이중 수신해도 중복 카운트되지 않는다.
  const unreadSetsRef = useRef(new Map<number, Set<number>>())
  const lastLoadedAtRef = useRef(0)

  const recomputeCounts = useCallback(() => {
    const counts: Record<number, number> = {}
    unreadSetsRef.current.forEach((chatIds, groupId) => {
      counts[groupId] = chatIds.size
    })
    setUnreadByGroup(counts)
  }, [])

  const refresh = useCallback(() => {
    setRefreshTick((tick) => tick + 1)
  }, [])

  // 활동 중인 그룹 목록과 그룹별 최근 이력으로 안읽음 집합을 계산하고 STOMP 구독 대상 그룹을 반환한다.
  const loadUnreadState = useCallback(
    async (targetUserId: number) => {
      lastLoadedAtRef.current = Date.now()
      const groups = await getMyActiveStudyGroups()
      const groupIds = groups.map((group) => group.id)
      const lastReadMap = readLastReadMap(targetUserId)

      const results = await Promise.all(
        groupIds.map(async (groupId) => {
          // 일부 그룹 조회가 실패해도 나머지 배지는 유지되도록 실패 그룹은 0으로 둔다.
          try {
            const { chats } = await getStudyGroupChats(groupId)
            return { groupId, chats }
          } catch {
            return { groupId, chats: [] as StudyGroupChatMessage[] }
          }
        }),
      )

      const nextSets = new Map<number, Set<number>>()
      results.forEach(({ groupId, chats }) => {
        const lastReadChatId = lastReadMap[groupId]

        // 첫 방문 그룹은 최신 메시지를 기준점으로 저장하고 0부터 시작한다 — 과거 이력 전체가 안읽음으로 잡히는 노이즈를 막는다.
        if (lastReadChatId === undefined) {
          const latestChatId = chats[0]?.chatId
          if (latestChatId !== undefined) {
            markStudyChatRead(targetUserId, groupId, latestChatId)
          }
          nextSets.set(groupId, new Set())
          return
        }

        // 이력 조회가 최근 50건까지만 반환하므로 그보다 오래된 안읽음은 세지 않는다(버튼에서 99+로 축약).
        const unreadChatIds = chats
          .filter(
            (chat) =>
              chat.chatId > lastReadChatId && chat.senderId !== targetUserId,
          )
          .map((chat) => chat.chatId)
        nextSets.set(groupId, new Set(unreadChatIds))
      })

      unreadSetsRef.current = nextSets
      pruneStudyChatReadState(targetUserId, new Set(groupIds))
      recomputeCounts()
      return groupIds
    },
    [recomputeCounts],
  )

  // 초기 계산 후 전 그룹 메시지 토픽을 한 연결로 구독해 어느 화면에서든 배지를 실시간 갱신한다.
  useEffect(() => {
    if (userId === null) {
      unreadSetsRef.current = new Map()
      setUnreadByGroup(null)
      return
    }

    let cancelled = false
    let client: Client | null = null

    loadUnreadState(userId)
      .then((groupIds) => {
        if (cancelled || groupIds.length === 0) return
        client = connectStudyGroupChatMulti(groupIds, {
          onMessage: (incoming) => {
            if (incoming.senderId === userId) return
            const lastReadChatId =
              readLastReadMap(userId)[incoming.groupId] ?? 0
            if (incoming.chatId <= lastReadChatId) return

            const chatIds =
              unreadSetsRef.current.get(incoming.groupId) ?? new Set<number>()
            chatIds.add(incoming.chatId)
            unreadSetsRef.current.set(incoming.groupId, chatIds)
            recomputeCounts()
          },
        })
      })
      .catch(() => {
        // 목록 조회 실패 시 배지를 숨긴 채 두고 다음 재계산 트리거에서 다시 시도한다.
      })

    return () => {
      cancelled = true
      if (client) void client.deactivate()
    }
  }, [userId, refreshTick, loadUnreadState, recomputeCounts])

  // 모달·인라인 패널 어디서든 읽음 기록이 갱신되면 해당 chatId를 집합에서 걷어내 배지를 즉시 줄인다.
  useEffect(() => {
    if (userId === null) return

    return subscribeStudyChatReadState(() => {
      const lastReadMap = readLastReadMap(userId)
      let changed = false
      unreadSetsRef.current.forEach((chatIds, groupId) => {
        const lastReadChatId = lastReadMap[groupId] ?? 0
        chatIds.forEach((chatId) => {
          if (chatId <= lastReadChatId) {
            chatIds.delete(chatId)
            changed = true
          }
        })
      })
      if (changed) recomputeCounts()
    })
  }, [userId, recomputeCounts])

  // 가입·탈퇴로 그룹 목록이 바뀌었을 수 있어 창 포커스 시 재계산하되 스로틀로 과도한 재조회를 막는다.
  useEffect(() => {
    if (userId === null) return

    const handleFocus = () => {
      if (Date.now() - lastLoadedAtRef.current < focusRefreshIntervalMs) return
      refresh()
    }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [userId, refresh])

  const openChat = useCallback(() => setIsChatOpen(true), [])
  const closeChat = useCallback(() => setIsChatOpen(false), [])

  // 모달이 닫히면 안에서 읽은 그룹들을 서버 이력 기준으로 다시 맞춘다.
  const handleModalOpenChange = useCallback(
    (open: boolean) => {
      setIsChatOpen(open)
      if (!open) refresh()
    },
    [refresh],
  )

  const totalUnread = useMemo(() => {
    if (unreadByGroup === null) return undefined
    return Object.values(unreadByGroup).reduce((sum, count) => sum + count, 0)
  }, [unreadByGroup])

  const value = useMemo(
    () => ({
      totalUnread,
      unreadByGroup: unreadByGroup ?? {},
      isChatOpen,
      openChat,
      closeChat,
      refresh,
    }),
    [totalUnread, unreadByGroup, isChatOpen, openChat, closeChat, refresh],
  )

  return (
    <StudyChatContext.Provider value={value}>
      {children}
      <StudyChatModal open={isChatOpen} onOpenChange={handleModalOpenChange} />
    </StudyChatContext.Provider>
  )
}
