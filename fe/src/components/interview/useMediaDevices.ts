import { useCallback, useEffect, useRef, useState } from 'react'

export interface DeviceOption {
  id: string
  label: string
}

export type MediaPermissionState = 'idle' | 'pending' | 'granted' | 'denied' | 'unsupported'

interface DeviceLists {
  camera: DeviceOption[]
  mic: DeviceOption[]
  speaker: DeviceOption[]
}

const emptyDevices: DeviceLists = { camera: [], mic: [], speaker: [] }

export function toDeviceOptions(devices: MediaDeviceInfo[], kind: MediaDeviceKind, fallbackLabel: string): DeviceOption[] {
  return devices
    .filter((device) => device.kind === kind)
    .map((device, index) => ({
      id: device.deviceId,
      label: device.label || `${fallbackLabel} ${index + 1}`,
    }))
}

// 카메라·마이크 권한 요청과 스트림·장치 목록을 관리하는 훅. 권한 상태를 5단계로 노출한다.
export function useMediaDevices() {
  const [permission, setPermission] = useState<MediaPermissionState>('idle')
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [devices, setDevices] = useState<DeviceLists>(emptyDevices)
  const streamRef = useRef<MediaStream | null>(null)

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setStream(null)
  }, [])

  const refreshDeviceList = useCallback(async () => {
    const list = await navigator.mediaDevices.enumerateDevices()
    setDevices({
      camera: toDeviceOptions(list, 'videoinput', '카메라'),
      mic: toDeviceOptions(list, 'audioinput', '마이크'),
      speaker: toDeviceOptions(list, 'audiooutput', '스피커'),
    })
  }, [])

  const requestAccess = useCallback(
    async (cameraDeviceId?: string, micDeviceId?: string) => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setPermission('unsupported')
        return
      }

      setPermission('pending')
      try {
        const nextStream = await navigator.mediaDevices.getUserMedia({
          video: cameraDeviceId ? { deviceId: { exact: cameraDeviceId } } : true,
          audio: micDeviceId ? { deviceId: { exact: micDeviceId } } : true,
        })
        // 새 스트림을 켜기 전에 기존 트랙을 멈춰 장치 점유가 남지 않게 한다.
        streamRef.current?.getTracks().forEach((track) => track.stop())
        streamRef.current = nextStream
        setStream(nextStream)
        setPermission('granted')
        await refreshDeviceList()
      } catch {
        setPermission('denied')
      }
    },
    [refreshDeviceList],
  )

  useEffect(() => stopStream, [stopStream])

  return { permission, stream, devices, requestAccess }
}
