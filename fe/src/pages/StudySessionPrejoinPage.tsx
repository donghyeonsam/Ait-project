import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  StudySessionPrejoin,
  type StudySessionPrejoinSelection,
} from '@/components/study/StudySessionPrejoin'
import { PageLayout } from '@/components/layout/PageLayout'
import {
  createStudySession,
  createStudySessionConnection,
} from '@/api/study-sessions'
import { getStudyGroupDetail } from '@/api/study-groups'
import { toErrorMessage } from '@/api/http'

// 스터디 라운지 → 내 스터디 그룹 → 세션 생성/참가에서 진입하는 입장 전 대기 화면.
export function StudySessionPrejoinPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { groupId } = useParams<{ groupId: string }>()
  const locationState = location.state as { groupTitle?: unknown } | null
  const initialGroupTitle =
    typeof locationState?.groupTitle === 'string'
      ? locationState.groupTitle
      : null

  const [groupTitle, setGroupTitle] = useState(
    initialGroupTitle ?? '스터디 세션',
  )
  const [connecting, setConnecting] = useState(false)
  const [connectError, setConnectError] = useState<string | null>(null)
  // 생성까지만 성공하고 참가/접속에서 실패했을 때, 재시도 시 세션을 중복 생성하지 않기 위해 기억해둔다.
  const [sessionId, setSessionId] = useState<number | null>(null)

  useEffect(() => {
    if (initialGroupTitle) return
    const parsedGroupId = Number(groupId)
    if (!Number.isInteger(parsedGroupId) || parsedGroupId <= 0) return

    let active = true
    void getStudyGroupDetail(parsedGroupId)
      .then((detail) => {
        if (active) setGroupTitle(detail.title)
      })
      .catch(() => {})

    return () => {
      active = false
    }
  }, [groupId, initialGroupTitle])

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
      const currentSessionId =
        sessionId ?? (await createStudySession(parsedGroupId)).sessionId
      setSessionId(currentSessionId)

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
        <h1 className="mt-1 text-h1 text-text-primary">{groupTitle}</h1>
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
