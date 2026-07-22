import { useEffect, useRef } from 'react'
import { useLatestCallback } from '@/lib/useLatestCallback'
import { Camera, Mic, RotateCcw, Video, Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MasterVolumeSlider } from '@/components/interview/MasterVolumeSlider'
import { useAudioLevel } from '@/components/interview/useAudioLevel'
import { useMediaDevices } from '@/components/interview/useMediaDevices'
import { useSoundTest } from '@/components/interview/useSoundTest'
import { cn } from '@/lib/utils'

interface Step5DeviceSetupProps {
  cameraDeviceId: string | null
  speakerDeviceId: string | null
  micDeviceId: string | null
  speakerVolume: number
  micGain: number
  onChangeCamera: (id: string) => void
  onChangeSpeaker: (id: string) => void
  onChangeMic: (id: string) => void
  onChangeSpeakerVolume: (value: number) => void
  onChangeMicGain: (value: number) => void
  onReadyChange: (ready: boolean) => void
}

const selectClass =
  'w-full rounded-ait-s border border-border-default bg-surface-default px-3 py-2 text-body-2 text-text-primary focus:border-action-primary focus:outline-none focus:ring-3 focus:ring-action-primary/25 disabled:cursor-not-allowed disabled:text-text-secondary'

export function Step5DeviceSetup({
  cameraDeviceId,
  speakerDeviceId,
  micDeviceId,
  speakerVolume,
  micGain,
  onChangeCamera,
  onChangeSpeaker,
  onChangeMic,
  onChangeSpeakerVolume,
  onChangeMicGain,
  onReadyChange,
}: Step5DeviceSetupProps) {
  const { permission, stream, devices, requestAccess } = useMediaDevices()
  const videoRef = useRef<HTMLVideoElement>(null)
  const micLevel = useAudioLevel(stream, micGain)
  const soundTest = useSoundTest(speakerDeviceId, speakerVolume)
  const notifyReadyChange = useLatestCallback(onReadyChange)

  useEffect(() => {
    notifyReadyChange(permission === 'granted')
  }, [notifyReadyChange, permission])

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

  useEffect(() => {
    if (!cameraDeviceId && devices.camera[0]) {
      onChangeCamera(devices.camera[0].id)
    }
    if (!micDeviceId && devices.mic[0]) {
      onChangeMic(devices.mic[0].id)
    }
    if (!speakerDeviceId && devices.speaker[0]) {
      onChangeSpeaker(devices.speaker[0].id)
    }
  }, [cameraDeviceId, micDeviceId, speakerDeviceId, devices, onChangeCamera, onChangeMic, onChangeSpeaker])

  const handleCameraChange = (id: string) => {
    onChangeCamera(id)
    void requestAccess(id, micDeviceId ?? undefined)
  }

  const handleMicChange = (id: string) => {
    onChangeMic(id)
    void requestAccess(cameraDeviceId ?? undefined, id)
  }

  return (
    <section aria-labelledby="step5-title" className="space-y-6">
      <h2 id="step5-title" className="sr-only">환경 설정</h2>

      <div className="flex aspect-video w-full flex-col items-center justify-center gap-4 overflow-hidden rounded-ait-m border border-border-default bg-status-neutral-surface text-text-secondary">
        {permission === 'granted' ? (
          <video ref={videoRef} autoPlay playsInline muted className="size-full object-cover" />
        ) : permission === 'pending' ? (
          <p className="text-body-1">카메라 권한을 요청하고 있어요…</p>
        ) : permission === 'denied' ? (
          <div className="flex flex-col items-center gap-4 px-6 text-center">
            <Video className="size-14" aria-hidden="true" />
            <p className="text-body-1">카메라를 사용할 수 없습니다. 브라우저 설정에서 권한을 허용해 주세요.</p>
            <Button type="button" variant="secondary" onClick={() => requestAccess()}>
              <RotateCcw className="size-4" aria-hidden="true" />
              권한 설정 확인
            </Button>
          </div>
        ) : permission === 'unsupported' ? (
          <p className="px-6 text-center text-body-1">이 브라우저 또는 환경에서는 카메라·마이크 접근을 지원하지 않아요.</p>
        ) : (
          <div className="flex flex-col items-center gap-4 px-6 text-center">
            <Video className="size-14" aria-hidden="true" />
            <p className="text-body-1">면접 진행을 위해 카메라와 마이크 접근 권한이 필요해요.</p>
            <Button type="button" onClick={() => requestAccess()}>
              카메라·마이크 허용하기
            </Button>
          </div>
        )}
      </div>

      <div className={cn('grid grid-cols-3 gap-6', permission !== 'granted' && 'pointer-events-none opacity-50')}>
        <div>
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="camera-select" className="flex items-center gap-2 text-body-2 font-medium text-text-primary">
              <Camera className="size-4" aria-hidden="true" />
              카메라 설정
            </label>
            <Button
              type="button"
              variant="secondary"
              tabIndex={-1}
              aria-hidden="true"
              className="invisible shrink-0 px-3 py-1.5 text-caption"
            >
              테스트
            </Button>
          </div>
          <select
            id="camera-select"
            className={cn(selectClass, 'mt-2')}
            value={cameraDeviceId ?? ''}
            disabled={permission !== 'granted'}
            onChange={(event) => handleCameraChange(event.target.value)}
          >
            {devices.camera.map((device) => (
              <option key={device.id} value={device.id}>{device.label}</option>
            ))}
          </select>
          <div className="invisible mt-3" aria-hidden="true">
            <MasterVolumeSlider
              icon={<Camera className="size-4" aria-hidden="true" />}
              gain={0}
              level={0}
              onChange={() => {}}
              label=""
            />
          </div>
          <p className="invisible mt-2 text-caption" aria-hidden="true">placeholder</p>
        </div>

        <div>
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="speaker-select" className="flex items-center gap-2 text-body-2 font-medium text-text-primary">
              <Volume2 className="size-4" aria-hidden="true" />
              스피커 설정
            </label>
            <Button
              type="button"
              variant="secondary"
              className="shrink-0 px-3 py-1.5 text-caption"
              disabled={permission !== 'granted'}
              onClick={() => void soundTest.play()}
            >
              {soundTest.isPlaying ? '재생 중' : '테스트'}
            </Button>
          </div>
          <select
            id="speaker-select"
            className={cn(selectClass, 'mt-2')}
            value={speakerDeviceId ?? ''}
            disabled={permission !== 'granted'}
            onChange={(event) => onChangeSpeaker(event.target.value)}
          >
            {devices.speaker.map((device) => (
              <option key={device.id} value={device.id}>{device.label}</option>
            ))}
          </select>
          <div className="mt-3">
            <MasterVolumeSlider
              icon={<Volume2 className="size-4" aria-hidden="true" />}
              gain={speakerVolume}
              level={soundTest.isPlaying ? soundTest.level : 0}
              onChange={onChangeSpeakerVolume}
              label="스피커 볼륨"
            />
          </div>
          <p className="invisible mt-2 text-caption" aria-hidden="true">placeholder</p>
        </div>

        <div>
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="mic-select" className="flex items-center gap-2 text-body-2 font-medium text-text-primary">
              <Mic className="size-4" aria-hidden="true" />
              마이크 설정
            </label>
            <Button
              type="button"
              variant="secondary"
              tabIndex={-1}
              aria-hidden="true"
              className="invisible shrink-0 px-3 py-1.5 text-caption"
            >
              테스트
            </Button>
          </div>
          <select
            id="mic-select"
            className={cn(selectClass, 'mt-2')}
            value={micDeviceId ?? ''}
            disabled={permission !== 'granted'}
            onChange={(event) => handleMicChange(event.target.value)}
          >
            {devices.mic.map((device) => (
              <option key={device.id} value={device.id}>{device.label}</option>
            ))}
          </select>
          <div className="mt-3">
            <MasterVolumeSlider
              icon={<Mic className="size-4" aria-hidden="true" />}
              gain={micGain}
              level={micLevel}
              onChange={onChangeMicGain}
              label="마이크 게인"
            />
          </div>
          <p className="mt-2 text-caption text-text-secondary">소리를 내보면 막대가 실시간으로 채워져요.</p>
        </div>
      </div>
    </section>
  )
}
