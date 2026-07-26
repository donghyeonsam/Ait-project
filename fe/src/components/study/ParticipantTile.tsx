import { useEffect, useRef, useState, type DragEvent, type MouseEvent } from 'react'
import { Lock, UserRound, Volume2, VolumeX } from 'lucide-react'
import { MasterVolumeSlider } from '@/components/interview/MasterVolumeSlider'
import type { StudyParticipant } from '@/mocks/study'
import { cn } from '@/lib/utils'

interface ParticipantTileProps {
  participant: StudyParticipant
  /** 본인 타일에만 실제 로컬 스트림을 연결한다. 다른 참가자는 연결된 미디어가 없는 mock 타일이다. */
  stream?: MediaStream | null
  cameraOn?: boolean
  /** 그리드 순서 변경(다른 참가자 타일 사이 드래그 앤 드롭)에만 쓴다. 본인 타일은 대상이 아니다. */
  draggableEnabled?: boolean
  locked?: boolean
  onDragStart?: () => void
  onDropOn?: () => void
  onContextMenu?: (event: MouseEvent<HTMLDivElement>) => void
  className?: string
}

// 그리드·스테이지 뷰에서 공통으로 쓰는 참가자 영상 타일.
export function ParticipantTile({
  participant,
  stream = null,
  cameraOn = false,
  draggableEnabled = false,
  locked = false,
  onDragStart,
  onDropOn,
  onContextMenu,
  className,
}: ParticipantTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  // TODO: 실제 API 연동 필요 — WebRTC 원격 오디오 트랙 볼륨/음소거로 교체. 지금은 화면 확인용 로컬 상태다.
  const [remoteVolume, setRemoteVolume] = useState(100)
  const [remoteMuted, setRemoteMuted] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const showVideo = participant.isSelf && cameraOn && Boolean(stream)

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = participant.isSelf ? stream : null
    }
  }, [participant.isSelf, stream])

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!draggableEnabled) return
    event.preventDefault()
    setDragOver(true)
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    if (!draggableEnabled) return
    event.preventDefault()
    setDragOver(false)
    onDropOn?.()
  }

  return (
    <div
      draggable={draggableEnabled}
      onDragStart={draggableEnabled ? () => onDragStart?.() : undefined}
      onDragOver={handleDragOver}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onContextMenu={onContextMenu}
      className={cn(
        // 호출부(그리드/스트립/스테이지)가 이미 정확한 비율의 박스를 만들어 넘겨주므로 그 크기를 그대로 채운다.
        // @container로 감싸 하위 오버레이가 이 타일의 실제 크기에 맞춰 커지고 작아지게 한다.
        'group @container relative flex h-full w-full items-center justify-center overflow-hidden rounded-ait-m bg-theater-backdrop text-white transition-shadow duration-(--duration-fast) ease-standard',
        !participant.isSelf && 'hover:ring-2 hover:ring-white/70',
        dragOver && 'ring-2 ring-action-primary',
        className,
      )}
    >
      {showVideo ? (
        <video ref={videoRef} autoPlay playsInline muted className="size-full object-cover" />
      ) : (
        <div className="flex size-full items-center justify-center">
          {participant.isSelf ? (
            <span className="text-caption text-white/50">카메라 꺼짐</span>
          ) : (
            <UserRound className="size-8 text-white/40" aria-hidden="true" />
          )}
        </div>
      )}

      {participant.isSelf ? (
        <span className="absolute left-2 top-2 rounded-ait-s bg-black/40 px-2 py-1 text-caption text-white">
          나
        </span>
      ) : (
        <>
          {locked ? (
            <span
              className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-ait-s bg-black/40 text-white"
              title="위치 고정됨"
            >
              <Lock className="size-3.5" aria-hidden="true" />
            </span>
          ) : null}

          <div className="absolute inset-x-0 bottom-0 flex items-center gap-1 bg-linear-to-t from-black/70 to-transparent px-2 py-1 opacity-0 transition-opacity duration-(--duration-fast) ease-standard group-hover:opacity-100 group-focus-within:opacity-100 @sm:gap-2 @sm:px-3 @sm:py-2 @lg:gap-3 @lg:px-4 @lg:py-2.5">
            <span className="truncate text-caption font-medium text-white">{participant.name}</span>

            <button
              type="button"
              aria-pressed={remoteMuted}
              aria-label={remoteMuted ? `${participant.name} 음소거 해제` : `${participant.name} 음소거`}
              onClick={(event) => {
                event.stopPropagation()
                setRemoteMuted((value) => !value)
              }}
              className="ml-auto shrink-0 text-white/80 transition-colors hover:text-white"
            >
              {remoteMuted ? (
                <VolumeX className="size-3 @sm:size-4 @lg:size-5" aria-hidden="true" />
              ) : (
                <Volume2 className="size-3 @sm:size-4 @lg:size-5" aria-hidden="true" />
              )}
            </button>

            <div className="w-10 shrink-0 @sm:w-20 @lg:w-28">
              <MasterVolumeSlider
                gain={remoteVolume}
                level={0}
                onChange={setRemoteVolume}
                label={`${participant.name} 음량 조절`}
                showValue={false}
                disabled={remoteMuted}
                tone="inverse"
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
