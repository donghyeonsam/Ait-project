import { Pin, Send } from 'lucide-react'
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { toErrorMessage } from '@/api/http'
import {
  connectStudyGroupChat,
  getStudyGroupChats,
  sendStudyGroupChatMessage,
  toggleStudyGroupChatReaction,
  type StudyGroupChatMessage,
} from '@/api/study-group-chat'
import {
  getMyActiveStudyGroups,
  getStudyGroupDetail,
  type MyStudyGroup,
} from '@/api/study-groups'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar'
import { useAuth } from '@/lib/useAuth'
import { cn } from '@/lib/utils'
import type { Client } from '@stomp/stompjs'
import { StudyChatMessageReactions } from '@/components/study/StudyChatMessageReactions'

interface StudyChatModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const dockInfluenceDistance = 112
const dockMaximumScale = 1.42
const dockMaximumLift = 10

// 내가 활동 중인 그룹을 골라 공지 확인과 실시간 메시지 송수신을 제공하는 그룹톡 Dialog다.
export function StudyChatModal({ open, onOpenChange }: StudyChatModalProps) {
  const { user } = useAuth()
  const currentUserId = user?.userId ?? null

  const [groups, setGroups] = useState<MyStudyGroup[]>([])
  const [isLoadingGroups, setIsLoadingGroups] = useState(false)
  const [groupsError, setGroupsError] = useState<string | null>(null)
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null)

  const [messages, setMessages] = useState<StudyGroupChatMessage[]>([])
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [messagesError, setMessagesError] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const [connectError, setConnectError] = useState<string | null>(null)
  const [draft, setDraft] = useState('')

  const clientRef = useRef<Client | null>(null)
  const messageListRef = useRef<HTMLDivElement>(null)
  const selectedGroup =
    groups.find((group) => group.id === selectedGroupId) ?? null

  // 모달이 열릴 때 내가 활동 중인 그룹 목록을 불러오고 첫 그룹을 선택한다.
  useEffect(() => {
    if (!open) return

    let cancelled = false

    const loadGroups = async () => {
      setIsLoadingGroups(true)
      setGroupsError(null)
      try {
        const myGroups = await getMyActiveStudyGroups()
        if (cancelled) return
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

  // 선택한 그룹의 최근 메시지 이력과 공지를 불러온다 (최신순 응답을 오래된 순으로 뒤집는다).
  useEffect(() => {
    if (!open || selectedGroupId === null) return

    let cancelled = false

    const loadMessages = async () => {
      setMessages([])
      setNotice('')
      setIsLoadingMessages(true)
      setMessagesError(null)
      try {
        const result = await getStudyGroupChats(selectedGroupId)
        if (!cancelled) setMessages([...result.chats].reverse())
      } catch (error) {
        if (!cancelled) setMessagesError(toErrorMessage(error))
      } finally {
        if (!cancelled) setIsLoadingMessages(false)
      }
    }

    void loadMessages()

    // 공지는 그룹 상세에서 따로 받아오고, 실패해도 채팅은 계속 쓸 수 있게 빈 값으로 둔다.
    getStudyGroupDetail(selectedGroupId)
      .then((detail) => {
        if (!cancelled) setNotice(detail.notice ?? '')
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [open, selectedGroupId])

  // 선택한 그룹의 실시간 메시지·공지 STOMP 연결을 열고, 모달을 닫거나 그룹을 바꾸면 정리한다.
  useEffect(() => {
    if (!open || selectedGroupId === null) return

    const client = connectStudyGroupChat(selectedGroupId, {
      onMessage: (incoming) => {
        setMessages((current) =>
          current.some((message) => message.chatId === incoming.chatId)
            ? current
            : [...current, incoming],
        )
      },
      onNotice: (payload) => setNotice(payload.notice ?? ''),
      onReaction: (payload) => {
        setMessages((current) =>
          current.map((message) =>
            message.chatId === payload.chatId
              ? { ...message, reactions: payload.reactions }
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
  }, [open, selectedGroupId])

  const messageCount = messages.length

  useEffect(() => {
    if (!open) return
    messageListRef.current?.scrollTo({
      top: messageListRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [messageCount, open, selectedGroupId])

  const sendMessage = () => {
    const content = draft.trim()
    if (!content || selectedGroupId === null || !clientRef.current?.connected)
      return

    sendStudyGroupChatMessage(clientRef.current, selectedGroupId, content)
    setDraft('')
  }

  const toggleReaction = (chatId: number, emoji: string) => {
    if (
      selectedGroupId === null ||
      !clientRef.current?.connected
    ) {
      return
    }
    toggleStudyGroupChatReaction(
      clientRef.current,
      selectedGroupId,
      chatId,
      emoji,
    )
  }

  const handleDraftKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      sendMessage()
    }
  }

  const resetDockMagnification = (dock: HTMLElement) => {
    dock
      .querySelectorAll<HTMLElement>('[data-study-chat-dock-item]')
      .forEach((item) => {
        item.style.removeProperty('--study-chat-dock-scale')
        item.style.removeProperty('--study-chat-dock-lift')
      })
  }

  const updateDockMagnification = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    const dock = event.currentTarget
    const dockRect = dock.getBoundingClientRect()

    dock
      .querySelectorAll<HTMLElement>('[data-study-chat-dock-item]')
      .forEach((item) => {
        const itemCenter =
          dockRect.left +
          item.offsetLeft -
          dock.scrollLeft +
          item.offsetWidth / 2
        const proximity = Math.max(
          0,
          1 - Math.abs(event.clientX - itemCenter) / dockInfluenceDistance,
        )
        const easedProximity =
          proximity * proximity * (3 - 2 * proximity)
        const scale =
          1 + (dockMaximumScale - 1) * easedProximity
        const lift = -dockMaximumLift * easedProximity

        item.style.setProperty(
          '--study-chat-dock-scale',
          scale.toFixed(3),
        )
        item.style.setProperty(
          '--study-chat-dock-lift',
          `${lift.toFixed(2)}px`,
        )
      })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        id="study-chat-dialog"
        centered={false}
        className="study-chat-dialog flex flex-col overflow-hidden border border-border-default bg-background-default p-4 sm:p-5"
      >
        <DialogHeader className="shrink-0 text-center">
          <DialogTitle>그룹톡</DialogTitle>
          <DialogDescription className="sr-only">
            참여 중인 스터디 그룹의 공지와 메시지를 확인하고 대화합니다.
          </DialogDescription>
        </DialogHeader>

        {isLoadingGroups ? (
          <p
            className="flex flex-1 items-center justify-center text-body-2 text-text-secondary"
            role="status"
          >
            참여 중인 그룹을 불러오는 중입니다.
          </p>
        ) : groupsError ? (
          <p
            className="flex flex-1 items-center justify-center text-body-2 text-status-error"
            role="alert"
          >
            {groupsError}
          </p>
        ) : groups.length === 0 ? (
          <p className="flex flex-1 items-center justify-center text-body-2 text-text-secondary">
            참여 중인 스터디 그룹이 없습니다. 스터디 라운지에서 그룹에 가입해
            보세요.
          </p>
        ) : (
          <div className="mt-4 flex min-h-0 flex-1 flex-col gap-3">
            <div
              className="study-chat-dock relative flex min-h-24 shrink-0 items-center gap-7 overflow-visible px-5 py-4"
              role="tablist"
              aria-label="스터디 그룹 선택"
              onPointerMove={updateDockMagnification}
              onPointerLeave={(event) =>
                resetDockMagnification(event.currentTarget)
              }
              onPointerCancel={(event) =>
                resetDockMagnification(event.currentTarget)
              }
            >
              {groups.map((group) => {
                const isSelected = group.id === selectedGroupId
                return (
                  <button
                    key={group.id}
                    id={`study-chat-tab-${group.id}`}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    aria-controls="study-chat-panel"
                    aria-label={group.title}
                    title={group.title}
                    onClick={() => setSelectedGroupId(group.id)}
                    className={cn(
                      'study-chat-dock-item relative isolate flex size-12 shrink-0 items-center justify-center rounded-ait-pill border bg-profile-avatar text-body-1 font-semibold text-action-primary',
                      isSelected
                        ? 'study-chat-dock-item-selected border-status-success'
                        : 'border-transparent hover:border-border-default',
                    )}
                    data-study-chat-dock-item
                  >
                    {group.title.trim().charAt(0) || '?'}
                  </button>
                )
              })}
            </div>

            <div
              id="study-chat-panel"
              role="tabpanel"
              aria-labelledby={
                selectedGroupId !== null
                  ? `study-chat-tab-${selectedGroupId}`
                  : undefined
              }
              className="flex min-h-0 flex-col rounded-ait-m bg-surface-default p-3 sm:p-4"
            >
              {notice ? (
                <div className="flex shrink-0 items-center gap-2 rounded-ait-s border border-status-achievement-border bg-status-achievement-surface px-3 py-3 text-body-2 text-action-primary">
                  <Pin className="size-4 shrink-0" aria-hidden="true" />
                  <p className="truncate">
                    <span className="font-semibold">공지 · </span>
                    {notice}
                  </p>
                </div>
              ) : null}

              <div
                ref={messageListRef}
                className="min-h-0 flex-1 space-y-6 overflow-x-hidden overflow-y-auto px-2 py-6"
                aria-live="polite"
                aria-label={`${selectedGroup?.title ?? ''} 그룹 메시지`}
              >
                {isLoadingMessages ? (
                  <p className="text-caption text-text-secondary" role="status">
                    메시지를 불러오는 중...
                  </p>
                ) : null}

                {messagesError ? (
                  <p className="text-caption text-status-error" role="alert">
                    {messagesError}
                  </p>
                ) : null}

                {!isLoadingMessages && !messagesError && messages.length === 0 ? (
                  <p className="text-caption text-text-secondary">
                    아직 메시지가 없습니다. 첫 메시지를 보내 보세요.
                  </p>
                ) : null}

                {messages.map((message) => {
                  const isSelf = message.senderId === currentUserId

                  return (
                    <div
                      key={message.chatId}
                      className={cn(
                        'study-chat-message flex items-start gap-3',
                        isSelf && 'justify-end',
                      )}
                    >
                      {!isSelf ? (
                        <Avatar
                          className="mt-7 size-10 border border-border-default bg-profile-avatar"
                          aria-hidden="true"
                        >
                          {message.profileImageUrl ? (
                            <AvatarImage
                              src={message.profileImageUrl}
                              alt=""
                              className="object-cover"
                            />
                          ) : null}
                          <AvatarFallback className="border-0 bg-profile-avatar text-body-2 font-semibold text-action-primary">
                            {message.senderNickname.trim().charAt(0) || '?'}
                          </AvatarFallback>
                        </Avatar>
                      ) : null}
                      <div
                        className={cn('max-w-[82%]', isSelf && 'text-right')}
                      >
                        {!isSelf ? (
                          <p className="mb-1 text-body-2 text-text-secondary">
                            {message.senderNickname}
                          </p>
                        ) : null}
                        <div
                          className={cn(
                            'relative rounded-ait-l px-4 py-3 text-left text-body-1',
                            isSelf
                              ? 'rounded-br-none bg-action-primary text-surface-default'
                              : 'rounded-bl-none bg-status-neutral-surface text-action-primary',
                          )}
                        >
                          <p className="whitespace-pre-wrap break-words">
                            {message.message}
                          </p>
                        </div>
                        {!isSelf ? (
                          <StudyChatMessageReactions
                            messageId={message.chatId}
                            reactions={message.reactions ?? []}
                            currentUserId={currentUserId}
                            onToggle={toggleReaction}
                          />
                        ) : null}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="flex min-w-0 shrink-0 items-end gap-2 sm:gap-3">
                <label className="min-w-0 flex-1">
                  <span className="sr-only">메시지 입력</span>
                  <Textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={handleDraftKeyDown}
                    rows={1}
                    placeholder={
                      isConnected
                        ? '메시지 입력'
                        : (connectError ?? '연결 중...')
                    }
                    disabled={!isConnected}
                    className="min-h-12 resize-none py-3"
                  />
                </label>
                <button
                  type="button"
                  onClick={sendMessage}
                  disabled={!draft.trim() || !isConnected}
                  className="flex size-12 shrink-0 items-center justify-center rounded-ait-s bg-action-primary text-surface-default transition-shadow hover:shadow-elevation-2 disabled:bg-status-neutral-surface disabled:text-text-secondary"
                  aria-label="메시지 전송"
                >
                  <Send className="size-6" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
