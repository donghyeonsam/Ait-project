import { Pin, UsersRound } from 'lucide-react'
import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { toErrorMessage } from '@/api/http'
import {
  applyStudyGroupChatReactionUpdate,
  connectStudyGroupChat,
  getStudyGroupChats,
  sendStudyGroupChatFileMessage,
  sendStudyGroupChatMessage,
  setStudyGroupChatReactionForUser,
  toggleStudyGroupChatReaction,
  type StudyGroupChatFile,
  type StudyGroupChatMessage,
} from '@/api/study-group-chat'
import {
  getMyActiveStudyGroups,
  getStudyGroupDetail,
  type MyStudyGroup,
} from '@/api/study-groups'
import { StudyChatComposer } from '@/components/study/StudyChatComposer'
import {
  StudyChatGroupSwitcher,
  type StudyChatPreviewMap,
} from '@/components/study/StudyChatGroupSwitcher'
import { StudyChatHeader } from '@/components/study/StudyChatHeader'
import { StudyChatMessageList } from '@/components/study/StudyChatMessageList'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { markStudyChatRead } from '@/lib/study-chat-read-state'
import type { StudyChatReplyTarget } from '@/lib/study-chat-reply'
import { useAuth } from '@/lib/useAuth'
import { useStudyChat } from '@/lib/useStudyChat'
import type { Client } from '@stomp/stompjs'

interface StudyChatModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface ChatPosition {
  x: number
  y: number
}

interface ChatDragState {
  pointerId: number
  startPointerX: number
  startPointerY: number
  startPosition: ChatPosition
  startRect: DOMRect
}

const minimumVisibleChatEdge = 72

