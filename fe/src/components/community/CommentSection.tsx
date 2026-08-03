import { useEffect, useState } from 'react'
import {
  createComment,
  deleteComment,
  fetchComments,
  toggleCommentLike,
  updateComment,
} from '@/api/community'
import { CommentComposer } from '@/components/community/CommentComposer'
import { CommentItem } from '@/components/community/CommentItem'
import { SegmentedControl } from '@/components/form/SegmentedControl'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { formatNumber } from '@/lib/format'
import { useAuth } from '@/lib/useAuth'
import type { CommunityComment, CommunityReply } from '@/types/community'

type CommentSort = 'registered' | 'likes'

interface CommentSectionProps {
  postId: string
  commentCount: number
  allowComments: boolean
  // 요청 실패 안내를 페이지 토스트로 전달한다.
  onNotify?: (message: string) => void
}

// 게시글 하단 댓글 영역. 목록 조회·작성·답글을 백엔드 API로 처리한다.
export function CommentSection({
  postId,
  commentCount,
  allowComments,
  onNotify,
}: CommentSectionProps) {
  const { user } = useAuth()
  const [comments, setComments] = useState<CommunityComment[]>([])
  const [sort, setSort] = useState<CommentSort>('registered')
  const [highlightedId, setHighlightedId] = useState<string | null>(null)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [isDeleting, setDeleting] = useState(false)

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

  // 작성 성공 후 목록을 다시 불러와 서버가 만든 작성자·시각 정보로 맞춘다.
  const submitNew = async (parentId: string | null, content: string) => {
    if (!allowComments) return

    try {
      const id = await createComment(postId, parentId, content)
      setComments(await fetchComments(postId))
      highlight(id)
    } catch (error) {
      onNotify?.('댓글 등록에 실패했습니다. 잠시 후 다시 시도해주세요.')
      throw error
    }
  }

  const submitComment = (content: string) => submitNew(null, content)

  const submitReply = (commentId: string, content: string) =>
    submitNew(commentId, content)

  const editComment = async (commentId: string, content: string) => {
    try {
      await updateComment(commentId, content)
      setComments(await fetchComments(postId))
      highlight(commentId)
    } catch (error) {
      onNotify?.('댓글 수정에 실패했습니다. 잠시 후 다시 시도해주세요.')
      throw error
    }
  }

  // 좋아요는 화면을 먼저 바꾸고 서버에 반영한다. 실패하면 목록을 다시 불러와 되돌린다.
  const toggleLike = (commentId: string) => {
    const target =
      comments.find((comment) => comment.id === commentId) ??
      comments.flatMap((comment) => comment.replies).find((reply) => reply.id === commentId)
    if (!target) return

    const liked = !target.liked
    const apply = <T extends CommunityReply>(item: T): T =>
      item.id === commentId
        ? { ...item, liked, likeCount: item.likeCount + (liked ? 1 : -1) }
        : item
    setComments((prev) =>
      prev.map((comment) => ({
        ...apply(comment),
        replies: comment.replies.map(apply),
      })),
    )

    toggleCommentLike(commentId, liked).catch(async () => {
      onNotify?.('좋아요 처리에 실패했습니다. 잠시 후 다시 시도해주세요.')
      setComments(await fetchComments(postId))
    })
  }

  const confirmDelete = async () => {
    if (!deleteTargetId) return
    setDeleting(true)
    try {
      await deleteComment(deleteTargetId)
      setComments(await fetchComments(postId))
      onNotify?.('댓글이 삭제되었습니다.')
    } catch {
      onNotify?.('댓글 삭제에 실패했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setDeleting(false)
      setDeleteTargetId(null)
    }
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
    <section aria-label="댓글">
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

      {allowComments ? (
        <div className="mt-5 border-b border-line pb-6">
          <div className="flex items-start gap-3">
            <span aria-hidden="true" className="mt-0.5 size-10 shrink-0 rounded-ait-pill bg-profile-avatar" />
            <div className="flex-1">
              <CommentComposer onSubmit={submitComment} />
            </div>
          </div>
        </div>
      ) : (
        <p className="mt-5 border-b border-line pb-6 text-body-2 text-ink-500">
          이 게시글은 댓글 작성을 허용하지 않습니다.
        </p>
      )}

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
              currentUserId={user?.userId ?? null}
              canReply={allowComments}
              isHighlighted={comment.id === highlightedId}
              highlightedReplyId={highlightedId}
              onSubmitReply={submitReply}
              onEdit={editComment}
              onRequestDelete={setDeleteTargetId}
              onToggleLike={toggleLike}
            />
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={deleteTargetId != null}
        onOpenChange={(open) => {
          if (!open) setDeleteTargetId(null)
        }}
        title="댓글을 삭제할까요?"
        description="삭제한 댓글은 되돌릴 수 없습니다."
        confirmLabel="댓글 삭제"
        confirmVariant="destructive"
        isConfirming={isDeleting}
        onConfirm={() => void confirmDelete()}
      />
    </section>
  )
}
