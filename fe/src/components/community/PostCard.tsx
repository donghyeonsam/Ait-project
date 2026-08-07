import { motion } from 'framer-motion'
import { Bookmark, Eye, Heart, MessageCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AuthenticatedImage } from '@/components/common/AuthenticatedImage'
import { CategoryBadge, TagChip } from '@/components/community/badges'
import { RollingCounter } from '@/components/community/RollingCounter'
import { formatCompactCount } from '@/lib/format'
import { listItem } from '@/lib/motion'
import { cn } from '@/lib/utils'
import type { CommunityPost } from '@/types/community'

interface PostCardProps {
  post: CommunityPost
  onToggleBookmark: (post: CommunityPost) => void
  onToggleLike: (post: CommunityPost) => void
}

// 목록의 게시글 카드. 카드 전체가 상세로 이동하는 링크이고 북마크·좋아요는 카드 안에서 처리한다.
export function PostCard({ post, onToggleBookmark, onToggleLike }: PostCardProps) {
  return (
    <motion.article
      variants={listItem}
      className="group relative rounded-ait-m border border-line bg-surface-default p-6 transition-[transform,box-shadow] duration-[180ms] ease-[var(--easing-standard)] hover:-translate-y-0.5 hover:shadow-card-hover"
    >
      <Link
        to={`/community/posts/${post.id}`}
        className="absolute inset-0 rounded-ait-m"
        aria-label={`${post.title} 게시글 보기`}
      />

      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-2">
          <CategoryBadge category={post.category} />
          <span aria-hidden="true" className="text-body-2 text-ink-400">
            ·
          </span>
          <span className="truncate text-body-2 font-medium text-ink-500">
            {post.author}
          </span>
        </div>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onToggleBookmark(post)
          }}
          aria-label={post.bookmarked ? '북마크 해제' : '북마크'}
          aria-pressed={post.bookmarked}
          className="relative z-10 -m-1 rounded-ait-s p-1 text-ink-400 transition-colors hover:text-navy-800"
        >
          <motion.span
            key={String(post.bookmarked)}
            initial={{ scale: 1.25 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 18 }}
            className="block"
          >
            <Bookmark
              aria-hidden="true"
              className={cn('size-5', post.bookmarked && 'fill-navy-800 text-navy-800')}
            />
          </motion.span>
        </button>
      </div>

      <div className="mt-3 flex h-24 items-start gap-4">
        <div className="min-w-0 flex-1 overflow-hidden">
          <h3 className="line-clamp-1 text-[18px] font-semibold text-ink-900 transition-colors duration-[180ms] group-hover:text-navy-800">
            {post.title}
          </h3>
          <p className="mt-1.5 line-clamp-1 text-body-2 text-ink-500">{post.excerpt}</p>
          <div className="mt-3 flex flex-nowrap gap-1.5 overflow-hidden">
            {post.tags.map((tag) => (
              <TagChip key={tag} label={tag} />
            ))}
          </div>
        </div>

        {post.thumbnail ? (
          // 카드 높이는 이 칸(h-24)이 정하고, 실제 이미지는 위로 튀어나와 헤더 영역까지 덮는 정사각형(136px)이다.
          <div className="relative h-24 w-34 shrink-0">
            <AuthenticatedImage
              src={post.thumbnail}
              alt=""
              aria-hidden="true"
              className="absolute -top-10 right-0 size-34 rounded-ait-s border border-line-soft object-cover"
            />
          </div>
        ) : null}

        <div className="flex shrink-0 items-center gap-4 self-end text-caption text-ink-500">
          <span className="inline-flex items-center gap-1.5">
            <Eye aria-hidden="true" className="size-4 text-ink-400" />
            <span className="sr-only">조회수</span>
            {formatCompactCount(post.viewCount)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MessageCircle aria-hidden="true" className="size-4 text-ink-400" />
            <span className="sr-only">댓글수</span>
            {formatCompactCount(post.commentCount)}
          </span>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              onToggleLike(post)
            }}
            aria-label={post.liked ? '좋아요 취소' : '좋아요'}
            aria-pressed={post.liked}
            className={cn(
              'relative z-10 inline-flex items-center gap-1.5 rounded-ait-s transition-colors hover:text-danger',
              post.liked && 'text-danger',
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
                className={cn('size-4', post.liked ? 'fill-danger text-danger' : 'text-ink-400')}
              />
            </motion.span>
            <RollingCounter value={post.likeCount} />
          </button>
        </div>
      </div>
    </motion.article>
  )
}

// 더보기 로딩 중 표시하는 카드 스켈레톤.
export function PostCardSkeleton() {
  return (
    <div className="rounded-ait-m border border-line bg-surface-default p-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="analyzing-shimmer h-6 w-16 rounded-ait-pill" />
          <div className="analyzing-shimmer h-4 w-14 rounded-ait-s" />
        </div>
        <div className="analyzing-shimmer size-5 rounded-ait-s" />
      </div>
      <div className="analyzing-shimmer mt-4 h-5 w-2/3 rounded-ait-s" />
      <div className="analyzing-shimmer mt-2.5 h-4 w-1/2 rounded-ait-s" />
      <div className="mt-4 flex items-center justify-between">
        <div className="flex gap-1.5">
          <div className="analyzing-shimmer h-5 w-14 rounded-ait-pill" />
          <div className="analyzing-shimmer h-5 w-14 rounded-ait-pill" />
        </div>
        <div className="analyzing-shimmer h-4 w-32 rounded-ait-s" />
      </div>
    </div>
  )
}