// 참여 중인 그룹을 전환하며 실제 공지와 실시간 메시지를 주고받는 플로팅 그룹톡 Dialog다.
export function StudyChatModal({ open, onOpenChange }: StudyChatModalProps) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const currentUserId = user?.userId ?? null
  const { unreadByGroup, markAllRead } = useStudyChat()

  const [groups, setGroups] = useState<MyStudyGroup[]>([])
  const [isLoadingGroups, setIsLoadingGroups] = useState(false)
  const [groupsError, setGroupsError] = useState<string | null>(null)
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null)
  const [groupPreviews, setGroupPreviews] = useState<StudyChatPreviewMap>({})

  const [messages, setMessages] = useState<StudyGroupChatMessage[]>([])
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [messagesError, setMessagesError] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const [connectError, setConnectError] = useState<string | null>(null)
  const [isGroupSwitcherOpen, setIsGroupSwitcherOpen] = useState(false)
  const [replyTarget, setReplyTarget] = useState<StudyChatReplyTarget | null>(
    null,
  )
  const [chatPosition, setChatPosition] = useState<ChatPosition>({ x: 0, y: 0 })

  const clientRef = useRef<Client | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const headerAreaRef = useRef<HTMLDivElement>(null)
  const groupTriggerRef = useRef<HTMLButtonElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const dragStateRef = useRef<ChatDragState | null>(null)
  const selectedGroup =
    groups.find((group) => group.id === selectedGroupId) ?? null

  // 모달이 열릴 때 내가 활동 중인 그룹 목록을 불러오고 기존 선택 또는 첫 그룹을 연다.
  useEffect(() => {
    if (!open) return

    let cancelled = false
    const loadGroups = async () => {
      setIsLoadingGroups(true)
      setGroupsError(null)
      try {
        const myGroups = await getMyActiveStudyGroups()
        if (cancelled) return
        setMessages([])
        setNotice('')
        setIsLoadingMessages(myGroups.length > 0)
        setMessagesError(null)
        setConnectError(null)
        setReplyTarget(null)
        setGroupPreviews(
          Object.fromEntries(myGroups.map((group) => [group.id, undefined])),
        )
        setGroups(myGroups)
        setSelectedGroupId((current) =>
          current !== null && myGroups.some((group) => group.id === current)
            ? current
            : (myGroups[0]?.id ?? null),
        )
      } catch (error) {
        if (!cancelled) setGroupsError(toErrorMessage(error))
      } finally {
        if (!cancelled) setIsLoadingGroups(false)
      }
    }

    void loadGroups()
    return () => {
      cancelled = true
    }
  }, [open])

  // 별도 최근 대화 API가 없어 기존 이력 조회의 첫 메시지만 그룹 전환 목록에 사용한다.
  useEffect(() => {
    if (!open || groups.length === 0) return

    let cancelled = false
    groups.forEach((group) => {
      getStudyGroupChats(group.id)
        .then((result) => {
          if (!cancelled) {
            setGroupPreviews((current) => ({
              ...current,
              [group.id]: result.chats[0] ?? null,
            }))
          }
        })
        .catch(() => {
          if (!cancelled) {
            setGroupPreviews((current) => ({
              ...current,
              [group.id]: null,
            }))
          }
        })
    })

    return () => {
      cancelled = true
    }
  }, [groups, open])

  // 선택한 그룹의 메시지·공지·멤버 정보를 기존 REST API에서 함께 갱신한다.
  useEffect(() => {
    if (!open || selectedGroupId === null) return

    let cancelled = false

    getStudyGroupChats(selectedGroupId)
      .then((result) => {
        if (cancelled) return
        const chronologicalMessages = [...result.chats].reverse()
        setMessages(chronologicalMessages)
        setGroupPreviews((current) => ({
          ...current,
          [selectedGroupId]: result.chats[0] ?? null,
        }))
        // 보고 있는 그룹은 불러온 최신 메시지까지 읽음으로 기록한다.
        // TODO: 실제 API 연동 필요 - 읽음 상태는 현재 이 기기 localStorage에만 기록하며 서버 읽음 API가 생기면 대체한다.
        const latestChatId = result.chats[0]?.chatId
        if (currentUserId !== null && latestChatId !== undefined) {
          markStudyChatRead(currentUserId, selectedGroupId, latestChatId)
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) setMessagesError(toErrorMessage(error))
      })
      .finally(() => {
        if (!cancelled) setIsLoadingMessages(false)
      })

    getStudyGroupDetail(selectedGroupId)
      .then((detail) => {
        if (cancelled) return
        setNotice(detail.notice ?? '')
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [currentUserId, open, selectedGroupId])

  // 선택한 그룹의 실시간 메시지·공지·반응 연결을 열고 그룹 전환 시 이전 연결을 정리한다.
  useEffect(() => {
    if (!open || selectedGroupId === null) return

    const client = connectStudyGroupChat(selectedGroupId, {
      onMessage: (incoming) => {
        setMessages((current) =>
          current.some((message) => message.chatId === incoming.chatId)
            ? current
            : [...current, incoming],
        )
        setGroupPreviews((current) => ({
          ...current,
          [incoming.groupId]: incoming,
        }))
        // 보고 있는 그룹의 실시간 수신은 즉시 읽음으로 기록한다.
        if (currentUserId !== null && incoming.groupId === selectedGroupId) {
          markStudyChatRead(currentUserId, selectedGroupId, incoming.chatId)
        }
      },
      onNotice: (payload) => setNotice(payload.notice ?? ''),
      onReaction: (payload) => {
        setMessages((current) =>
          current.map((message) =>
            message.chatId === payload.chatId
              ? {
                  ...message,
                  reactions: applyStudyGroupChatReactionUpdate(
                    message.reactions,
                    payload,
                    currentUserId,
                  ),
                }
              : message,
          ),
        )
      },
      onConnect: () => {
        setIsConnected(true)
        setConnectError(null)
      },
      onDisconnect: () => setIsConnected(false),
      onError: (message) => setConnectError(message),
    })
    clientRef.current = client

    return () => {
      clientRef.current = null
      setIsConnected(false)
      void client.deactivate()
    }
  }, [currentUserId, open, selectedGroupId])

  useEffect(() => {
    if (!open || !isGroupSwitcherOpen) return

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!headerAreaRef.current?.contains(event.target as Node)) {
        setIsGroupSwitcherOpen(false)
      }
    }
    document.addEventListener('pointerdown', closeOnOutsidePointer)
    return () =>
      document.removeEventListener('pointerdown', closeOnOutsidePointer)
  }, [isGroupSwitcherOpen, open])

  const sendMessage = (content: string) => {
    if (selectedGroupId === null || !clientRef.current?.connected) return false
    sendStudyGroupChatMessage(clientRef.current, selectedGroupId, content)
    return true
  }

  const sendFileMessage = (
    files: StudyGroupChatFile[],
    message: string | null,
  ) => {
    if (selectedGroupId === null || !clientRef.current?.connected) return false
    sendStudyGroupChatFileMessage(
      clientRef.current,
      selectedGroupId,
      files,
      message,
    )
    return true
  }

  const toggleReaction = (chatId: number, emoji: string) => {
    if (selectedGroupId === null || !clientRef.current?.connected) return

    if (currentUserId !== null) {
      setMessages((current) =>
        current.map((message) => {
          if (message.chatId !== chatId) return message

          const reacted = !message.reactions?.some(
            (reaction) =>
              reaction.emoji === emoji &&
              reaction.userIds.includes(currentUserId),
          )
          return {
            ...message,
            reactions: setStudyGroupChatReactionForUser(
              message.reactions,
              emoji,
              currentUserId,
              reacted,
            ),
          }
        }),
      )
    }

    toggleStudyGroupChatReaction(
      clientRef.current,
      selectedGroupId,
      chatId,
      emoji,
    )
  }

  const selectGroup = (groupId: number) => {
    setIsGroupSwitcherOpen(false)
    if (groupId === selectedGroupId) return
    setMessages([])
    setNotice('')
    setIsLoadingMessages(true)
    setMessagesError(null)
    setConnectError(null)
    setReplyTarget(null)
    setSelectedGroupId(groupId)
  }

  const findNewGroup = () => {
    setIsGroupSwitcherOpen(false)
    onOpenChange(false)
    navigate('/study')
  }

  const startDragging = (event: ReactPointerEvent<HTMLDivElement>) => {
    const target = event.target
    if (
      event.button !== 0 ||
      !(target instanceof Element) ||
      !target.closest('[data-study-chat-drag-handle]') ||
      target.closest('button, input, textarea, select, a, [role="button"]')
    ) {
      return
    }

    const dialog = dialogRef.current
    if (!dialog) return

    dragStateRef.current = {
      pointerId: event.pointerId,
      startPointerX: event.clientX,
      startPointerY: event.clientY,
      startPosition: chatPosition,
      startRect: dialog.getBoundingClientRect(),
    }
    event.currentTarget.setPointerCapture?.(event.pointerId)
    event.preventDefault()
  }

  const moveWhileDragging = (event: ReactPointerEvent<HTMLDivElement>) => {
    const dragState = dragStateRef.current
    if (!dragState || dragState.pointerId !== event.pointerId) return

    const deltaX = event.clientX - dragState.startPointerX
    const deltaY = event.clientY - dragState.startPointerY
    let nextX = dragState.startPosition.x + deltaX
    let nextY = dragState.startPosition.y + deltaY

    // 모달을 옮긴 뒤에도 헤더를 다시 잡을 수 있도록 최소 영역은 화면 안에 남긴다.
    if (dragState.startRect.width > 0 && dragState.startRect.height > 0) {
      const unclampedLeft = dragState.startRect.left + deltaX
      const unclampedTop = dragState.startRect.top + deltaY
      const left = Math.min(
        Math.max(
          unclampedLeft,
          minimumVisibleChatEdge - dragState.startRect.width,
        ),
        window.innerWidth - minimumVisibleChatEdge,
      )
      const top = Math.min(
        Math.max(unclampedTop, 0),
        window.innerHeight - minimumVisibleChatEdge,
      )
      nextX = dragState.startPosition.x + left - dragState.startRect.left
      nextY = dragState.startPosition.y + top - dragState.startRect.top
    }

    setChatPosition({ x: nextX, y: nextY })
  }

  const stopDragging = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragStateRef.current?.pointerId !== event.pointerId) return
    dragStateRef.current = null
    event.currentTarget.releasePointerCapture?.(event.pointerId)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        ref={dialogRef}
        id="study-chat-dialog"
        data-study-chat-surface
        centered={false}
        showCloseButton={false}
        overlayClassName="study-chat-overlay"
        className="study-chat-dialog flex min-h-0 flex-col overflow-hidden border border-border-default bg-surface-default p-0"
        style={{
          transform: `translate3d(${chatPosition.x}px, ${chatPosition.y}px, 0)`,
        }}
        onOpenAutoFocus={(event) => {
          event.preventDefault()
          previousFocusRef.current = document.activeElement as HTMLElement | null
          groupTriggerRef.current?.focus()
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          previousFocusRef.current?.focus()
        }}
        onEscapeKeyDown={(event) => {
          if (isGroupSwitcherOpen) {
            event.preventDefault()
            setIsGroupSwitcherOpen(false)
          }
        }}
      >
        <DialogTitle className="sr-only">그룹톡</DialogTitle>
        <DialogDescription className="sr-only">
          참여 중인 스터디 그룹을 전환하고 공지와 메시지를 확인합니다.
        </DialogDescription>

        <div
          ref={headerAreaRef}
          className="relative shrink-0"
          onPointerDown={startDragging}
          onPointerMove={moveWhileDragging}
          onPointerUp={stopDragging}
          onPointerCancel={stopDragging}
        >
          <StudyChatHeader
            group={selectedGroup}
            isLoadingGroup={isLoadingGroups}
            isConnected={isConnected}
            isGroupSwitcherOpen={isGroupSwitcherOpen}
            groupSwitcherId="study-chat-group-switcher"
            groupTriggerRef={groupTriggerRef}
            onToggleGroupSwitcher={() =>
              setIsGroupSwitcherOpen((current) => !current)
            }
          />

          {isGroupSwitcherOpen ? (
            <StudyChatGroupSwitcher
              id="study-chat-group-switcher"
              groups={groups}
              selectedGroupId={selectedGroupId}
              previews={groupPreviews}
              unreadCounts={unreadByGroup}
              onSelect={selectGroup}
              onFindGroup={findNewGroup}
              onClose={() => {
                setIsGroupSwitcherOpen(false)
                groupTriggerRef.current?.focus()
              }}
              onMarkAllRead={markAllRead}
            />
          ) : null}
        </div>

        {notice ? (
          <div className="mx-4 mt-4 flex shrink-0 items-center gap-2 rounded-ait-m border border-status-info-border bg-status-info-surface px-4 py-3 text-body-2 text-action-primary sm:mx-6">
            <Pin className="size-4 shrink-0" aria-hidden="true" />
            <p className="min-w-0 truncate">
              <span className="font-semibold">공지 · </span>
              {notice}
            </p>
          </div>
        ) : null}

        {isLoadingGroups ? (
          <div className="flex min-h-0 flex-1 flex-col gap-5 px-6 py-8" role="status" aria-label="그룹톡 불러오는 중">
            <Skeleton className="h-12 w-full rounded-ait-m" />
            <Skeleton className="h-20 w-56 rounded-ait-l" />
            <Skeleton className="ml-auto h-16 w-64 rounded-ait-l" />
          </div>
        ) : groupsError ? (
          <div className="flex min-h-0 flex-1 items-center justify-center px-6 text-center text-body-2 text-status-error" role="alert">
            {groupsError}
          </div>
        ) : groups.length === 0 ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <span className="flex size-14 items-center justify-center rounded-ait-pill bg-loading-pastel-violet text-tag-role">
              <UsersRound className="size-7" aria-hidden="true" />
            </span>
            <div>
              <p className="text-body-1 font-semibold text-action-primary">
                참여 중인 스터디 그룹이 없습니다.
              </p>
              <p className="mt-1 text-body-2 text-text-secondary">
                스터디 라운지에서 함께할 그룹을 찾아보세요.
              </p>
            </div>
            <button
              type="button"
              onClick={findNewGroup}
              className="rounded-ait-s border border-action-primary px-4 py-2 text-body-2 font-semibold text-action-primary hover:bg-status-info-surface focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-action-primary/25"
            >
              새로운 그룹 찾아보기
            </button>
          </div>
        ) : (
          <StudyChatMessageList
            groupId={selectedGroupId}
            groupTitle={selectedGroup?.title ?? '스터디'}
            messages={messages}
            currentUserId={currentUserId}
            isLoading={isLoadingMessages}
            error={messagesError}
            onToggleReaction={toggleReaction}
            onReply={setReplyTarget}
          />
        )}

        <StudyChatComposer
          key={selectedGroupId ?? 'no-group'}
          isConnected={isConnected}
          connectError={connectError}
          onSend={sendMessage}
          onSendFiles={sendFileMessage}
          replyTarget={replyTarget}
          onCancelReply={() => setReplyTarget(null)}
        />
      </DialogContent>
    </Dialog>
  )
}
