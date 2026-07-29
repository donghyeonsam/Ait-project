import { Loader2 } from 'lucide-react'

interface LoadMoreButtonProps {
  hasMore: boolean
  isLoading: boolean
  onClick: () => void
}

// 목록 하단 + 더보기 버튼. 더 불러올 글이 없으면 안내 문구로 바뀐다.
export function LoadMoreButton({ hasMore, isLoading, onClick }: LoadMoreButtonProps) {
  if (!hasMore) {
    return (
      <p className="w-full rounded-ait-m border border-line bg-surface-default py-4 text-center text-body-2 text-ink-400">
        모든 글을 확인했어요
      </p>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isLoading}
      className="flex w-full items-center justify-center gap-2 rounded-ait-m border border-line bg-surface-default py-4 text-body-2 font-medium text-ink-700 transition-colors hover:bg-surface-muted disabled:text-ink-400"
    >
      {isLoading ? (
        <>
          <Loader2 aria-hidden="true" className="size-4 animate-spin" />
          불러오는 중
        </>
      ) : (
        '+ 더보기'
      )}
    </button>
  )
}
