import { FilePenLine } from 'lucide-react'

interface DocumentBoxSideTabProps {
  onClick: () => void
}

// 서류함 다이얼로그와 같은 좌측 패널 스타일로, 화면 가장자리에 붙는 탭 형태의 진입점을 제공한다.
export function DocumentBoxSideTab({ onClick }: DocumentBoxSideTabProps) {
  return (
    <button
      type="button"
      className="fixed left-0 top-1/2 z-[var(--z-index-sticky)] flex -translate-y-1/2 flex-col items-center gap-2 rounded-r-ait-l border border-l-0 border-border-default bg-action-primary px-2 py-4 text-surface-default shadow-elevation-2 transition-[padding-left] [transition-duration:var(--duration-fast)] hover:pl-3"
      aria-label="서류함 열기"
      onClick={onClick}
    >
      <FilePenLine aria-hidden="true" className="size-5" />
      <span className="text-caption font-semibold tracking-wide [writing-mode:vertical-rl]">
        서류함
      </span>
    </button>
  )
}
