import type { InterviewType, JobType } from '@/mocks/dashboard'
import { cn } from '@/lib/utils'

type Difficulty = '쉬움' | '보통' | '어려움'
type TagVariant = InterviewType | JobType | Difficulty

const tagStyles: Record<TagVariant, string> = {
  직무: 'bg-tag-role-surface text-tag-role',
  기술: 'bg-tag-tech-surface text-tag-tech',
  포폴: 'bg-tag-portfolio-surface text-tag-portfolio',
  CS: 'bg-tag-cs-surface text-tag-cs',
  종합: 'bg-tag-neutral text-surface-default',
  FE: 'bg-tag-fe-surface text-tag-fe',
  BE: 'bg-tag-be-surface text-tag-be',
  AI: 'bg-tag-ai-surface text-tag-ai',
  Data: 'bg-tag-data text-surface-default',
  Infra: 'bg-tag-infra text-surface-default',
  보안: 'bg-tag-security text-surface-default',
  QA: 'bg-tag-neutral text-surface-default',
  Mobile: 'bg-tag-mobile text-surface-default',
  'PM/PO': 'bg-tag-pm-surface text-tag-pm',
  쉬움: 'bg-difficulty-easy-surface text-difficulty-easy',
  보통: 'bg-difficulty-normal-surface text-difficulty-normal',
  어려움: 'bg-difficulty-hard-surface text-difficulty-hard',
}

interface TagBadgeProps {
  variant: TagVariant
  className?: string
}

export function TagBadge({ variant, className }: TagBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex min-w-12 items-center justify-center rounded-ait-s px-3 py-1 text-caption font-medium leading-none',
        tagStyles[variant],
        className,
      )}
    >
      {variant}
    </span>
  )
}
