import { useEffect, useRef, useState } from 'react'
import { fetchComments } from '@/api/community'
import { CommentComposer } from '@/components/community/CommentComposer'
import { CommentItem } from '@/components/community/CommentItem'
import { SegmentedControl } from '@/components/form/SegmentedControl'
import { Skeleton } from '@/components/ui/skeleton'
import { formatNumber } from '@/lib/format'
import type { CommunityComment } from '@/types/community'

type CommentSort = 'registered' | 'likes'

interface CommentSectionProps {
  postId: string
  commentCount: number
}

// 게시글 하단 댓글 영역. 목록 조회는 실제 API를 쓰고 작성·답글은 로컬 상태로 처리한다.
// TODO: 실제 API 연동 필요 - 댓글 작성
export function CommentSection({ postId, commentCount }: CommentSectionProps) {
  const [comments, setComments] = useState<CommunityComment[]>([])
  const [sort, setSort] = useState<CommentSort>('registered')
  const [highlightedId, setHighlightedId] = useState<string | null>(null)
  const nextId = useRef(0)

  // 마지막으로 댓글을 불러온 글과 현재 글이 다르면 로딩 중으로 본다.
  const [loadedPostId, setLoadedPostId] = useState<string | null>(null)
  const isLoading = loadedPostId !== postId

  useEffect(() => {
    let cancelled = false
    fetchComments(postId).then((result) => {
      if (cancelled) return
      setComments(result)
      setLoadedPostId(postId)
    })
    return () => {
      cancelled = true
    }
  }, [postId])

  // 등록한 댓글·답글을 1.2초 동안 하이라이트했다가 자연스럽게 되돌린다.
  const highlight = (id: string) => {
    setHighlightedId(id)
    setTimeout(() => {
      setHighlightedId((current) => (current === id ? null : current))
    }, 1200)
  }

  const submitComment = async (content: string) => {
    await new Promise((resolve) => setTimeout(resolve, 400))
    const id = `local-comment-${nextId.current++}`
    const comment: CommunityComment = {
      id,
      authorId: null,
      author: '김싸피',
      createdAt: new Date().toISOString(),
      content,
      likeCount: 0,
      deleted: false,
      replies: [],
    }
    setComments((prev) => [comment, ...prev])
    highlight(id)
  }

  const submitReply = async (commentId: string, content: string) => {
    await new Promise((resolve) => setTimeout(resolve, 400))
    const id = `local-reply-${nextId.current++}`
    setComments((prev) =>
      prev.map((comment) =>
        comment.id === commentId
          ? {
              ...comment,
              replies: [
                ...comment.replies,
                {
                  id,
                  authorId: null,
                  author: '김싸피',
                  createdAt: new Date().toISOString(),
                  content,
                  likeCount: 0,
                  deleted: false,
                },
              ],
            }
          : comment,
      ),
    )
    highlight(id)
  }

  const sortedComments = [...comments].sort((a, b) =>
    sort === 'likes'
      ? b.likeCount - a.likeCount
      : b.createdAt.localeCompare(a.createdAt),
  )

  // 게시글 상세 응답에 댓글 수가 없어 목록 기준으로 센다. 삭제된 원댓글 껍데기는 제외한다.
  const totalCount = isLoading
    ? commentCount
    : comments.reduce(
        (count, comment) =>
          count + (comment.deleted ? 0 : 1) + comment.replies.length,
        0,
      )

  return (
    <section
      aria-label="댓글"
      className="rounded-ait-m border border-line bg-surface-default p-8"
    >
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-h3 font-bold text-ink-900">
          댓글 {formatNumber(totalCount)}
        </h2>
        <SegmentedControl
          options={[
            { value: 'registered', label: '등록순' },
            { value: 'likes', label: '좋아요순' },
          ]}
          value={sort}
          onChange={setSort}
          ariaLabel="댓글 정렬"
        />
      </div>

      <div className="mt-5 flex items-start gap-3">
        <span aria-hidden="true" className="mt-0.5 size-10 shrink-0 rounded-ait-pill bg-profile-avatar" />
        <div className="flex-1">
          <CommentComposer onSubmit={submitComment} />
        </div>
      </div>

      {isLoading ? (
        <div className="mt-6 flex flex-col gap-5">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="flex items-start gap-3">
              <Skeleton className="size-10 rounded-ait-pill" />
              <div className="flex-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="mt-2 h-4 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <ul className="mt-4">
          {sortedComments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              isHighlighted={comment.id === highlightedId}
              highlightedReplyId={highlightedId}
              onSubmitReply={submitReply}
            />
          ))}
        </ul>
      )}
    </section>
  )
}
