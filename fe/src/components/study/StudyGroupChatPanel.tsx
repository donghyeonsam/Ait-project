import {
  Check,
  ChevronDown,
  ChevronUp,
  MessageCircleMore,
  Pencil,
  Pin,
  Send,
  SmilePlus,
  Sticker,
  Trash2,
  X,
} from 'lucide-react'
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar'
import { studyChatEmojis } from '@/components/study/studyChatEmojis'
import { cn } from '@/lib/utils'
import { toErrorMessage } from '@/api/http'
import {
  applyStudyGroupChatReactionUpdate,
  connectStudyGroupChat,
  deleteStudyGroupChatNotice,
  getStudyGroupChats,
  sendStudyGroupChatMessage,
  sendStudyGroupChatNotice,
  setStudyGroupChatReactionForUser,
  toggleStudyGroupChatReaction,
  type StudyGroupChatMessage,
} from '@/api/study-group-chat'
import type { Client } from '@stomp/stompjs'
import { StudyChatMessageReactions } from '@/components/study/StudyChatMessageReactions'

interface StudyGroupChatPanelProps {
  groupId: number
  currentUserId: number | null
  isOwner: boolean
  initialNotice: string | null
  onIncomingMessage?: () => void
}

// 최근 사용 이모지가 아직 없을 때 처음 보여줄 기본 목록이다.
const defaultRecentEmojis = ['👍', '❤️', '😂', '🎉', '👏']
const recentEmojiStorageKey = 'ait-study-chat-recent-emojis'
const maxRecentEmojis = 12
const composerEmoticons = ['( •̀ᴗ•́ )و', '(｡•̀ᴗ-)✧', 'ㅎㅎ', 'ㅠㅠ']

// localStorage에서 최근 사용 이모지를 읽되, 값이 깨졌거나 접근 불가하면 빈 목록으로 처리한다.
function readRecentEmojis(): string[] {
  try {
    const raw = localStorage.getItem(recentEmojiStorageKey)
    const parsed = raw ? JSON.parse(raw) : null
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((value): value is string => typeof value === 'string')
      .slice(0, maxRecentEmojis)
  } catch {
    return []
  }
}

