import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, ThumbsUp } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { CommentComposer } from '@/components/community/CommentComposer'
import { splitEmoticonSegments } from '@/lib/emoticons'
import { formatRelativeTime } from '@/lib/format'
import { EASE_OUT, collapseSection } from '@/lib/motion'
import { cn } from '@/lib/utils'
import type { CommunityComment, CommunityReply } from '@/types/community'

const REPLY_PREVIEW_COUNT = 3
// 답글이 이 수를 넘으면 처음 3개만 보여주고 나머지는 더 보기로 감춘다.
const REPLY_PREVIEW_THRESHOLD = 5

interface CommentItemProps {
  comment: CommunityComment
  currentUserId: number | null
  canReply: boolean
  isHighlighted: boolean
  highlightedReplyId: string | null
  onSubmitReply: (commentId: string, content: string) => Promise<void>
  onEdit: (commentId: string, content: string) => Promise<void>
  onRequestDelete: (commentId: string) => void
  onToggleLike: (commentId: string) => void
}

// 최상위 댓글 하나. 긴 본문 축약, 답글 접힘·펼침, 답글 쓰기, 본인 댓글 수정·삭제를 담당한다.
export function CommentItem({
  comment,
  currentUserId,
  canReply,
  isHighlighted,
  highlightedReplyId,
  onSubmitReply,
  onEdit,
  onRequestDelete,
  onToggleLike,
}: CommentItemProps) {
  const [isThreadOpen, setThreadOpen] = useState(false)
  const [showAllReplies, setShowAllReplies] = useState(false)
  const [isReplyOpen, setReplyOpen] = useState(false)
  const [isEditing, setEditing] = useState(false)

  const isMine =
    comment.authorId != null && comment.authorId === currentUserId

  const replyCount = comment.replies.length
  const shouldPreview = replyCount > REPLY_PREVIEW_THRESHOLD
  const visibleReplies =
    shouldPreview && !showAllReplies
      ? comment.replies.slice(0, REPLY_PREVIEW_COUNT)
      : comment.replies

  const submitReply = async (content: string) => {
    await onSubmitReply(comment.id, content)
    setReplyOpen(false)
    setThreadOpen(true)
    setShowAllReplies(true)
  }

  return (
    <li className="border-b border-line-soft py-5 last:border-b-0">
      <div
        className={cn(
          'rounded-ait-s transition-colors duration-700',
          isHighlighted && 'bg-brand-blue/[0.06]',
        )}
      >
        {isEditing ? (
          <div className="pl-[52px] pt-1">
            <CommentComposer
              onSubmit={async (content) => {
                await onEdit(comment.id, content)
                setEditing(false)
              }}
              initialValue={comment.content}
              autoFocus
              compact
              placeholder="댓글을 수정해주세요."
              submitLabel="수정 완료"
            />
          </div>
        ) : (
          <CommentBody
            author={comment.author}
            createdAt={comment.createdAt}
            content={comment.content}
            muted={comment.deleted}
          />
        )}

        <div className="mt-2 flex items-center gap-4 pl-[52px]">
          {!comment.deleted ? (
            <LikeButton
              liked={comment.liked}
              likeCount={comment.likeCount}
              onToggle={() => onToggleLike(comment.id)}
            />
          ) : null}
          {replyCount > 0 ? (
            <button
              type="button"
              onClick={() => setThreadOpen((open) => !open)}
              aria-expanded={isThreadOpen}
              className="inline-flex items-center gap-1 text-caption font-medium text-ink-500 transition-colors hover:text-navy-800"
            >
              <ChevronDown
                aria-hidden="true"
                className={cn(
                  'size-4 transition-transform duration-[180ms]',
                  isThreadOpen && 'rotate-180',
                )}
              />
              {isThreadOpen ? '답글 접기' : `답글 ${replyCount}개`}
            </button>
          ) : null}
          {canReply && !comment.deleted ? (
            <button
              type="button"
              onClick={() => setReplyOpen((open) => !open)}
              className="text-caption font-medium text-ink-500 transition-colors hover:text-navy-800"
            >
              답글 쓰기
            </button>
          ) : null}
          {isMine && !comment.deleted ? (
            <>
              <button
                type="button"
                onClick={() => setEditing((editing) => !editing)}
                className="text-caption font-medium text-ink-500 transition-colors hover:text-navy-800"
              >
                {isEditing ? '수정 취소' : '수정'}
              </button>
              <button
                type="button"
                onClick={() => onRequestDelete(comment.id)}
                className="text-caption font-medium text-ink-500 transition-colors hover:text-danger"
              >
                삭제
              </button>
            </>
          ) : null}
        </div>
      </div>

      {/* 답글 쓰기 입력창 — 슬라이드 다운으로 열리고 @닉네임이 채워진다. */}
      <AnimatePresence initial={false}>
        {canReply && isReplyOpen ? (
          <motion.div
            variants={collapseSection}
            initial="collapsed"
            animate="expanded"
            exit="collapsed"
            className="overflow-hidden pl-[52px]"
          >
            <div className="pt-3">
              <CommentComposer
                onSubmit={submitReply}
                autoFocus
                compact
                initialValue={`@${comment.author} `}
                placeholder="답글을 입력해주세요."
                submitLabel="답글 등록"
              />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* 답글 스레드 — height 0 ↔ auto로 펼쳐지고 항목이 순차 등장한다. */}
      <AnimatePresence initial={false}>
        {isThreadOpen && replyCount > 0 ? (
          <motion.div
            variants={collapseSection}
            initial="collapsed"
            animate="expanded"
            exit="collapsed"
            className="overflow-hidden"
          >
            <motion.ul
              initial="initial"
              animate="animate"
              variants={{ initial: {}, animate: { transition: { staggerChildren: 0.04 } } }}
              className="ml-[52px] mt-4 flex flex-col gap-4 border-l border-line pl-6"
            >
              {visibleReplies.map((reply) => (
                <ReplyItem
                  key={reply.id}
                  reply={reply}
                  currentUserId={currentUserId}
                  isHighlighted={reply.id === highlightedReplyId}
                  onEdit={onEdit}
                  onRequestDelete={onRequestDelete}
                  onToggleLike={onToggleLike}
                />
              ))}
            </motion.ul>
            {shouldPreview && !showAllReplies ? (
              <button
                type="button"
                onClick={() => setShowAllReplies(true)}
                className="ml-[76px] mt-3 text-caption font-medium text-brand-blue transition-colors hover:underline"
              >
                답글 {replyCount - REPLY_PREVIEW_COUNT}개 더 보기
              </button>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </li>
  )
}

function ReplyItem({
  reply,
  currentUserId,
  isHighlighted,
  onEdit,
  onRequestDelete,
  onToggleLike,
}: {
  reply: CommunityReply
  currentUserId: number | null
  isHighlighted: boolean
  onEdit: (commentId: string, content: string) => Promise<void>
  onRequestDelete: (commentId: string) => void
  onToggleLike: (commentId: string) => void
}) {
  const [isEditing, setEditing] = useState(false)
  const isMine = reply.authorId != null && reply.authorId === currentUserId

  return (
    <motion.li
      variants={{
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0, transition: { duration: 0.22, ease: EASE_OUT } },
      }}
      className={cn(
        'rounded-ait-s transition-colors duration-700',
        isHighlighted && 'bg-brand-blue/[0.06]',
      )}
    >
      {isEditing ? (
        <div className="pl-[44px] pt-1">
          <CommentComposer
            onSubmit={async (content) => {
              await onEdit(reply.id, content)
              setEditing(false)
            }}
            initialValue={reply.content}
            autoFocus
            compact
            placeholder="답글을 수정해주세요."
            submitLabel="수정 완료"
          />
        </div>
      ) : (
        <CommentBody
          author={reply.author}
          createdAt={reply.createdAt}
          content={reply.content}
          compact
        />
      )}
      <div className="mt-1.5 flex items-center gap-4 pl-[44px]">
        {!reply.deleted ? (
          <LikeButton
            liked={reply.liked}
            likeCount={reply.likeCount}
            onToggle={() => onToggleLike(reply.id)}
            compact
          />
        ) : null}
        {isMine ? (
          <>
            <button
              type="button"
              onClick={() => setEditing((editing) => !editing)}
              className="text-caption font-medium text-ink-500 transition-colors hover:text-navy-800"
            >
              {isEditing ? '수정 취소' : '수정'}
            </button>
            <button
              type="button"
              onClick={() => onRequestDelete(reply.id)}
              className="text-caption font-medium text-ink-500 transition-colors hover:text-danger"
            >
              삭제
            </button>
          </>
        ) : null}
      </div>
    </motion.li>
  )
}

// 댓글·답글 공용 좋아요 토글. 누른 상태는 채워진 아이콘과 네이비 색으로 구분한다.
function LikeButton({
  liked,
  likeCount,
  onToggle,
  compact = false,
}: {
  liked: boolean
  likeCount: number
  onToggle: () => void
  compact?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={liked}
      aria-label={liked ? '좋아요 취소' : '좋아요'}
      className={cn(
        'inline-flex items-center gap-1.5 text-caption transition-colors',
        liked ? 'font-medium text-navy-800' : 'text-ink-500 hover:text-navy-800',
      )}
    >
      <motion.span
        key={String(liked)}
        initial={{ scale: 1.25 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 18 }}
        className="block"
      >
        <ThumbsUp
          aria-hidden="true"
          className={cn(
            compact ? 'size-3.5' : 'size-4',
            liked ? 'fill-navy-800 text-navy-800' : 'text-ink-400',
          )}
        />
      </motion.span>
      {likeCount}
    </button>
  )
}

// 아바타·닉네임·시각·본문. 본문이 3줄을 넘으면 축약하고 더 보기로 펼친다.
function CommentBody({
  author,
  createdAt,
  content,
  compact = false,
  muted = false,
}: {
  author: string
  createdAt: string
  content: string
  compact?: boolean
  // 삭제된 댓글 안내 문구를 본문보다 흐리게 보여준다.
  muted?: boolean
}) {
  const [isExpanded, setExpanded] = useState(false)
  const [needsClamp, setNeedsClamp] = useState(false)
  const contentRef = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    const element = contentRef.current
    if (element) setNeedsClamp(element.scrollHeight > element.clientHeight + 1)
  }, [content])

  return (
    <div className="flex items-start gap-3">
      <span
        aria-hidden="true"
        className={cn(
          'mt-0.5 shrink-0 rounded-ait-pill bg-profile-avatar',
          compact ? 'size-8' : 'size-10',
        )}
      />
      <div className="min-w-0 flex-1">
        <p className="flex items-baseline gap-2">
          <span className="text-body-2 font-semibold text-ink-900">{author}</span>
          <span className="text-caption text-ink-400">
            {formatRelativeTime(createdAt)}
          </span>
        </p>
        <motion.div layout transition={{ duration: 0.26, ease: EASE_OUT }}>
          <p
            ref={contentRef}
            className={cn(
              'mt-1 whitespace-pre-line text-body-2 leading-relaxed',
              muted ? 'text-ink-400' : 'text-ink-700',
              !isExpanded && 'line-clamp-3',
            )}
          >
            {splitEmoticonSegments(content).map((segment, index) =>
              segment.type === 'emoticon' ? (
                <img
                  key={index}
                  src={segment.emoticon.src}
                  alt={`${segment.emoticon.label} 이모티콘`}
                  className="inline-block size-16 object-contain align-bottom"
                />
              ) : (
                <span key={index}>{segment.value}</span>
              ),
            )}
          </p>
        </motion.div>
        {needsClamp && !isExpanded ? (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="mt-1 text-caption font-medium text-ink-500 transition-colors hover:text-navy-800"
          >
            더 보기
          </button>
        ) : null}
      </div>
    </div>
  )
}
