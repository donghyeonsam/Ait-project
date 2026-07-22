import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react'
import { MasterVolumeSlider } from '@/components/interview/MasterVolumeSlider'
import { useAudioLevel } from '@/components/interview/useAudioLevel'
import { cn } from '@/lib/utils'

interface DeviceControlBarProps {
  micStream: MediaStream | null
  micMuted: boolean
  micGain: number
  onToggleMicMuted: () => void
  onChangeMicGain: (value: number) => void
  speakerMuted: boolean
  speakerVolume: number
  onToggleSpeakerMuted: () => void
  onChangeSpeakerVolume: (value: number) => void
}

function toggleIconClass(isMuted: boolean) {
  return cn(
    'shrink-0 rounded-ait-s p-1 transition-colors ease-standard duration-(--duration-fast) hover:bg-status-neutral-surface',
    isMuted ? 'text-status-error' : 'text-text-primary',
  )
}

export function DeviceControlBar({
  micStream,
  micMuted,
  micGain,
  onToggleMicMuted,
  onChangeMicGain,
  speakerMuted,
  speakerVolume,
  onToggleSpeakerMuted,
  onChangeSpeakerVolume,
}: DeviceControlBarProps) {
  const micLevel = useAudioLevel(micMuted ? null : micStream, micGain)

  return (
    <div className="flex flex-wrap items-center gap-6">
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-pressed={micMuted}
          aria-label={micMuted ? '마이크 켜기' : '마이크 끄기'}
          className={toggleIconClass(micMuted)}
          onClick={onToggleMicMuted}
        >
          {micMuted ? <MicOff className="size-5" aria-hidden="true" /> : <Mic className="size-5" aria-hidden="true" />}
        </button>
        <div className="w-28">
          <MasterVolumeSlider
            gain={micGain}
            level={micMuted ? 0 : micLevel}
            onChange={onChangeMicGain}
            label="마이크 게인"
            disabled={micMuted}
            showValue={false}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-pressed={speakerMuted}
          aria-label={speakerMuted ? '스피커 켜기' : '스피커 끄기'}
          className={toggleIconClass(speakerMuted)}
          onClick={onToggleSpeakerMuted}
        >
          {speakerMuted ? (
            <VolumeX className="size-5" aria-hidden="true" />
          ) : (
            <Volume2 className="size-5" aria-hidden="true" />
          )}
        </button>
        <div className="w-28">
          <MasterVolumeSlider
            gain={speakerVolume}
            level={0}
            onChange={onChangeSpeakerVolume}
            label="스피커 볼륨"
            disabled={speakerMuted}
            showValue={false}
          />
        </div>
      </div>
    </div>
  )
}