// 그룹톡 공지와 실시간 메시지를 서버(REST 이력 조회 + STOMP 실시간 송수신)와 연동해 보여준다.
export function StudyGroupChatPanel({
  groupId,
  currentUserId,
  isOwner,
  initialNotice,
  onIncomingMessage,
}: StudyGroupChatPanelProps) {
  const [messages, setMessages] = useState<StudyGroupChatMessage[]>([])
  const [hasMoreHistory, setHasMoreHistory] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  const [isLoadingMoreHistory, setIsLoadingMoreHistory] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [connectError, setConnectError] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  // 새 메시지가 도착·전송됐을 때만 맨 아래로 스크롤하기 위한 트리거 (과거 이력 로드 시엔 스크롤 위치를 유지한다).
  const [liveMessageTick, setLiveMessageTick] = useState(0)

  // 진입 시점 공지는 그룹 상세 응답에서 받고, 이후 변경은 STOMP 공지 구독으로 갱신한다.
  const [notice, setNotice] = useState(initialNotice ?? '')
  const [noticeDraft, setNoticeDraft] = useState('')
  const [noticeEditorMode, setNoticeEditorMode] = useState<
    'create' | 'edit' | null
  >(null)
  const [isNoticeExpanded, setIsNoticeExpanded] = useState(false)
  const [isNoticeOverflowing, setIsNoticeOverflowing] = useState(false)
  const [draft, setDraft] = useState('')
  const [composerPicker, setComposerPicker] = useState<
    'emoji' | 'emoticon' | null
  >(null)
  const [recentEmojis, setRecentEmojis] = useState<string[]>(() => {
    const stored = readRecentEmojis()
    return stored.length > 0 ? stored : defaultRecentEmojis
  })

  const clientRef = useRef<Client | null>(null)
  const messageListRef = useRef<HTMLDivElement>(null)
  const noticeTextRef = useRef<HTMLParagraphElement>(null)
  const knownChatIdsRef = useRef<Set<number>>(new Set())

  // 그룹의 최근 채팅 이력을 불러온다 (최신순 응답을 오래된 순으로 뒤집어 저장한다).
  useEffect(() => {
    let cancelled = false
    knownChatIdsRef.current = new Set()

    const loadHistory = async () => {
      setIsLoadingHistory(true)
      setHistoryError(null)
      try {
        const result = await getStudyGroupChats(groupId)
        if (cancelled) return
        const history = [...result.chats].reverse()
        history.forEach((message) =>
          knownChatIdsRef.current.add(message.chatId),
        )
        setMessages(history)
        setHasMoreHistory(result.hasNext)
      } catch (error) {
        if (!cancelled) setHistoryError(toErrorMessage(error))
      } finally {
        if (!cancelled) setIsLoadingHistory(false)
      }
    }

    void loadHistory()

    return () => {
      cancelled = true
    }
  }, [groupId])

  // 실시간 메시지·공지 STOMP 연결을 열고, 화면을 벗어나면 정리한다.
  useEffect(() => {
    const client = connectStudyGroupChat(groupId, {
      onMessage: (incoming) => {
        if (knownChatIdsRef.current.has(incoming.chatId)) return
        knownChatIdsRef.current.add(incoming.chatId)
        setMessages((current) => [...current, incoming])
        if (currentUserId !== null && incoming.senderId !== currentUserId) {
          onIncomingMessage?.()
        }
        setLiveMessageTick((tick) => tick + 1)
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
      void client.deactivate()
    }
  }, [currentUserId, groupId, onIncomingMessage])

  useEffect(() => {
    messageListRef.current?.scrollTo({
      top: messageListRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [liveMessageTick])

  useEffect(() => {
    const noticeText = noticeTextRef.current
    if (!noticeText || !notice || noticeEditorMode) return

    const measureNoticeOverflow = () => {
      if (isNoticeExpanded) return
      setIsNoticeOverflowing(noticeText.scrollWidth > noticeText.clientWidth)
    }

    measureNoticeOverflow()
    window.addEventListener('resize', measureNoticeOverflow)

    const resizeObserver =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(measureNoticeOverflow)
    resizeObserver?.observe(noticeText)

    return () => {
      window.removeEventListener('resize', measureNoticeOverflow)
      resizeObserver?.disconnect()
    }
  }, [isNoticeExpanded, notice, noticeEditorMode])

  const loadMoreHistory = () => {
    const oldestChatId = messages[0]?.chatId
    if (!oldestChatId || isLoadingMoreHistory) return

    setIsLoadingMoreHistory(true)
    getStudyGroupChats(groupId, oldestChatId)
      .then((result) => {
        result.chats.forEach((message) =>
          knownChatIdsRef.current.add(message.chatId),
        )
        setMessages((current) => [...[...result.chats].reverse(), ...current])
        setHasMoreHistory(result.hasNext)
      })
      .catch((error: unknown) => setHistoryError(toErrorMessage(error)))
      .finally(() => setIsLoadingMoreHistory(false))
  }

  const sendMessage = () => {
    const content = draft.trim()
    if (!content || !clientRef.current?.connected) return

    sendStudyGroupChatMessage(clientRef.current, groupId, content)
    setDraft('')
    setComposerPicker(null)
  }

  const toggleReaction = (chatId: number, emoji: string) => {
    if (!clientRef.current?.connected) return

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

    toggleStudyGroupChatReaction(clientRef.current, groupId, chatId, emoji)
  }

  const appendToDraft = (value: string, addLeadingSpace = false) => {
    setDraft((currentDraft) => {
      const spacing =
        addLeadingSpace && currentDraft && !currentDraft.endsWith(' ')
          ? ' '
          : ''
      return `${currentDraft}${spacing}${value}`
    })
    setComposerPicker(null)
  }

  // 방금 쓴 이모지를 최근 목록 맨 앞으로 올리고 localStorage에 남긴다.
  const rememberEmoji = (emoji: string) => {
    setRecentEmojis((current) => {
      const next = [emoji, ...current.filter((item) => item !== emoji)].slice(
        0,
        maxRecentEmojis,
      )
      try {
        localStorage.setItem(recentEmojiStorageKey, JSON.stringify(next))
      } catch {
        // localStorage 접근 불가 시 최근 목록 저장만 조용히 건너뛴다.
      }
      return next
    })
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      sendMessage()
    }
  }

  const openNoticeEditor = (mode: 'create' | 'edit') => {
    setNoticeDraft(mode === 'edit' ? notice : '')
    setIsNoticeExpanded(false)
    setNoticeEditorMode(mode)
  }

  const closeNoticeEditor = () => {
    setNoticeDraft(notice)
    setNoticeEditorMode(null)
  }

  const saveNotice = () => {
    const content = noticeDraft.trim()
    if (!content || !clientRef.current?.connected) return

    sendStudyGroupChatNotice(clientRef.current, groupId, content)
    setIsNoticeExpanded(false)
    setIsNoticeOverflowing(false)
    setNoticeEditorMode(null)
  }

  const deleteNotice = () => {
    if (!clientRef.current?.connected) return

    deleteStudyGroupChatNotice(clientRef.current, groupId)
    setIsNoticeExpanded(false)
    setIsNoticeOverflowing(false)
    setNoticeEditorMode(null)
  }

  const handleNoticeKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      closeNoticeEditor()
      return
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      saveNotice()
    }
  }

  return (
    <section
      className="flex h-[32rem] min-h-0 min-w-0 flex-col overflow-hidden rounded-ait-m border border-border-default bg-surface-default p-4 shadow-elevation-1 lg:h-[36rem]"
      aria-labelledby="study-group-chat-title"
    >
      <div className="flex shrink-0 items-center justify-between gap-2">
        <h2
          id="study-group-chat-title"
          className="flex items-center gap-2 text-body-1 font-semibold text-text-primary"
        >
          <MessageCircleMore className="size-5" aria-hidden="true" />
          그룹톡
        </h2>
        {!isConnected ? (
          <span className="text-caption text-text-secondary">
            {connectError ?? '연결 중...'}
          </span>
        ) : null}
      </div>

      {noticeEditorMode ? (
        <div
          className="mt-3 flex shrink-0 items-center gap-2 rounded-ait-s border border-status-achievement-border bg-status-achievement-surface p-2"
          role="group"
          aria-label={
            noticeEditorMode === 'create' ? '공지 작성' : '공지 수정'
          }
        >
          <Pin
            className="size-4 shrink-0 text-action-primary"
            aria-hidden="true"
          />
          <label className="min-w-0 flex-1">
            <span className="sr-only">공지 내용</span>
            <Input
              autoFocus
              value={noticeDraft}
              onChange={(event) => setNoticeDraft(event.target.value)}
              onKeyDown={handleNoticeKeyDown}
              maxLength={120}
              placeholder="새 공지를 입력하세요"
              className="h-9 bg-surface-default text-caption"
            />
          </label>
          <button
            type="button"
            onClick={saveNotice}
            disabled={!noticeDraft.trim() || !isConnected}
            className="flex size-9 shrink-0 items-center justify-center rounded-ait-s bg-action-primary text-surface-default transition-shadow hover:shadow-elevation-1 disabled:bg-status-neutral-surface disabled:text-text-secondary"
            aria-label="공지 저장"
          >
            <Check className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={closeNoticeEditor}
            className="flex size-9 shrink-0 items-center justify-center rounded-ait-s border border-border-default bg-surface-default text-text-secondary transition-colors hover:bg-status-neutral-surface hover:text-action-primary"
            aria-label="공지 편집 취소"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      ) : notice ? (
        <div
          className={cn(
            'mt-3 flex shrink-0 gap-2 rounded-ait-s border border-status-achievement-border bg-status-achievement-surface px-3 py-2 text-caption text-action-primary',
            isNoticeExpanded ? 'items-start' : 'items-center',
          )}
        >
          <Pin
            className={cn('size-4 shrink-0', isNoticeExpanded && 'mt-1')}
            aria-hidden="true"
          />
          <p
            ref={noticeTextRef}
            data-study-notice-text
            className={cn(
              'min-w-0 flex-1 break-words',
              isNoticeExpanded ? 'whitespace-pre-wrap' : 'truncate',
            )}
            title={notice}
          >
            <span className="font-semibold">공지 · </span>
            {notice}
          </p>
          {isNoticeOverflowing || isNoticeExpanded ? (
            <button
              type="button"
              onClick={() => setIsNoticeExpanded((current) => !current)}
              className="flex size-7 shrink-0 items-center justify-center rounded-ait-s text-text-secondary transition-colors hover:bg-surface-default hover:text-action-primary"
              aria-label={isNoticeExpanded ? '공지 접기' : '공지 전체 보기'}
              aria-expanded={isNoticeExpanded}
            >
              {isNoticeExpanded ? (
                <ChevronUp className="size-4" aria-hidden="true" />
              ) : (
                <ChevronDown className="size-4" aria-hidden="true" />
              )}
            </button>
          ) : null}
          {isOwner ? (
            <>
              <button
                type="button"
                onClick={() => openNoticeEditor('edit')}
                className="flex size-7 shrink-0 items-center justify-center rounded-ait-s text-text-secondary transition-colors hover:bg-surface-default hover:text-action-primary"
                aria-label="공지 수정"
              >
                <Pencil className="size-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={deleteNotice}
                className="flex size-7 shrink-0 items-center justify-center rounded-ait-s text-text-secondary transition-colors hover:bg-status-error-surface hover:text-status-error"
                aria-label="공지 삭제"
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </button>
            </>
          ) : null}
        </div>
      ) : isOwner ? (
        <button
          type="button"
          onClick={() => openNoticeEditor('create')}
          className="mt-3 flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-ait-s border border-dashed border-border-default bg-surface-default px-3 py-2 text-caption font-medium text-text-secondary transition-colors hover:border-status-achievement-border hover:bg-status-achievement-surface hover:text-action-primary"
          aria-label="공지 작성"
        >
          공지 작성
        </button>
      ) : null}

      <div
        ref={messageListRef}
        className="min-h-0 flex-1 space-y-4 overflow-x-hidden overflow-y-auto px-3 py-4 [scrollbar-gutter:stable]"
        aria-live="polite"
        aria-label="그룹톡 메시지"
      >
        {hasMoreHistory ? (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={loadMoreHistory}
              disabled={isLoadingMoreHistory}
              className="rounded-ait-pill border border-border-default bg-surface-default px-3 py-1 text-caption text-text-secondary transition-colors hover:text-action-primary disabled:opacity-60"
            >
              {isLoadingMoreHistory ? '불러오는 중...' : '이전 메시지 더 보기'}
            </button>
          </div>
        ) : null}

        {historyError ? (
          <p className="text-caption text-status-error" role="alert">
            {historyError}
          </p>
        ) : null}

        {isLoadingHistory ? (
          <p className="text-caption text-text-secondary">
            메시지를 불러오는 중...
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
                  className="mt-5 size-8 border border-border-default bg-profile-avatar"
                  aria-hidden="true"
                >
                  {message.profileImageUrl ? (
                    <AvatarImage
                      src={message.profileImageUrl}
                      alt=""
                      className="object-cover"
                    />
                  ) : null}
                  <AvatarFallback className="border-0 bg-profile-avatar text-caption font-semibold text-action-primary">
                    {message.senderNickname.trim().charAt(0) || '?'}
                  </AvatarFallback>
                </Avatar>
              ) : null}
              <div
                className={cn('max-w-[82%]', isSelf && 'text-right')}
              >
                {!isSelf ? (
                  <p className="mb-1 text-caption text-text-secondary">
                    {message.senderNickname}
                  </p>
                ) : null}
                <div
                  className={cn(
                    'rounded-ait-m px-4 py-2 text-left text-body-2',
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

      <div
        className="relative shrink-0"
        role="group"
        aria-label="메시지 작성"
      >
        <div
          data-message-input-card
            className="min-w-0 w-full rounded-ait-m border border-input bg-surface-default shadow-elevation-1 transition-[border-color,box-shadow] [transition-duration:var(--duration-fast)] [transition-timing-function:var(--easing-standard)] focus-within:border-action-primary"
        >
          <label className="block w-full">
            <span className="sr-only">그룹톡 메시지 입력</span>
            <Textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleKeyDown}
              rows={3}
              placeholder={isConnected ? '메시지 입력' : '연결 중...'}
              disabled={!isConnected}
              className="block h-24 min-h-24 max-h-24 resize-none overflow-y-auto rounded-none border-0 bg-transparent px-4 py-3 shadow-none focus:border-transparent focus:outline-none"
            />
          </label>
        </div>

        <div className="mt-2 flex items-center justify-end gap-2">
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() =>
                setComposerPicker((currentPicker) =>
                  currentPicker === 'emoji' ? null : 'emoji',
                )
              }
              className="flex size-10 items-center justify-center rounded-ait-s border border-border-default bg-surface-default text-text-secondary transition-colors hover:bg-status-neutral-surface hover:text-action-primary"
              aria-label="이모지 추가"
              aria-expanded={composerPicker === 'emoji'}
            >
              <SmilePlus className="size-5" aria-hidden="true" />
            </button>

            {composerPicker === 'emoji' ? (
              <div
                className="absolute bottom-12 right-0 z-10 flex max-h-64 w-64 flex-col gap-2 overflow-y-auto overscroll-contain rounded-ait-m border border-border-default bg-surface-default p-2 shadow-elevation-2 [scrollbar-gutter:stable]"
                role="group"
                aria-label="이모지 선택"
              >
                {[
                  { key: 'recent', label: '최근 사용', emojis: recentEmojis },
                  { key: 'all', label: '전체 이모지', emojis: studyChatEmojis },
                ]
                  .filter((section) => section.emojis.length > 0)
                  .map((section) => (
                    <div key={section.key}>
                      <p className="mb-1 px-1 text-caption text-text-secondary">
                        {section.label}
                      </p>
                      <div className="grid grid-cols-6 gap-1">
                        {section.emojis.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => {
                              appendToDraft(emoji)
                              rememberEmoji(emoji)
                            }}
                            className="flex size-9 items-center justify-center rounded-ait-s text-xl leading-none hover:bg-status-neutral-surface"
                            aria-label={`${emoji} 입력`}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            ) : null}
          </div>

          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() =>
                setComposerPicker((currentPicker) =>
                  currentPicker === 'emoticon' ? null : 'emoticon',
                )
              }
              className="flex size-10 items-center justify-center rounded-ait-s border border-border-default bg-surface-default text-text-secondary transition-colors hover:bg-status-neutral-surface hover:text-action-primary"
              aria-label="이모티콘 추가"
              aria-expanded={composerPicker === 'emoticon'}
            >
              <Sticker className="size-5" aria-hidden="true" />
            </button>

            {composerPicker === 'emoticon' ? (
              <div
                className="absolute bottom-12 right-0 z-10 flex w-44 flex-col gap-1 rounded-ait-m border border-border-default bg-surface-default p-2 shadow-elevation-2"
                role="group"
                aria-label="이모티콘 선택"
              >
                {composerEmoticons.map((emoticon) => (
                  <button
                    key={emoticon}
                    type="button"
                    onClick={() => appendToDraft(emoticon, true)}
                    className="rounded-ait-s px-3 py-2 text-left text-body-2 hover:bg-status-neutral-surface"
                    aria-label={`${emoticon} 입력`}
                  >
                    {emoticon}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={sendMessage}
            disabled={!draft.trim() || !isConnected}
            className="flex size-10 shrink-0 items-center justify-center rounded-ait-s bg-action-primary text-surface-default hover:shadow-elevation-2 disabled:bg-status-neutral-surface disabled:text-text-secondary"
            aria-label="그룹톡 메시지 전송"
          >
            <Send className="size-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  )
}
