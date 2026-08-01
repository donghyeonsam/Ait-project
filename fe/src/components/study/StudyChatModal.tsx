import { Pin, UsersRound } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toErrorMessage } from '@/api/http'
import {
  applyStudyGroupChatReactionUpdate,
  connectStudyGroupChat,
  getStudyGroupChats,
  sendStudyGroupChatMessage,
  setStudyGroupChatReactionForUser,
  toggleStudyGroupChatReaction,
  type StudyGroupChatMessage,
} from '@/api/study-group-chat'
import {
  getMyActiveStudyGroups,
  getStudyGroupDetail,
  type MyStudyGroup,
  type StudyGroupDetail,
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
import { useAuth } from '@/lib/useAuth'
import type { Client } from '@stomp/stompjs'

interface StudyChatModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type HeaderPopover = 'groups' | 'members' | null

// 참여 중인 그룹을 전환하며 실제 공지와 실시간 메시지를 주고받는 플로팅 그룹톡 Dialog다.
export function StudyChatModal({ open, onOpenChange }: StudyChatModalProps) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const currentUserId = user?.userId ?? null

  const [groups, setGroups] = useState<MyStudyGroup[]>([])
  const [isLoadingGroups, setIsLoadingGroups] = useState(false)
  const [groupsError, setGroupsError] = useState<string | null>(null)
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null)
  const [groupPreviews, setGroupPreviews] = useState<StudyChatPreviewMap>({})

  const [selectedGroupDetail, setSelectedGroupDetail] =
    useState<StudyGroupDetail | null>(null)
  const [messages, setMessages] = useState<StudyGroupChatMessage[]>([])
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [messagesError, setMessagesError] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const [connectError, setConnectError] = useState<string | null>(null)
  const [headerPopover, setHeaderPopover] = useState<HeaderPopover>(null)

  const clientRef = useRef<Client | null>(null)
  const headerAreaRef = useRef<HTMLDivElement>(null)
  const groupTriggerRef = useRef<HTMLButtonElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
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
        setSelectedGroupDetail(null)
        setIsLoadingMessages(myGroups.length > 0)
        setMessagesError(null)
        setConnectError(null)
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
        setSelectedGroupDetail(detail)
        setNotice(detail.notice ?? '')
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [open, selectedGroupId])

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
    if (!open || headerPopover === null) return

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!headerAreaRef.current?.contains(event.target as Node)) {
        setHeaderPopover(null)
      }
    }
    document.addEventListener('pointerdown', closeOnOutsidePointer)
    return () =>
      document.removeEventListener('pointerdown', closeOnOutsidePointer)
  }, [headerPopover, open])

  const sendMessage = (content: string) => {
    if (selectedGroupId === null || !clientRef.current?.connected) return false
    sendStudyGroupChatMessage(clientRef.current, selectedGroupId, content)
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
    setHeaderPopover(null)
    if (groupId === selectedGroupId) return
    // TODO: 실제 API 연동 필요 - 백엔드에 그룹별 읽음 처리 API가 추가되면 전환 시 호출한다.
    setMessages([])
    setNotice('')
    setSelectedGroupDetail(null)
    setIsLoadingMessages(true)
    setMessagesError(null)
    setConnectError(null)
    setSelectedGroupId(groupId)
  }

  const findNewGroup = () => {
    setHeaderPopover(null)
    onOpenChange(false)
    navigate('/study')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        id="study-chat-dialog"
        centered={false}
        showCloseButton={false}
        overlayClassName="study-chat-overlay"
        className="study-chat-dialog flex min-h-0 flex-col overflow-hidden border border-border-default bg-surface-default p-0"
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
          if (headerPopover !== null) {
            event.preventDefault()
            setHeaderPopover(null)
          }
        }}
      >
        <DialogTitle className="sr-only">그룹톡</DialogTitle>
        <DialogDescription className="sr-only">
          참여 중인 스터디 그룹을 전환하고 공지와 메시지를 확인합니다.
        </DialogDescription>

        <div ref={headerAreaRef} className="relative shrink-0">
          <StudyChatHeader
            group={selectedGroup}
            members={selectedGroupDetail?.members ?? []}
            isLoadingGroup={isLoadingGroups}
            isConnected={isConnected}
            isGroupSwitcherOpen={headerPopover === 'groups'}
            isMemberListOpen={headerPopover === 'members'}
            groupSwitcherId="study-chat-group-switcher"
            groupTriggerRef={groupTriggerRef}
            onToggleGroupSwitcher={() =>
              setHeaderPopover((current) =>
                current === 'groups' ? null : 'groups',
              )
            }
            onToggleMemberList={() =>
              setHeaderPopover((current) =>
                current === 'members' ? null : 'members',
              )
            }
          />

          {headerPopover === 'groups' ? (
            <StudyChatGroupSwitcher
              id="study-chat-group-switcher"
              groups={groups}
              selectedGroupId={selectedGroupId}
              previews={groupPreviews}
              onSelect={selectGroup}
              onFindGroup={findNewGroup}
              onClose={() => {
                setHeaderPopover(null)
                groupTriggerRef.current?.focus()
              }}
              // TODO: 실제 API 연동 필요 - 백엔드에 읽음 상태와 모두 읽음 API가 아직 없다.
            />
          ) : null}
        </div>

        {notice ? (
          <div className="mx-4 mt-4 flex shrink-0 items-center gap-2 rounded-ait-m border border-status-info-border bg-status-info-surface px-4 py-3 text-body-2 text-action-primary sm:mx-6">
            <Pin className="size-4 shrink-0" aria-hidden="true" />
            <p className="min-w-0 truncate">
              <span className="font-semibold">이번 주 주제 · </span>
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
          />
        )}

        <StudyChatComposer
          key={selectedGroupId ?? 'no-group'}
          isConnected={isConnected}
          connectError={connectError}
          onSend={sendMessage}
        />
      </DialogContent>
    </Dialog>
  )
}
