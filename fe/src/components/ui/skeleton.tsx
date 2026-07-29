import { cn } from '@/lib/utils'

// shimmer가 흐르는 로딩 자리표시 블록.
export function Skeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn('analyzing-shimmer rounded-ait-s', className)} />
  )
}
