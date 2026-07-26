import { useNavigate } from 'react-router-dom'
import {
  StudySessionPrejoin,
  type StudySessionPrejoinSelection,
} from '@/components/study/StudySessionPrejoin'
import { PageLayout } from '@/components/layout/PageLayout'
import { mockPrejoinSessionTitle } from '@/mocks/study'

// 스터디 라운지 → 내 스터디 그룹 → 세션 생성/참가에서 진입하는 입장 전 대기 화면.
// TODO: 실제 API 연동 필요 — 상위 페이지(스터디 라운지/내 스터디 그룹)가 구현되면
// location.state로 실제 세션 정보를 전달받아 mockPrejoinSessionTitle을 대체한다.
export function StudySessionPrejoinPage() {
  const navigate = useNavigate()

  const handleBack = () => {
    navigate(-1)
  }

  const handleJoin = (selection: StudySessionPrejoinSelection) => {
    // TODO: 실제 세션 연결(WebRTC/LiveKit) 구현 필요 — 지금은 선택한 장치·자소서 정보를 화상 회의방 UI로 전달만 한다.
    navigate('/study/session/room', {
      state: {
        devices: {
          cameraDeviceId: selection.cameraDeviceId,
          micDeviceId: selection.micDeviceId,
          speakerDeviceId: selection.speakerDeviceId,
          micGain: selection.micGain,
          speakerVolume: selection.speakerVolume,
        },
        coverLetterId: selection.coverLetterId,
      },
    })
  }

  return (
    <PageLayout contentClassName="max-w-content">
      <div className="pt-10">
        <p className="text-body-2 text-text-secondary">입장 전 확인</p>
        <h1 className="mt-1 text-h1 text-text-primary">{mockPrejoinSessionTitle}</h1>
      </div>

      <div className="pb-10">
        <StudySessionPrejoin onBack={handleBack} onJoin={handleJoin} />
      </div>
    </PageLayout>
  )
}
