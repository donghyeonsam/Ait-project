import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import {
  StudySessionRoom,
  type StudySessionRoomDeviceSelection,
} from '@/components/study/StudySessionRoom'
import type { StudySessionConnection } from '@/api/study-sessions'

interface StudySessionRoomNavigationState {
  devices: StudySessionRoomDeviceSelection
  coverLetterId: number | null
  connection: StudySessionConnection
}

function isStudySessionRoomNavigationState(
  value: unknown,
): value is StudySessionRoomNavigationState {
  return (
    Boolean(value) &&
    typeof value === 'object' &&
    'devices' in (value as Record<string, unknown>) &&
    'connection' in (value as Record<string, unknown>)
  )
}

// 입장 전 대기 화면에서 넘어온 장치 선택·LiveKit 접속 정보로 화상 회의방을 렌더링한다.
// TODO: 실제 API 연동 필요 — 스터디 라운지/내 스터디 그룹이 구현되면 세션 정보도 location.state로 함께 전달받는다.
export function StudySessionRoomPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const navState = location.state as unknown

  if (!isStudySessionRoomNavigationState(navState)) {
    return <Navigate to="/study" replace />
  }

  const handleLeave = () => {
    // 방금 나온 세션은 다른 참가자들의 평가가 아직 덜 모였을 수 있어, 스터디 기록 화면에
    // "평가 수집중" 상태로 먼저 보여주기 위해 sessionId·groupId를 함께 넘긴다.
    navigate('/dashboard/study', {
      state: {
        justLeftSessionId: navState.connection.sessionId,
        justLeftGroupId: navState.connection.groupId,
      },
    })
  }

  return (
    <div className="h-svh w-svw overflow-hidden bg-background">
      <StudySessionRoom
        initialDevices={navState.devices}
        selfCoverLetterId={navState.coverLetterId}
        connection={navState.connection}
        onLeave={handleLeave}
      />
    </div>
  )
}
