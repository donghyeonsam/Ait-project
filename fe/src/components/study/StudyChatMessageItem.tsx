import { Paperclip } from 'lucide-react'
import type { StudyGroupChatMessage } from '@/api/study-group-chat'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar'
import { StudyChatMessageReactions } from '@/components/study/StudyChatMessageReactions'
import { parseEmoticonToken } from '@/lib/emoticons'
import { parseFileToken } from '@/lib/study-chat-file'
import {
  parseReplyMessage,
  toReplyTarget,
  type StudyChatReplyTarget,
} from '@/lib/study-chat-reply'
import { cn } from '@/lib/utils'

interface StudyChatMessageItemProps {
  message: StudyGroupChatMessage
  currentUserId: number | null
  isHighlighted: boolean
  onToggleReaction: (chatId: number, emoji: string) => void
  onReply: (target: StudyChatReplyTarget) => void
  onQuoteClick: (chatId: number) => void
  className?: string
}

function formatMessageTime(createdAt: string) {
  const date = new Date(createdAt)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('ko-KR', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

// 그룹톡 메시지 한 건. 말풍선과 답글 인용, 반응·답장 버튼, 시각을 함께 그린다.
export function StudyChatMessageItem({
  message,
  currentUserId,
  isHighlighted,
  onToggleReaction,
  onReply,
  onQuoteClick,
  className,
}: StudyChatMessageItemProps) {
  const isSelf = message.senderId === currentUserId
  const { reply, body } = parseReplyMessage(message.message)
  const emoticon = parseEmoticonToken(body)
  const file = parseFileToken(body)

  return (
    <div
      data-chat-id={message.chatId}
      className={cn(
        'study-chat-message group/chat-message flex items-start gap-2 rounded-ait-m transition-colors',
        isSelf && 'justify-end',
        isHighlighted && 'bg-status-info-surface',
        className,
      )}
    >
      {!isSelf ? (
        <Avatar className="mt-5 size-8 shrink-0 border border-border-default bg-profile-avatar">
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

      <div className="max-w-[80%]">
        {!isSelf ? (
          <p className="mb-0.5 text-caption font-medium text-action-primary">
            {message.senderNickname}
          </p>
        ) : null}
        <StudyChatMessageReactions
          messageId={message.chatId}
          reactions={message.reactions ?? []}
          currentUserId={currentUserId}
          onToggle={onToggleReaction}
          align={isSelf ? 'end' : 'start'}
          timeLabel={formatMessageTime(message.createdAt)}
          onReply={() => onReply(toReplyTarget(message))}
        >
          {emoticon && !reply ? (
            <img
              src={emoticon.src}
              alt={`${emoticon.label} 이모티콘`}
              className="inline-block size-24 object-contain"
            />
          ) : (
            <div
              className={cn(
                'rounded-ait-l px-3 py-1.5 text-left text-caption',
                isSelf
                  ? 'bg-action-primary text-surface-default'
                  : 'bg-status-neutral-surface text-action-primary',
              )}
            >
              {reply ? (
                <button
                  type="button"
                  onClick={() => onQuoteClick(reply.chatId)}
                  aria-label={`${reply.nickname}의 원본 메시지로 이동`}
                  className={cn(
                    'mb-1 block w-full rounded-ait-s border-l-2 px-2 py-1 text-left focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-action-primary/25',
                    isSelf
                      ? 'border-surface-default/60 bg-surface-default/15'
                      : 'border-action-primary/40 bg-surface-default/70',
                  )}
                >
                  <span className="block font-semibold">
                    {reply.nickname}에게 답장
                  </span>
                  <span className="block truncate opacity-80">
                    {reply.preview}
                  </span>
                </button>
              ) : null}
              {emoticon ? (
                <img
                  src={emoticon.src}
                  alt={`${emoticon.label} 이모티콘`}
                  className="block size-24 object-contain"
                />
              ) : file?.isImage ? (
                <a
                  href={file.url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`${file.originalFilename} 원본 이미지 열기`}
                  className="block focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-action-primary/25"
                >
                  <img
                    src={file.url}
                    alt={file.originalFilename}
                    loading="lazy"
                    className="block max-h-48 max-w-full rounded-ait-s object-contain"
                  />
                </a>
              ) : file ? (
                <a
                  href={file.url}
                  target="_blank"
                  rel="noreferrer"
                  download={file.originalFilename}
                  className="flex items-center gap-1.5 py-0.5 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-action-primary/25"
                >
                  <Paperclip className="size-3.5 shrink-0" aria-hidden="true" />
                  <span className="truncate underline underline-offset-2">
                    {file.originalFilename}
                  </span>
                </a>
              ) : (
                <p className="whitespace-pre-wrap wrap-break-word">{body}</p>
              )}
            </div>
          )}
        </StudyChatMessageReactions>
      </div>
    </div>
  )
}
