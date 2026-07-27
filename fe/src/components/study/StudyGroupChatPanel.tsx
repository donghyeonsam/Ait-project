import {
  Check,
  ChevronDown,
  ChevronUp,
  MessageCircleMore,
  Pencil,
  Pin,
  Plus,
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
  type CSSProperties,
  type KeyboardEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import type { StudyChatGroup, StudyChatMessage } from '@/mocks/study-lounge'

interface StudyGroupChatPanelProps {
  group: StudyChatGroup
}

interface StudyChatImageAttachment {
  dataUrl: string
  name: string
}

interface LocalStudyChatMessage extends StudyChatMessage {
  image?: StudyChatImageAttachment
}

// 목업에서 '나'가 보낸 메시지를 구분하듯, 반응 주체도 같은 이름을 기준으로 삼는다.
const currentUser = '나'
// 최근 사용 이모지가 아직 없을 때 처음 보여줄 기본 목록이다.
const defaultRecentEmojis = ['👍', '❤️', '😂', '🎉', '👏']
const recentEmojiStorageKey = 'ait-study-chat-recent-emojis'
const maxRecentEmojis = 12
const composerEmojis = [
  '😀',
  '😃',
  '😄',
  '😁',
  '😊',
  '🙂',
  '😉',
  '😍',
  '🥰',
  '😘',
  '😎',
  '🤩',
  '🥳',
  '😂',
  '🤣',
  '🥹',
  '😅',
  '😢',
  '😭',
  '😡',
  '🤔',
  '🫡',
  '😴',
  '🤯',
  '👍',
  '👎',
  '👌',
  '✌️',
  '🤞',
  '👏',
  '🙌',
  '🙏',
  '💪',
  '👀',
  '💯',
  '🔥',
  '🎉',
  '🎊',
  '✨',
  '⭐',
  '❤️',
  '🩷',
  '🧡',
  '💛',
  '💚',
  '💙',
  '💜',
  '🤍',
]
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

// 스크롤 컨테이너에 잘리지 않도록 트리거 버튼 위치를 기준으로 화면 안에 들어오는 고정 좌표를 계산한다.
function getReactionPickerStyle(
  anchor: DOMRect,
  isSelf: boolean,
): CSSProperties {
  const pickerWidth = 256
  const pickerMaxHeight = 256
  const gap = 6
  const margin = 8

  const spaceBelow = window.innerHeight - anchor.bottom - gap - margin
  const spaceAbove = anchor.top - gap - margin
  const openAbove = spaceBelow < pickerMaxHeight && spaceAbove > spaceBelow
  const maxHeight = Math.min(
    pickerMaxHeight,
    Math.max(openAbove ? spaceAbove : spaceBelow, 0),
  )
  const top = openAbove ? anchor.top - gap - maxHeight : anchor.bottom + gap

  const rawLeft = isSelf ? anchor.right - pickerWidth : anchor.left
  const left = Math.min(
    Math.max(margin, rawLeft),
    window.innerWidth - pickerWidth - margin,
  )

  return { top, left, maxHeight }
}

// 현재 그룹의 공지와 목 채팅 메시지를 그룹 페이지 안에서 보여준다.
export function StudyGroupChatPanel({ group }: StudyGroupChatPanelProps) {
  const [messages, setMessages] = useState<LocalStudyChatMessage[]>(() =>
    group.messages.map((message) => ({ ...message })),
  )
  const [notice, setNotice] = useState(group.notice)
  const [noticeDraft, setNoticeDraft] = useState(group.notice)
  const [noticeEditorMode, setNoticeEditorMode] = useState<
    'create' | 'edit' | null
  >(null)
  const [pendingImage, setPendingImage] =
    useState<StudyChatImageAttachment | null>(null)
  const [isNoticeExpanded, setIsNoticeExpanded] = useState(false)
  const [isNoticeOverflowing, setIsNoticeOverflowing] = useState(false)
  const [draft, setDraft] = useState('')
  const [composerPicker, setComposerPicker] = useState<
    'emoji' | 'emoticon' | null
  >(null)
  const [reactionPickerMessageId, setReactionPickerMessageId] = useState<
    number | null
  >(null)
  const [recentEmojis, setRecentEmojis] = useState<string[]>(() => {
    const stored = readRecentEmojis()
    return stored.length > 0 ? stored : defaultRecentEmojis
  })
  // 반응 픽커를 body로 portal할 때 기준이 되는 트리거 버튼의 화면 좌표다.
  const [reactionPickerAnchor, setReactionPickerAnchor] =
    useState<DOMRect | null>(null)
  const messageListRef = useRef<HTMLDivElement>(null)
  const noticeTextRef = useRef<HTMLParagraphElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messageListRef.current?.scrollTo({
      top: messageListRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [messages.length])

  useEffect(() => {
    const noticeText = noticeTextRef.current
    if (!noticeText || !notice || noticeEditorMode) return

    const measureNoticeOverflow = () => {
      if (isNoticeExpanded) return
      setIsNoticeOverflowing(
        noticeText.scrollWidth > noticeText.clientWidth,
      )
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

  useEffect(() => {
    if (reactionPickerMessageId === null) {
      return
    }

    const closeReactionPicker = () => {
      setReactionPickerMessageId(null)
      setReactionPickerAnchor(null)
    }
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target

      // portal된 픽커와 트리거 영역 안을 누른 경우는 닫지 않는다.
      if (
        target instanceof Element &&
        (target.closest('[data-reaction-picker]') ||
          target.closest(
            `[data-message-reaction-controls="${reactionPickerMessageId}"]`,
          ))
      ) {
        return
      }

      closeReactionPicker()
    }
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeReactionPicker()
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [reactionPickerMessageId])

  const sendMessage = () => {
    const content = draft.trim()
    if (!content && !pendingImage) return
    setMessages((currentMessages) => [
      ...currentMessages,
      {
        id: Date.now(),
        sender: '나',
        content,
        isSelf: true,
        image: pendingImage ?? undefined,
      },
    ])
    setDraft('')
    setPendingImage(null)
    if (imageInputRef.current) imageInputRef.current.value = ''
    setComposerPicker(null)
  }

  const attachImage = (file: File | undefined) => {
    if (!file || !file.type.startsWith('image/')) return

    const reader = new FileReader()
    reader.addEventListener(
      'load',
      () => {
        if (typeof reader.result !== 'string') return
        setPendingImage({ dataUrl: reader.result, name: file.name })
        setComposerPicker(null)
      },
      { once: true },
    )
    reader.readAsDataURL(file)
  }

  const removePendingImage = () => {
    setPendingImage(null)
    if (imageInputRef.current) imageInputRef.current.value = ''
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

  // 카카오톡처럼 한 사람은 메시지당 이모지 하나만 남기며, 같은 이모지를 다시 누르면 취소된다.
  const reactToMessage = (messageId: number, emoji: string) => {
    const targetMessage = messages.find((message) => message.id === messageId)
    const alreadyMineOnTarget = targetMessage?.reactions?.some(
      (reaction) =>
        reaction.emoji === emoji && reaction.users.includes(currentUser),
    )
    // 반응을 새로 추가할 때만 최근 사용 목록을 갱신하고, 취소는 제외한다.
    if (!alreadyMineOnTarget) rememberEmoji(emoji)

    setMessages((currentMessages) =>
      currentMessages.map((message) => {
        if (message.id !== messageId) return message

        const reactions = message.reactions ?? []
        const alreadyMine = reactions.some(
          (reaction) =>
            reaction.emoji === emoji && reaction.users.includes(currentUser),
        )

        // 먼저 내 이름을 모든 이모지에서 지워 사람당 1개 규칙과 이모지 교체를 처리한다.
        let nextReactions = reactions
          .map((reaction) => ({
            ...reaction,
            users: reaction.users.filter((user) => user !== currentUser),
          }))
          .filter((reaction) => reaction.users.length > 0)

        if (!alreadyMine) {
          const target = nextReactions.find(
            (reaction) => reaction.emoji === emoji,
          )
          nextReactions = target
            ? nextReactions.map((reaction) =>
                reaction.emoji === emoji
                  ? { ...reaction, users: [...reaction.users, currentUser] }
                  : reaction,
              )
            : [...nextReactions, { emoji, users: [currentUser] }]
        }

        return { ...message, reactions: nextReactions }
      }),
    )
    setReactionPickerMessageId(null)
    setReactionPickerAnchor(null)
  }

  const myReactionEmoji = (message: StudyChatMessage) =>
    message.reactions?.find((reaction) => reaction.users.includes(currentUser))
      ?.emoji

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
    if (!content) return
    setNotice(content)
    setNoticeDraft(content)
    setIsNoticeExpanded(false)
    setIsNoticeOverflowing(false)
    setNoticeEditorMode(null)
  }

  const deleteNotice = () => {
    setNotice('')
    setNoticeDraft('')
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
      <h2
        id="study-group-chat-title"
        className="flex items-center gap-2 text-body-1 font-semibold text-text-primary"
      >
        <MessageCircleMore className="size-5" aria-hidden="true" />
        그룹톡
      </h2>

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
            disabled={!noticeDraft.trim()}
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
            className={cn(
              'size-4 shrink-0',
              isNoticeExpanded && 'mt-1',
            )}
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
              onClick={() =>
                setIsNoticeExpanded((current) => !current)
              }
              className="flex size-7 shrink-0 items-center justify-center rounded-ait-s text-text-secondary transition-colors hover:bg-surface-default hover:text-action-primary"
              aria-label={
                isNoticeExpanded ? '공지 접기' : '공지 전체 보기'
              }
              aria-expanded={isNoticeExpanded}
            >
              {isNoticeExpanded ? (
                <ChevronUp className="size-4" aria-hidden="true" />
              ) : (
                <ChevronDown className="size-4" aria-hidden="true" />
              )}
            </button>
          ) : null}
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
        </div>
      ) : (
        <button
          type="button"
          onClick={() => openNoticeEditor('create')}
          className="mt-3 flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-ait-s border border-dashed border-border-default bg-surface-default px-3 py-2 text-caption font-medium text-text-secondary transition-colors hover:border-status-achievement-border hover:bg-status-achievement-surface hover:text-action-primary"
          aria-label="공지 작성"
        >
          <Plus className="size-4" aria-hidden="true" />
          공지 작성
        </button>
      )}

      <div
        ref={messageListRef}
        className="min-h-0 flex-1 space-y-4 overflow-x-hidden overflow-y-auto px-3 py-4 [scrollbar-gutter:stable]"
        aria-live="polite"
        aria-label="그룹톡 메시지"
        onScroll={() => {
          if (reactionPickerMessageId === null) return
          setReactionPickerMessageId(null)
          setReactionPickerAnchor(null)
        }}
      >
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              'study-chat-message group/message relative flex items-end gap-3 hover:z-20 focus-within:z-20',
              message.isSelf && 'justify-end',
            )}
          >
            {!message.isSelf ? (
              <span
                className="size-8 shrink-0 rounded-ait-pill bg-profile-avatar"
                aria-hidden="true"
              />
            ) : null}
            <div
              className={cn(
                'relative flex max-w-[82%] items-end gap-1',
                message.isSelf && 'flex-row-reverse',
              )}
              data-message-reaction-controls={message.id}
            >
              <div className={cn('relative', message.isSelf && 'text-right')}>
                {!message.isSelf ? (
                  <p className="mb-1 text-caption text-text-secondary">
                    {message.sender}
                  </p>
                ) : null}
                <div
                  className={cn(
                    'rounded-ait-m px-4 py-2 text-left text-body-2',
                    message.isSelf
                      ? 'rounded-br-none bg-action-primary text-surface-default'
                      : 'rounded-bl-none bg-status-neutral-surface text-action-primary',
                  )}
                >
                  {message.image ? (
                    <img
                      src={message.image.dataUrl}
                      alt={message.image.name}
                      className="block max-h-56 max-w-full rounded-ait-s object-contain"
                    />
                  ) : null}
                  {message.content ? (
                    <p
                      className={cn(
                        'whitespace-pre-wrap break-words',
                        message.image && 'mt-2',
                      )}
                    >
                      {message.content}
                    </p>
                  ) : null}
                </div>
                {message.reactions && message.reactions.length > 0 ? (
                  <div
                    className={cn(
                      'mt-1 flex flex-wrap gap-1',
                      message.isSelf ? 'justify-end' : 'justify-start',
                    )}
                  >
                    {message.reactions.map((reaction) => {
                      const reactedByMe = reaction.users.includes(currentUser)

                      return (
                        <div
                          key={reaction.emoji}
                          className="group/reaction relative"
                        >
                          <button
                            type="button"
                            onClick={() =>
                              reactToMessage(message.id, reaction.emoji)
                            }
                            className={cn(
                              'study-reaction-bubble inline-flex min-h-6 items-center rounded-ait-pill border px-2 text-caption shadow-elevation-1 transition-colors',
                              reactedByMe
                                ? 'border-status-achievement-border bg-status-achievement-surface text-action-primary'
                                : 'border-border-default bg-surface-default',
                            )}
                            aria-pressed={reactedByMe}
                            aria-label={`${reaction.emoji} 반응 ${reaction.users.length}개${
                              reactedByMe ? ', 내 반응 취소' : ' 추가'
                            }`}
                          >
                            {reaction.emoji}
                            <span className="ml-1 text-[10px] text-text-secondary">
                              {reaction.users.length}
                            </span>
                          </button>
                          <span
                            role="tooltip"
                            className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 whitespace-nowrap rounded-ait-s border border-border-default bg-surface-default px-2 py-1 text-caption text-text-secondary opacity-0 shadow-elevation-2 transition-opacity group-hover/reaction:opacity-100 group-focus-within/reaction:opacity-100"
                          >
                            {reaction.users.join(', ')}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                ) : null}
              </div>

              <div className="relative mb-1 shrink-0">
                <button
                  type="button"
                  onClick={(event) => {
                    const isOpen = reactionPickerMessageId === message.id
                    setReactionPickerMessageId(isOpen ? null : message.id)
                    setReactionPickerAnchor(
                      isOpen
                        ? null
                        : event.currentTarget.getBoundingClientRect(),
                    )
                  }}
                  className={cn(
                    'pointer-events-none flex size-7 items-center justify-center rounded-ait-pill border border-border-default bg-surface-default text-text-secondary opacity-0 transition-[opacity,color,background-color] hover:bg-status-neutral-surface hover:text-action-primary group-hover/message:pointer-events-auto group-hover/message:opacity-100 group-focus-within/message:pointer-events-auto group-focus-within/message:opacity-100',
                    reactionPickerMessageId === message.id &&
                      'bg-status-neutral-surface text-action-primary',
                  )}
                  aria-label={`"${message.content}" 메시지에 이모지 반응 남기기`}
                  aria-controls={`message-reaction-picker-${message.id}`}
                  aria-expanded={reactionPickerMessageId === message.id}
                >
                  <SmilePlus className="size-4" aria-hidden="true" />
                </button>
              </div>

              {reactionPickerMessageId === message.id && reactionPickerAnchor
                ? createPortal(
                    <div
                      id={`message-reaction-picker-${message.id}`}
                      data-reaction-picker
                      className={cn(
                        'study-reaction-picker fixed z-50 flex w-64 flex-col gap-2 overflow-y-auto overscroll-contain rounded-ait-m border border-border-default bg-surface-default p-2 shadow-elevation-2 [scrollbar-gutter:stable]',
                        message.isSelf
                          ? 'study-reaction-picker--self'
                          : 'study-reaction-picker--incoming',
                      )}
                      style={getReactionPickerStyle(
                        reactionPickerAnchor,
                        message.isSelf,
                      )}
                      role="group"
                      aria-label="메시지 반응 선택"
                    >
                      {[
                        {
                          key: 'recent',
                          label: '최근 사용',
                          emojis: recentEmojis,
                        },
                        {
                          key: 'all',
                          label: '전체 이모지',
                          emojis: composerEmojis,
                        },
                      ]
                        .filter((section) => section.emojis.length > 0)
                        .map((section) => (
                          <div key={section.key}>
                            <p className="mb-1 px-1 text-caption text-text-secondary">
                              {section.label}
                            </p>
                            <div className="grid grid-cols-6 gap-1">
                              {section.emojis.map((reaction) => (
                                <button
                                  key={reaction}
                                  type="button"
                                  onClick={() =>
                                    reactToMessage(message.id, reaction)
                                  }
                                  className="flex size-8 items-center justify-center rounded-ait-pill text-body-1 hover:bg-status-neutral-surface"
                                  aria-label={`${reaction} 반응 남기기`}
                                  aria-pressed={
                                    myReactionEmoji(message) === reaction
                                  }
                                >
                                  {reaction}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                    </div>,
                    document.body,
                  )
                : null}
            </div>
          </div>
        ))}
      </div>

      <div
        className="relative shrink-0"
        role="group"
        aria-label="메시지 작성"
      >
        <div
          data-message-input-card
          className="w-full rounded-ait-m border border-input bg-surface-default shadow-elevation-1 transition-[border-color,box-shadow] [transition-duration:var(--duration-fast)] [transition-timing-function:var(--easing-standard)] focus-within:border-action-primary"
        >
          {pendingImage ? (
            <div className="mx-3 mt-3 flex items-center gap-3 rounded-ait-s border border-border-default bg-background-default p-2">
              <img
                src={pendingImage.dataUrl}
                alt={`${pendingImage.name} 미리보기`}
                className="size-14 shrink-0 rounded-ait-s object-cover"
              />
              <span className="min-w-0 flex-1 truncate text-caption text-text-secondary">
                {pendingImage.name}
              </span>
              <button
                type="button"
                onClick={removePendingImage}
                className="flex size-8 shrink-0 items-center justify-center rounded-ait-s text-text-secondary transition-colors hover:bg-status-neutral-surface hover:text-status-error"
                aria-label={`${pendingImage.name} 첨부 삭제`}
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
          ) : null}
          <label className="block w-full">
            <span className="sr-only">그룹톡 메시지 입력</span>
            <Textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleKeyDown}
              rows={3}
              placeholder="메시지 입력"
              className="block h-24 min-h-24 max-h-24 resize-none overflow-y-auto rounded-none border-0 bg-transparent px-4 py-3 shadow-none focus:border-transparent focus:outline-none"
            />
          </label>
        </div>

        <div className="mt-2 flex items-center justify-end gap-2">
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            aria-label="사진 첨부 파일 선택"
            onChange={(event) => attachImage(event.target.files?.[0])}
          />
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            className="flex size-10 shrink-0 items-center justify-center rounded-ait-s border border-border-default bg-surface-default text-text-secondary transition-colors hover:bg-status-neutral-surface hover:text-action-primary"
            aria-label="사진 첨부"
          >
            <Plus className="size-5" aria-hidden="true" />
          </button>

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
                  { key: 'all', label: '전체 이모지', emojis: composerEmojis },
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
            disabled={!draft.trim() && !pendingImage}
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
