import { VideoTrack, type TrackReference } from '@livekit/components-react'
import { ScreenShare } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ScreenShareTileProps {
  trackRef: TrackReference
  /** 배지에 그대로 노출할 문구. 예: "김싸피님의 화면", "내 화면". */
  label: string
  /** 클릭하면 이 공유 화면을 확대해서 본다. */
  onSelect?: () => void
  className?: string
}

// 화면 공유 트랙 하나를 그리드·썸네일 줄에서 보여주는 타일. 공유자 배지를 함께 표시하고, 클릭하면 확대한다.
export function ScreenShareTile({ trackRef, label, onSelect, className }: ScreenShareTileProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`${label} 확대해서 보기`}
      className={cn(
        'relative overflow-hidden rounded-ait-m bg-black text-white transition-shadow duration-(--duration-fast) ease-standard hover:ring-2 hover:ring-white/70 focus-visible:ring-2 focus-visible:ring-action-primary',
        className,
      )}
    >
      <VideoTrack trackRef={trackRef} className="size-full object-contain" />
      <span className="absolute bottom-2 left-2 flex max-w-[calc(100%-1rem)] items-center gap-1 rounded-ait-s bg-black/60 px-2 py-1 text-caption text-white">
        <ScreenShare className="size-3 shrink-0" aria-hidden="true" />
        <span className="truncate">{label}</span>
      </span>
    </button>
  )
}
