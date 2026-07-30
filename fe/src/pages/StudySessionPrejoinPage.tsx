import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  StudySessionPrejoin,
  type StudySessionPrejoinSelection,
} from '@/components/study/StudySessionPrejoin'
import { PageLayout } from '@/components/layout/PageLayout'
import {
  createStudySession,
  createStudySessionConnection,
  getStudyGroupActiveSession,
  joinStudySessionParticipant,
} from '@/api/study-sessions'
import { getMyResume } from '@/api/resume'
import { toErrorMessage } from '@/api/http'
import { mockPrejoinSessionTitle } from '@/mocks/study'

// 진행 중인 세션이 있으면 그 세션에 합류하고, 없을 때만 새로 만든다.
// 생성은 그룹장만 가능하고 활성 세션이 있으면 서버가 거절하므로, 조회를 먼저 둬야 그룹원 참여와 그룹장 재입장이 모두 가능하다.
async function resolveSessionId(groupId: number) {
  const activeSession = await getStudyGroupActiveSession(groupId)
  if (activeSession.hasActiveSession && activeSession.sessionId !== null) {
    return activeSession.sessionId
  }
  return (await createStudySession(groupId)).sessionId
}

// 스터디 라운지 → 내 스터디 그룹 → 세션 생성/참가에서 진입하는 입장 전 대기 화면.
// TODO: 실제 API 연동 필요 — 상위 페이지(스터디 라운지/내 스터디 그룹)가 구현되면
// location.state로 실제 세션 정보를 전달받아 mockPrejoinSessionTitle을 대체한다.
export function StudySessionPrejoinPage() {
  const navigate = useNavigate()
  const { groupId } = useParams<{ groupId: string }>()

  const [connecting, setConnecting] = useState(false)
  const [connectError, setConnectError] = useState<string | null>(null)
  // 생성까지만 성공하고 참가/접속에서 실패했을 때, 재시도 시 세션을 중복 생성하지 않기 위해 기억해둔다.
  const [sessionId, setSessionId] = useState<number | null>(null)

  const handleBack = () => {
    navigate(-1)
  }

  const handleJoin = async (selection: StudySessionPrejoinSelection) => {
    const parsedGroupId = Number(groupId)
    if (!Number.isInteger(parsedGroupId) || parsedGroupId <= 0) {
      setConnectError('올바르지 않은 스터디입니다.')
      return
    }

    setConnectError(null)
    setConnecting(true)

    try {
      const currentSessionId = sessionId ?? (await resolveSessionId(parsedGroupId))
      setSessionId(currentSessionId)

      // 이력서는 자소서와 달리 유저당 1개만 존재해 선택 UI 없이 본인 이력서를 그대로 사용한다.
      const { resumeId } = await getMyResume()

      await joinStudySessionParticipant(currentSessionId, {
        resumeId,
        coverLetterId: selection.coverLetterId,
      })
      const connection = await createStudySessionConnection(currentSessionId)

      navigate(`/study/session/${currentSessionId}/room`, {
        state: {
          devices: {
            cameraDeviceId: selection.cameraDeviceId,
            micDeviceId: selection.micDeviceId,
            speakerDeviceId: selection.speakerDeviceId,
            micGain: selection.micGain,
            speakerVolume: selection.speakerVolume,
          },
          coverLetterId: selection.coverLetterId,
          connection,
        },
      })
    } catch (error) {
      setConnectError(toErrorMessage(error))
    } finally {
      setConnecting(false)
    }
  }

  return (
    <PageLayout contentClassName="max-w-content">
      <div className="pt-10">
        <p className="text-body-2 text-text-secondary">입장 전 확인</p>
        <h1 className="mt-1 text-h1 text-text-primary">{mockPrejoinSessionTitle}</h1>
      </div>

      <div className="pb-10">
        <StudySessionPrejoin
          onBack={handleBack}
          onJoin={handleJoin}
          connecting={connecting}
          connectError={connectError}
        />
      </div>
    </PageLayout>
  )
}
