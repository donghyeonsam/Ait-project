import { useEffect, useRef, useState } from 'react'
import { Camera, FileText, Image, Mic, RotateCcw, Video, Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MasterVolumeSlider } from '@/components/interview/MasterVolumeSlider'
import { useAudioLevel } from '@/components/interview/useAudioLevel'
import { useMediaDevices } from '@/components/interview/useMediaDevices'
import { useSoundTest } from '@/components/interview/useSoundTest'
import { mockPrejoinCoverLetters } from '@/mocks/study'
import { cn } from '@/lib/utils'

export interface StudySessionPrejoinSelection {
  cameraDeviceId: string | null
  micDeviceId: string | null
  speakerDeviceId: string | null
  micGain: number
  speakerVolume: number
  coverLetterId: number | null
}

interface StudySessionPrejoinProps {
  onBack: () => void
  onJoin: (selection: StudySessionPrejoinSelection) => void
  /** 접속 정보(LiveKit 토큰) 발급 중일 때 참여 버튼을 잠근다. */
  connecting?: boolean
  /** 접속 정보 발급 실패 시 표시할 에러 메시지. */
  connectError?: string | null
}

const selectClass =
  'w-full rounded-ait-s border border-border-default bg-surface-default px-3 py-2 text-body-2 text-text-primary focus:border-action-primary focus:outline-none focus:ring-3 focus:ring-action-primary/25 disabled:cursor-not-allowed disabled:bg-status-neutral-surface disabled:text-text-secondary'

const actionButtonClass = 'shrink-0 px-3 py-1.5 text-caption'

