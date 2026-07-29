import DOMPurify from 'dompurify'
import { motion } from 'framer-motion'
import { ArrowLeft, Bookmark, Heart, Share2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchPost, toggleBookmark, toggleLike } from '@/api/community'
import { PageTransition } from '@/components/common/PageTransition'
import { CommentSection } from '@/components/community/CommentSection'
import { RollingCounter } from '@/components/community/RollingCounter'
import { CategoryBadge, TagChip } from '@/components/community/badges'
import { PageLayout } from '@/components/layout/PageLayout'
import { Skeleton } from '@/components/ui/skeleton'
import { ToastStack } from '@/components/ui/toast'
import { formatNumber, formatPostDate } from '@/lib/format'
import { useToasts } from '@/lib/useToasts'
import { cn } from '@/lib/utils'
import type { CommunityPost } from '@/types/community'

// 게시글 상세 화면. 본문(에디터 HTML)과 좋아요·저장·공유, 댓글 영역을 담당한다.
export function CommunityPostPage() {
  const { postId } = useParams<{ postId: string }>()
  const [post, setPost] = useState<CommunityPost | null>(null)
  const { toasts, showToast } = useToasts()

  // 마지막으로 로딩을 마친 글과 현재 주소의 글이 다르면 로딩 중으로 본다.
  const [loadedPostId, setLoadedPostId] = useState<string | null>(null)
  const isLoading = loadedPostId !== postId

  useEffect(() => {
    if (!postId) return
    let cancelled = false
    fetchPost(postId).then((result) => {
      if (cancelled) return
      setPost(result)
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
              <CategoryBadge category={post.category} />
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

              <div
                className="community-prose mt-6"
                // sanitize를 거친 에디터 HTML만 주입한다.
                dangerouslySetInnerHTML={{ __html: safeContent }}
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
