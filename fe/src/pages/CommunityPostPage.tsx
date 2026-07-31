import DOMPurify from 'dompurify'
import { motion } from 'framer-motion'
import { ArrowLeft, Bookmark, Heart, Pencil, Share2, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  deletePost,
  fetchPost,
  toggleBookmark,
  toggleLike,
} from '@/api/community'
import { AuthenticatedHtml } from '@/components/common/AuthenticatedHtml'
import { PageTransition } from '@/components/common/PageTransition'
import { CommentSection } from '@/components/community/CommentSection'
import { RollingCounter } from '@/components/community/RollingCounter'
import { CategoryBadge, TagChip } from '@/components/community/badges'
import { PageLayout } from '@/components/layout/PageLayout'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { ToastStack } from '@/components/ui/toast'
import { formatNumber, formatPostDate } from '@/lib/format'
import { useAuth } from '@/lib/useAuth'
import { useToasts } from '@/lib/useToasts'
import { cn } from '@/lib/utils'
import type { CommunityPost } from '@/types/community'

// 게시글 상세 화면. 본문과 반응·댓글을 보여주고 작성자에게 수정·삭제 행동을 제공한다.
export function CommunityPostPage() {
  const { postId } = useParams<{ postId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [post, setPost] = useState<CommunityPost | null>(null)
  const [isDeleteOpen, setDeleteOpen] = useState(false)
  const [isDeleting, setDeleting] = useState(false)
  const { toasts, showToast } = useToasts()

  // 마지막으로 로딩을 마친 글과 현재 주소의 글이 다르면 로딩 중으로 본다.
  const [loadedPostId, setLoadedPostId] = useState<string | null>(null)
  const isLoading = loadedPostId !== postId

  useEffect(() => {
    if (!postId) return
    let cancelled = false
    fetchPost(postId)
      .then((result) => {
        if (cancelled) return
        setPost(result)
        setLoadedPostId(postId)
      })
      // 조회 실패도 빈 화면 대신 찾을 수 없음 안내로 처리한다.
      .catch(() => {
        if (cancelled) return
        setPost(null)
        setLoadedPostId(postId)
      })
    return () => {
      cancelled = true
    }
  }, [postId])

  // 에디터가 만든 HTML은 렌더 전에 반드시 sanitize한다.
  const safeContent = useMemo(
    () => (post ? DOMPurify.sanitize(post.contentHtml) : ''),
    [post],
  )
  const isAuthor = Boolean(post && user?.nickname === post.author)

  const handleToggleLike = () => {
    if (!post) return
    setPost({
      ...post,
      liked: !post.liked,
      likeCount: post.likeCount + (post.liked ? -1 : 1),
    })
    void toggleLike(post.id, !post.liked)
  }

  const handleToggleBookmark = () => {
    if (!post) return
    setPost({ ...post, bookmarked: !post.bookmarked })
    void toggleBookmark(post.id, !post.bookmarked)
    showToast(post.bookmarked ? '저장을 해제했어요.' : '게시글을 저장했어요.')
  }

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      showToast('링크를 복사했어요.')
    } catch {
      showToast('링크 복사에 실패했어요. 주소창에서 직접 복사해주세요.')
    }
  }

  const handleDelete = async () => {
    if (!post || !user || isDeleting) return
    setDeleting(true)
    try {
      await deletePost(post.id)
      setDeleteOpen(false)
      showToast('게시글을 삭제했어요.')
      setTimeout(() => navigate('/community', { replace: true }), 700)
    } catch {
      setDeleting(false)
      showToast('삭제에 실패했어요. 잠시 후 다시 시도해주세요.')
    }
  }

  return (
    <PageLayout contentClassName="max-w-dashboard">
      <PageTransition>
        <nav aria-label="현재 위치" className="pt-6 text-caption text-ink-500">
          <Link to="/community" className="transition-colors hover:text-navy-800">
            커뮤니티
          </Link>
          <span aria-hidden="true" className="mx-1.5">
            &gt;
          </span>
          <span className="text-ink-700">게시글 상세</span>
        </nav>

        {isLoading ? (
          <PostDetailSkeleton />
        ) : !post ? (
          <div className="my-16 rounded-ait-m border border-line bg-surface-default py-20 text-center">
            <p className="text-body-1 font-semibold text-ink-900">
              게시글을 찾을 수 없어요.
            </p>
            <p className="mt-2 text-body-2 text-ink-500">
              삭제됐거나 주소가 잘못됐을 수 있어요. 목록에서 다시 찾아보세요.
            </p>
            <Link
              to="/community"
              className="mt-6 inline-flex rounded-ait-s bg-navy-900 px-5 py-2.5 text-body-2 font-semibold text-surface-default transition-[filter] hover:brightness-[.92]"
            >
              목록으로 돌아가기
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-6 py-6">
            <article className="rounded-ait-m border border-line bg-surface-default p-8">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <CategoryBadge category={post.category} />
                {isAuthor ? (
                  <div className="flex items-center gap-1" aria-label="게시글 관리">
                    <Button
                      asChild
                      variant="text"
                      className="px-3 text-text-secondary [&_svg]:size-4"
                    >
                      <Link to={`/community/posts/${post.id}/edit`}>
                        <Pencil aria-hidden="true" />
                        수정
                      </Link>
                    </Button>
                    <Button
                      type="button"
                      variant="text"
                      className="px-3 text-status-error hover:bg-status-error-surface [&_svg]:size-4"
                      onClick={() => setDeleteOpen(true)}
                    >
                      <Trash2 aria-hidden="true" />
                      삭제
                    </Button>
                  </div>
                ) : null}
              </div>
              <h1 className="mt-4 text-[26px] font-bold leading-snug text-ink-900">
                {post.title}
              </h1>

              <div className="mt-4 flex items-center gap-3 text-body-2 text-ink-500">
                <span aria-hidden="true" className="size-9 rounded-ait-pill bg-profile-avatar" />
                <span className="font-medium text-ink-700">{post.author}</span>
                <span>{formatPostDate(post.createdAt)}</span>
                <span aria-hidden="true">·</span>
                <span>조회 {formatNumber(post.viewCount)}</span>
              </div>

              <hr className="mt-5 border-0 border-t border-gold-500" />

              <AuthenticatedHtml
                html={safeContent}
                className="community-prose mt-6"
              />

              <div className="mt-6 flex flex-wrap gap-1.5">
                {post.tags.map((tag) => (
                  <TagChip key={tag} label={tag} variant="outline" />
                ))}
              </div>

              <div className="mt-8 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleToggleLike}
                  aria-pressed={post.liked}
                  aria-label={post.liked ? '좋아요 취소' : '좋아요'}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-ait-s border px-5 py-2.5 text-body-2 font-semibold transition-colors',
                    post.liked
                      ? 'border-danger/40 text-danger'
                      : 'border-line text-danger hover:border-danger/40',
                  )}
                >
                  <motion.span
                    key={String(post.liked)}
                    initial={{ scale: 1.25 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 18 }}
                    className="block"
                  >
                    <Heart
                      aria-hidden="true"
                      className={cn('size-5', post.liked && 'fill-danger')}
                    />
                  </motion.span>
                  <RollingCounter value={post.likeCount} />
                </button>
                <button
                  type="button"
                  onClick={handleToggleBookmark}
                  aria-pressed={post.bookmarked}
                  className="inline-flex items-center gap-2 rounded-ait-s border border-line px-5 py-2.5 text-body-2 font-medium text-ink-700 transition-colors hover:border-ink-400"
                >
                  <Bookmark
                    aria-hidden="true"
                    className={cn('size-5', post.bookmarked && 'fill-navy-800 text-navy-800')}
                  />
                  저장
                </button>
                <button
                  type="button"
                  onClick={() => void handleShare()}
                  className="inline-flex items-center gap-2 rounded-ait-s border border-line px-5 py-2.5 text-body-2 font-medium text-ink-700 transition-colors hover:border-ink-400"
                >
                  <Share2 aria-hidden="true" className="size-5" />
                  공유
                </button>
              </div>
            </article>

            <div>
              <Link
                to="/community"
                className="inline-flex items-center gap-1.5 text-body-2 font-medium text-ink-500 transition-colors hover:text-navy-800"
              >
                <ArrowLeft aria-hidden="true" className="size-4" />
                목록으로 돌아가기
              </Link>
            </div>

            <CommentSection postId={post.id} commentCount={post.commentCount} />
          </div>
        )}
      </PageTransition>
      <ConfirmDialog
        open={isDeleteOpen}
        onOpenChange={(open) => {
          if (!isDeleting) setDeleteOpen(open)
        }}
        title="게시글을 삭제할까요?"
        description="삭제한 게시글은 다시 복구할 수 없습니다."
        confirmLabel={isDeleting ? '삭제 중...' : '게시글 삭제'}
        cancelLabel="취소"
        confirmVariant="destructive"
        isConfirming={isDeleting}
        onConfirm={() => void handleDelete()}
      />
      <ToastStack toasts={toasts} />
    </PageLayout>
  )
}

function PostDetailSkeleton() {
  return (
    <div className="my-6 rounded-ait-m border border-line bg-surface-default p-8">
      <Skeleton className="h-6 w-16 rounded-ait-pill" />
      <Skeleton className="mt-4 h-8 w-3/4" />
      <div className="mt-4 flex items-center gap-3">
        <Skeleton className="size-9 rounded-ait-pill" />
        <Skeleton className="h-4 w-48" />
      </div>
      <Skeleton className="mt-8 h-4 w-full" />
      <Skeleton className="mt-3 h-4 w-11/12" />
      <Skeleton className="mt-3 h-4 w-4/5" />
      <Skeleton className="mt-3 h-4 w-2/3" />
    </div>
  )
}