// 세션 입장 전 카메라·마이크·스피커·자소서를 확인하고 선택하는 대기 화면 패널.
export function StudySessionPrejoin({
  onBack,
  onJoin,
  connecting = false,
  connectError = null,
}: StudySessionPrejoinProps) {
  const { permission, stream, devices, requestAccess } = useMediaDevices()
  const videoRef = useRef<HTMLVideoElement>(null)

  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null)
  const [selectedMicId, setSelectedMicId] = useState<string | null>(null)
  const [selectedSpeakerId, setSelectedSpeakerId] = useState<string | null>(null)
  const [micGain, setMicGain] = useState(60)
  const [speakerVolume, setSpeakerVolume] = useState(60)
  const [selectedCoverLetterId, setSelectedCoverLetterId] = useState<number | null>(null)

  // 사용자가 아직 고르지 않았다면 방금 채워진 장치 목록의 첫 항목을 기본값으로 삼는다.
  const cameraDeviceId = selectedCameraId ?? devices.camera[0]?.id ?? null
  const micDeviceId = selectedMicId ?? devices.mic[0]?.id ?? null
  const speakerDeviceId = selectedSpeakerId ?? devices.speaker[0]?.id ?? null
  const coverLetterId = selectedCoverLetterId ?? mockPrejoinCoverLetters[0]?.coverLetterId ?? null

  const micLevel = useAudioLevel(stream, micGain)
  const soundTest = useSoundTest(speakerDeviceId, speakerVolume)

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

  const handleCameraChange = (id: string) => {
    setSelectedCameraId(id)
    void requestAccess(id, micDeviceId ?? undefined)
  }

  const handleMicChange = (id: string) => {
    setSelectedMicId(id)
    void requestAccess(cameraDeviceId ?? undefined, id)
  }

  const isReady = permission === 'granted' && coverLetterId !== null && !connecting
  const disabledHint =
    permission !== 'granted'
      ? '카메라와 마이크 권한을 허용해야 참여할 수 있어요.'
      : coverLetterId === null
        ? '보여줄 자소서를 선택해 주세요.'
        : connectError

  const handleJoin = () => {
    if (!isReady) return
    onJoin({
      cameraDeviceId,
      micDeviceId,
      speakerDeviceId,
      micGain,
      speakerVolume,
      coverLetterId,
    })
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-center">
      <div
        className="flex aspect-video w-full flex-col items-center justify-center gap-4 overflow-hidden rounded-ait-m border border-border-default bg-status-neutral-surface text-text-secondary"
        aria-label="카메라 미리보기"
      >
        {permission === 'granted' ? (
          devices.camera.length > 0 ? (
            <video ref={videoRef} autoPlay playsInline muted className="size-full object-cover" />
          ) : (
            <div className="flex flex-col items-center gap-4 px-6 text-center">
              <Video className="size-14" aria-hidden="true" />
              <p className="text-body-1">카메라를 찾을 수 없습니다. 장치 연결을 확인해 주세요.</p>
            </div>
          )
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
            <p className="text-body-1">스터디 참여를 위해 카메라와 마이크 접근 권한이 필요해요.</p>
            <Button type="button" onClick={() => requestAccess()}>
              카메라·마이크 허용하기
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-6">
        <div>
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="prejoin-camera-select" className="flex items-center gap-2 text-body-2 font-medium text-text-primary">
              <Camera className="size-4" aria-hidden="true" />
              카메라 설정
            </label>
            <Button
              type="button"
              variant="text"
              className={actionButtonClass}
              // TODO: 배경 설정 기능 구현 필요(가상 배경 적용)
              onClick={() => {}}
            >
              <Image className="size-4" aria-hidden="true" />
              배경 설정
            </Button>
          </div>
          <select
            id="prejoin-camera-select"
            className={cn(selectClass, 'mt-2')}
            value={cameraDeviceId ?? ''}
            disabled={permission !== 'granted' || devices.camera.length === 0}
            onChange={(event) => handleCameraChange(event.target.value)}
          >
            {devices.camera.length === 0 ? (
              <option value="">사용 가능한 카메라가 없습니다</option>
            ) : (
              devices.camera.map((device) => (
                <option key={device.id} value={device.id}>{device.label}</option>
              ))
            )}
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="prejoin-speaker-select" className="flex items-center gap-2 text-body-2 font-medium text-text-primary">
              <Volume2 className="size-4" aria-hidden="true" />
              스피커 설정
            </label>
            <Button
              type="button"
              variant="secondary"
              className={actionButtonClass}
              disabled={permission !== 'granted'}
              onClick={() => void soundTest.play()}
            >
              {soundTest.isPlaying ? '재생 중' : '사운드 테스트'}
            </Button>
          </div>
          <select
            id="prejoin-speaker-select"
            className={cn(selectClass, 'mt-2')}
            value={speakerDeviceId ?? ''}
            disabled={permission !== 'granted' || devices.speaker.length === 0}
            onChange={(event) => setSelectedSpeakerId(event.target.value)}
          >
            {devices.speaker.length === 0 ? (
              <option value="">사용 가능한 스피커가 없습니다</option>
            ) : (
              devices.speaker.map((device) => (
                <option key={device.id} value={device.id}>{device.label}</option>
              ))
            )}
          </select>
          <div className="mt-3">
            <MasterVolumeSlider
              icon={<Volume2 className="size-4" aria-hidden="true" />}
              gain={speakerVolume}
              level={soundTest.isPlaying ? soundTest.level : 0}
              onChange={setSpeakerVolume}
              label="스피커 볼륨"
            />
          </div>
        </div>

        <div>
          <label htmlFor="prejoin-mic-select" className="flex items-center gap-2 text-body-2 font-medium text-text-primary">
            <Mic className="size-4" aria-hidden="true" />
            마이크 설정
          </label>
          <select
            id="prejoin-mic-select"
            className={cn(selectClass, 'mt-2')}
            value={micDeviceId ?? ''}
            disabled={permission !== 'granted' || devices.mic.length === 0}
            onChange={(event) => handleMicChange(event.target.value)}
          >
            {devices.mic.length === 0 ? (
              <option value="">사용 가능한 마이크가 없습니다</option>
            ) : (
              devices.mic.map((device) => (
                <option key={device.id} value={device.id}>{device.label}</option>
              ))
            )}
          </select>
          <div className="mt-3">
            <MasterVolumeSlider
              icon={<Mic className="size-4" aria-hidden="true" />}
              gain={micGain}
              level={micLevel}
              onChange={setMicGain}
              label="마이크 게인"
            />
          </div>
        </div>

        <div>
          <label htmlFor="prejoin-cover-letter-select" className="flex items-center gap-2 text-body-2 font-medium text-text-primary">
            <FileText className="size-4" aria-hidden="true" />
            자소서
          </label>
          <select
            id="prejoin-cover-letter-select"
            className={cn(selectClass, 'mt-2')}
            value={coverLetterId ?? ''}
            disabled={mockPrejoinCoverLetters.length === 0}
            onChange={(event) => setSelectedCoverLetterId(Number(event.target.value))}
          >
            {mockPrejoinCoverLetters.length === 0 ? (
              <option value="">등록된 자소서가 없습니다</option>
            ) : (
              mockPrejoinCoverLetters.map((coverLetter) => (
                <option key={coverLetter.coverLetterId} value={coverLetter.coverLetterId}>
                  {coverLetter.title}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      <div className="col-span-full flex flex-col gap-3 border-t border-border-default pt-6 sm:flex-row sm:items-center">
        <Button type="button" variant="secondary" onClick={onBack}>
          뒤로
        </Button>
        <div className="flex flex-1 flex-col items-end gap-2">
          {disabledHint ? (
            <p id="prejoin-join-hint" className="text-caption text-status-error">
              {disabledHint}
            </p>
          ) : null}
          <Button
            type="button"
            className="w-full"
            disabled={!isReady}
            aria-describedby={disabledHint ? 'prejoin-join-hint' : undefined}
            onClick={handleJoin}
          >
            {connecting ? '접속 정보 발급 중...' : '지금 참여하기'}
          </Button>
        </div>
      </div>
    </div>
  )
}
