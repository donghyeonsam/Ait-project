import { CATEGORY_META } from '@/lib/community-categories'
import { cn } from '@/lib/utils'
import type { CommunityCategory } from '@/types/community'

// 게시글 카테고리 배지.
export function CategoryBadge({
  category,
  className,
}: {
  category: CommunityCategory
  className?: string
}) {
  const meta = CATEGORY_META[category]
  return (
    <span
      className={cn(
        'inline-flex rounded-ait-pill px-3 py-1 text-caption font-medium',
        meta.badgeClass,
        className,
      )}
    >
      {meta.label}
    </span>
  )
}

// #태그 칩. 목록은 solid, 상세는 outline을 쓴다.
export function TagChip({
  label,
  variant = 'solid',
  className,
}: {
  label: string
  variant?: 'solid' | 'outline'
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex rounded-ait-pill px-2.5 py-0.5 text-caption text-tag-chip',
        variant === 'solid'
          ? 'bg-tag-chip-surface'
          : 'border border-tag-chip/40 bg-surface-default',
        className,
      )}
    >
      #{label}
    </span>
  )
}
