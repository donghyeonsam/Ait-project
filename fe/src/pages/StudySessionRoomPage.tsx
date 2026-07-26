import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import {
  StudySessionRoom,
  type StudySessionRoomDeviceSelection,
} from '@/components/study/StudySessionRoom'

interface StudySessionRoomNavigationState {
  devices: StudySessionRoomDeviceSelection
  coverLetterId: number | null
}

function isStudySessionRoomNavigationState(
  value: unknown,
): value is StudySessionRoomNavigationState {
  return (
    Boolean(value) &&
    typeof value === 'object' &&
    'devices' in (value as Record<string, unknown>)
  )
}

// 입장 전 대기 화면에서 넘어온 장치 선택 정보로 화상 회의방을 렌더링한다.
// TODO: 실제 API 연동 필요 — 스터디 라운지/내 스터디 그룹이 구현되면 세션 정보도 location.state로 함께 전달받는다.
export function StudySessionRoomPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const navState = location.state as unknown

  if (!isStudySessionRoomNavigationState(navState)) {
    return <Navigate to="/study/session/prejoin" replace />
  }

  const handleLeave = () => {
    // TODO: 실제 세션 퇴장 처리(WebRTC/LiveKit 연결 종료) 구현 필요
    navigate('/study')
  }

  return (
    <div className="h-svh w-svw overflow-hidden bg-background">
      <StudySessionRoom
        initialDevices={navState.devices}
        selfCoverLetterId={navState.coverLetterId}
        onLeave={handleLeave}
      />
    </div>
  )
}
