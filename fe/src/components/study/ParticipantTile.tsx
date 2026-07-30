import { useEffect, useState, type DragEvent, type MouseEvent } from 'react'
import { VideoTrack, type TrackReference } from '@livekit/components-react'
import { Lock, ScreenShare, UserRound, Volume2, VolumeX } from 'lucide-react'
import type { RemoteAudioTrack } from 'livekit-client'
import { MasterVolumeSlider } from '@/components/interview/MasterVolumeSlider'
import type { StudyParticipant } from '@/mocks/study'
import { cn } from '@/lib/utils'

interface ParticipantTileProps {
  participant: StudyParticipant
  /** 이 참가자의 카메라 트랙. 본인/상대방 모두 LiveKit 구독 트랙에서 받아온다. */
  trackRef?: TrackReference | null
  /** 상대방 오디오 트랙. 음량 조절 슬라이더를 실제 트랙 볼륨에 연결하는 데 쓴다. 본인은 넘기지 않는다. */
  audioTrackRef?: TrackReference | null
  /** 그리드 순서 변경(다른 참가자 타일 사이 드래그 앤 드롭)에만 쓴다. 본인 타일은 대상이 아니다. */
  draggableEnabled?: boolean
  locked?: boolean
  /** 이 참가자가 화면을 공유하는 중이면 타일에 공유 아이콘을 표시한다. */
  sharingScreen?: boolean
  onDragStart?: () => void
  onDropOn?: () => void
  onContextMenu?: (event: MouseEvent<HTMLDivElement>) => void
  className?: string
}

// 그리드·스테이지 뷰에서 공통으로 쓰는 참가자 영상 타일.
export function ParticipantTile({
  participant,
  trackRef = null,
  audioTrackRef = null,
  draggableEnabled = false,
  locked = false,
  sharingScreen = false,
  onDragStart,
  onDropOn,
  onContextMenu,
  className,
}: ParticipantTileProps) {
  const [remoteVolume, setRemoteVolume] = useState(100)
  const [remoteMuted, setRemoteMuted] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const showVideo = Boolean(trackRef && !trackRef.publication.isMuted)

  useEffect(() => {
    const track = audioTrackRef?.publication.track as RemoteAudioTrack | undefined
    track?.setVolume(remoteMuted ? 0 : remoteVolume / 100)
  }, [audioTrackRef, remoteVolume, remoteMuted])

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
      {showVideo && trackRef ? (
        <VideoTrack
          trackRef={trackRef}
          className={cn('size-full object-cover', participant.isSelf && '-scale-x-100')}
        />
      ) : (
        <div className="flex size-full items-center justify-center">
          {participant.isSelf ? (
            <span className="text-caption text-white/50">카메라 꺼짐</span>
          ) : (
            <UserRound className="size-8 text-white/40" aria-hidden="true" />
          )}
        </div>
      )}

      <div className="absolute left-2 top-2 flex items-center gap-1">
        {participant.isSelf ? (
          <span className="rounded-ait-s bg-black/40 px-2 py-1 text-caption text-white">나</span>
        ) : null}
        {sharingScreen ? (
          <span
            className="flex size-6 items-center justify-center rounded-ait-s bg-black/40 text-white"
            title="화면 공유 중"
            aria-label={`${participant.name} 화면 공유 중`}
          >
            <ScreenShare className="size-3.5" aria-hidden="true" />
          </span>
        ) : null}
      </div>

      {participant.isSelf ? null : (
        <>
          {locked ? (
            <span
              className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-ait-s bg-black/40 text-white"
              title="위치 고정됨"
            >
              <Lock className="size-3.5" aria-hidden="true" />
            </span>
          ) : null}

          <div className="absolute inset-x-0 bottom-0 flex items-center gap-1 bg-linear-to-t from-black/70 to-transparent px-2 py-1 opacity-0 transition-opacity duration-(--duration-fast) ease-standard group-hover:opacity-100 group-focus-within:opacity-100 @sm:gap-2 @sm:px-3 @sm:py-2 @lg:gap-3 @lg:px-4 @lg:py-2.5 @2xl:gap-4 @2xl:px-5 @2xl:py-3">
            <span className="truncate text-caption font-medium text-white @lg:text-body-2 @2xl:text-body-1">
              {participant.name}
            </span>

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
                <VolumeX className="size-3 @sm:size-4 @lg:size-5 @2xl:size-6" aria-hidden="true" />
              ) : (
                <Volume2 className="size-3 @sm:size-4 @lg:size-5 @2xl:size-6" aria-hidden="true" />
              )}
            </button>

            <div className="w-10 shrink-0 @sm:w-20 @lg:w-28 @2xl:w-40">
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
