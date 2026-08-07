import { Loader2 } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface InfiniteScrollTriggerProps {
  hasMore: boolean
  isLoading: boolean
  itemCount: number
  onLoadMore: () => void | Promise<void>
  className?: string
  loadingLabel?: string
  endMessage?: string
  errorMessage?: string | null
  fallbackLabel?: string
  rootMargin?: string
}

// 목록 끝을 감지해 다음 묶음을 불러오고, 관찰 기능을 쓸 수 없거나 실패하면 수동 행동을 제공한다.
export function InfiniteScrollTrigger({
  hasMore,
  isLoading,
  itemCount,
  onLoadMore,
  className,
  loadingLabel = '목록을 더 불러오는 중',
  endMessage,
  errorMessage,
  fallbackLabel = '더 불러오기',
  rootMargin = '320px 0px',
}: InfiniteScrollTriggerProps) {
  const triggerRef = useRef<HTMLDivElement>(null)
  const supportsObserver = typeof IntersectionObserver !== 'undefined'

  useEffect(() => {
    const trigger = triggerRef.current
    if (
      !supportsObserver ||
      !trigger ||
      !hasMore ||
      isLoading ||
      errorMessage
    ) {
      return
    }

    let hasRequested = false
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting || hasRequested) return
        hasRequested = true
        observer.disconnect()
        void onLoadMore()
      },
      { rootMargin },
    )

    observer.observe(trigger)
    return () => observer.disconnect()
  }, [
    errorMessage,
    hasMore,
    isLoading,
    itemCount,
    onLoadMore,
    rootMargin,
    supportsObserver,
  ])

  if (errorMessage) {
    return (
      <div className={cn('flex flex-col items-center gap-3', className)}>
        <p className="text-body-2 text-status-error" role="alert">
          {errorMessage}
        </p>
        <Button type="button" variant="secondary" onClick={onLoadMore}>
          다시 불러오기
        </Button>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div
        className={cn(
          'flex items-center justify-center gap-2 text-body-2 text-text-secondary',
          className,
        )}
        role="status"
        aria-live="polite"
      >
        <Loader2 aria-hidden="true" className="size-4 animate-spin" />
        {loadingLabel}
      </div>
    )
  }

  if (!hasMore) {
    return endMessage ? (
      <p
        className={cn(
          'rounded-ait-m border border-border-default bg-surface-default py-4 text-center text-body-2 text-text-secondary',
          className,
        )}
        role="status"
      >
        {endMessage}
      </p>
    ) : null
  }

  if (!supportsObserver) {
    return (
      <div className={cn('flex justify-center', className)}>
        <Button type="button" variant="secondary" onClick={onLoadMore}>
          {fallbackLabel}
        </Button>
      </div>
    )
  }

  return (
    <div
      ref={triggerRef}
      className={cn('h-px w-full', className)}
      aria-hidden="true"
    />
  )
}
