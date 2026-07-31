import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, ThumbsUp } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { CommentComposer } from '@/components/community/CommentComposer'
import { formatRelativeTime } from '@/lib/format'
import { EASE_OUT, collapseSection } from '@/lib/motion'
import { cn } from '@/lib/utils'
import type { CommunityComment, CommunityReply } from '@/types/community'

const REPLY_PREVIEW_COUNT = 3
// 답글이 이 수를 넘으면 처음 3개만 보여주고 나머지는 더 보기로 감춘다.
const REPLY_PREVIEW_THRESHOLD = 5

interface CommentItemProps {
  comment: CommunityComment
  isHighlighted: boolean
  highlightedReplyId: string | null
  onSubmitReply: (commentId: string, content: string) => Promise<void>
}

// 최상위 댓글 하나. 긴 본문 축약, 답글 접힘·펼침, 답글 쓰기를 담당한다.
export function CommentItem({
  comment,
  isHighlighted,
  highlightedReplyId,
  onSubmitReply,
}: CommentItemProps) {
  const [isThreadOpen, setThreadOpen] = useState(false)
  const [showAllReplies, setShowAllReplies] = useState(false)
  const [isReplyOpen, setReplyOpen] = useState(false)

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
        <CommentBody
          author={comment.author}
          createdAt={comment.createdAt}
          content={comment.content}
          muted={comment.deleted}
        />

        <div className="mt-2 flex items-center gap-4 pl-[52px]">
          {!comment.deleted ? (
            <span className="inline-flex items-center gap-1.5 text-caption text-ink-500">
              <ThumbsUp aria-hidden="true" className="size-4 text-ink-400" />
              <span className="sr-only">좋아요</span>
              {comment.likeCount}
            </span>
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
          {!comment.deleted ? (
            <button
              type="button"
              onClick={() => setReplyOpen((open) => !open)}
              className="text-caption font-medium text-ink-500 transition-colors hover:text-navy-800"
            >
              답글 쓰기
            </button>
          ) : null}
        </div>
      </div>

      {/* 답글 쓰기 입력창 — 슬라이드 다운으로 열리고 @닉네임이 채워진다. */}
      <AnimatePresence initial={false}>
        {isReplyOpen ? (
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
                  isHighlighted={reply.id === highlightedReplyId}
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
  isHighlighted,
}: {
  reply: CommunityReply
  isHighlighted: boolean
}) {
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
      <CommentBody
        author={reply.author}
        createdAt={reply.createdAt}
        content={reply.content}
        compact
      />
      <span className="mt-1.5 inline-flex items-center gap-1.5 pl-[44px] text-caption text-ink-500">
        <ThumbsUp aria-hidden="true" className="size-3.5 text-ink-400" />
        <span className="sr-only">좋아요</span>
        {reply.likeCount}
      </span>
    </motion.li>
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
            {content}
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
