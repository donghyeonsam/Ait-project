import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from 'react'
import {
  RoomAudioRenderer,
  RoomContext,
  VideoTrack,
  isTrackReference,
  useDataChannel,
  useLocalParticipant,
  useRemoteParticipants,
  useRoomContext,
  useSpeakingParticipants,
  useTracks,
} from '@livekit/components-react'
import {
  ConnectionError,
  ConnectionErrorReason,
  DisconnectReason,
  Room,
  RoomEvent,
  Track,
} from 'livekit-client'
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Loader2,
  Mic,
  MicOff,
  Phone,
  ScreenShare,
  Settings,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react'
import { FloatingChatButton } from '@/components/study/FloatingChatButton'
import { HoverVolumeButton } from '@/components/study/HoverVolumeButton'
import { ParticipantTile } from '@/components/study/ParticipantTile'
import { ScreenShareTile } from '@/components/study/ScreenShareTile'
import {
  StudySessionSidePanel,
  type StudySessionEvaluationProgress,
} from '@/components/study/StudySessionSidePanel'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Dropdown } from '@/components/ui/dropdown'
import { toDeviceOptions, type DeviceOption } from '@/components/interview/useMediaDevices'
import type { StudyParticipant } from '@/mocks/study'
import { getMyCoverLetters, type CoverLetterListItem } from '@/api/cover-letters'
import {
  createStudySessionConnection,
  endStudySession,
  getStudySessionMembers,
  kickStudySessionParticipant,
  type StudySessionConnection,
  type StudySessionMember,
} from '@/api/study-sessions'
import { toErrorMessage } from '@/api/http'
import { cn } from '@/lib/utils'

export interface StudySessionRoomDeviceSelection {
  cameraDeviceId: string | null
  micDeviceId: string | null
  speakerDeviceId: string | null
  micGain: number
  speakerVolume: number
}

interface StudySessionRoomProps {
  initialDevices: StudySessionRoomDeviceSelection
  /** 입장 전 화면에서 고른 자소서. 내 타일의 자소서 요약에 반영해 두 화면을 매끄럽게 잇는다. */
  selfCoverLetterId: number | null
  /** Prejoin에서 발급받은 LiveKit 접속 정보. */
  connection: StudySessionConnection
  onLeave: () => void
}

type StageMode = { type: 'grid' } | { type: 'participants'; ids: number[] } | { type: 'screen'; sid: string }

interface ContextMenuState {
  participantId: number
  x: number
  y: number
}

// 웹캠 원본이 대체로 16:9라 이 비율을 쓰면 크롭·레터박스 없이 카메라 화면이 꽉 찬다.
const CAMERA_ASPECT = 16 / 9
const GRID_GAP = 12
// LiveKit이 자동 재접속을 이 시간 넘게 시도해도 성공하지 못하면, 자동 재시도만 무한정 믿지 않고
// 사용자에게 수동 재시도·나가기 선택지를 준다.
const RECONNECT_GIVE_UP_MS = 15000
const CONNECTION_TROUBLE_MESSAGE = '연결이 끊어졌습니다. 네트워크 상태를 확인한 뒤 다시 시도해 주세요.'
/** 한 번에 확대해 볼 수 있는 참가자 수. */
const MAX_STAGE_PARTICIPANTS = 4
/** 우측 패널 펼침 폭. 패널 토글 시 그리드 폭 변화를 미리 계산하는 데도 쓴다. */
const PANEL_WIDTH = 320
// 패널 폭 전환(--duration-base)과 같은 값. 전환이 끝날 때까지 실측 리사이즈 대신 예측값을 쓴다.
const PANEL_TRANSITION_MS = 250
// 참가자별 상호평가 진행 여부를 서로 알리는 데이터 채널 토픽. 채팅과 같은 Room 데이터 채널을 공유하되
// 이 토픽으로만 필터링해 받는다.
const EVALUATION_PROGRESS_TOPIC = 'peer-eval-progress'

// 네이티브 select는 옵션 목록이 브라우저가 그리는 팝업이라 다크 패널과 무관하게 흰 배경으로 렌더링된다.
// 공용 Dropdown(커스텀 listbox)을 쓰면 목록도 우리 스타일로 그려지므로, 장치설정바(bg-theater-backdrop)에
// 맞춰 밝은 배경의 버튼 부분만 덮어쓴다.
const deviceDropdownButtonClass = 'border-white/20 bg-white/10 text-white hover:border-white/40'

interface ElementSize {
  width: number
  height: number
}

// 컨테이너 크기를 관찰해 그리드/스테이지 타일 크기 계산에 쓴다.
// 그리드·스테이지 컨테이너는 뷰 전환에 따라 마운트/언마운트되므로, 일반 useRef 대신
// 콜백 ref로 노드가 실제로 붙는 시점마다 옵저버를 다시 건다.
//
// 패널이 열리고 닫힐 때 폭이 CSS 트랜지션으로 서서히 바뀌는데, 그동안 ResizeObserver가
// 프레임마다 중간값을 흘려보내면 참가자 수가 많을 때 열 수가 여러 번 재계산되며 잠깐
// 타일이 쌓였다 정렬되는 것처럼 보인다. predictWidthChange로 전환 후의 최종 폭을 미리
// 한 번만 계산해 반영하고, 전환이 끝날 때까지는 실측값 대신 이 예측값을 쓴다.
function useElementSize<T extends HTMLElement>(
  overrideMs: number,
): [(node: T | null) => void, ElementSize | null, (deltaWidth: number) => void] {
  const [node, setNode] = useState<T | null>(null)
  const [size, setSize] = useState<ElementSize | null>(null)
  const [override, setOverride] = useState<ElementSize | null>(null)
  const sizeRef = useRef(size)
  useEffect(() => {
    sizeRef.current = size
  }, [size])

  useEffect(() => {
    if (!node) return
    const update = () => setSize({ width: node.clientWidth, height: node.clientHeight })
    update()
    const observer = new ResizeObserver(update)
    observer.observe(node)
    return () => observer.disconnect()
  }, [node])

  useEffect(() => {
    if (!override) return
    const timer = window.setTimeout(() => setOverride(null), overrideMs)
    return () => window.clearTimeout(timer)
  }, [override, overrideMs])

  const predictWidthChange = useCallback((deltaWidth: number) => {
    setOverride((prev) => {
      const base = prev ?? sizeRef.current
      if (!base) return prev
      return { width: Math.max(base.width + deltaWidth, 0), height: base.height }
    })
  }, [])

  return [setNode, override ?? size, predictWidthChange]
}

/** 셀 하나에 4:3 비율을 유지한 채 들어갈 수 있는 최대 크기(레터박스 없이 꽉 채우는 크기)를 구한다. */
function fitAspect(width: number, height: number, aspect: number): ElementSize {
  let fittedWidth = width
  let fittedHeight = fittedWidth / aspect
  if (fittedHeight > height) {
    fittedHeight = height
    fittedWidth = fittedHeight * aspect
  }
  return { width: Math.max(fittedWidth, 0), height: Math.max(fittedHeight, 0) }
}

/** 참가자 수만큼 4:3 타일을 배치할 때, 레터박스 여백이 가장 적게 남는 열 수와 타일 크기를 찾는다. */
function computeGridTileSize(count: number, width: number, height: number, gap: number): ElementSize & { cols: number } {
  if (count <= 0 || width <= 0 || height <= 0) {
    return { cols: 1, width: 0, height: 0 }
  }

  let best = { cols: 1, width: 0, height: 0 }
  for (let cols = 1; cols <= count; cols += 1) {
    const rows = Math.ceil(count / cols)
    const cellWidth = (width - gap * (cols - 1)) / cols
    const cellHeight = (height - gap * (rows - 1)) / rows
    if (cellWidth <= 0 || cellHeight <= 0) continue

    const fitted = fitAspect(cellWidth, cellHeight, CAMERA_ASPECT)
    if (fitted.width * fitted.height > best.width * best.height) {
      best = { cols, width: fitted.width, height: fitted.height }
    }
  }
  return best
}

// LiveKitTokenService.createParticipantIdentity(userId)가 만드는 "user-{userId}" 형식과 짝을 이룬다.
function parseUserIdFromIdentity(identity: string): number | null {
  const match = /^user-(\d+)$/.exec(identity)
  return match ? Number(match[1]) : null
}

// 스터디 세션 화상 회의방: 참가자 그리드/스테이지 뷰, 컨트롤 바, 이력서·자소서·평가 패널을 구성한다.
// LiveKit Room 연결/트랙 구독은 이 컴포넌트가 소유하고, 하위 트리에는 RoomContext로 내려준다.
// 채팅은 같은 Room의 데이터 채널(useChat)로 실연동되어 있다(FloatingChatButton 참고).
export function StudySessionRoom({
  initialDevices,
  selfCoverLetterId,
  connection,
  onLeave,
}: StudySessionRoomProps) {
  const [room, setRoom] = useState(() => new Room())
  // 최초 접속 정보로 시작하되, 재접속에 실패해 새 토큰을 발급받으면 이 값을 갱신해 재연결한다.
  const [activeConnection, setActiveConnection] = useState(connection)
  // LiveKit이 알아서 재접속을 시도하는 동안(짧게 끊겼다 이어지는 경우) 보여줄 배너 상태.
  const [reconnecting, setReconnecting] = useState(false)
  // 자동 재접속을 포기했거나(RECONNECT_GIVE_UP_MS 초과) 최초 접속 자체가 실패했을 때, 사용자가
  // 직접 재시도·나가기를 고르게 하는 다이얼로그에 띄울 메시지. null이면 다이얼로그를 닫는다.
  const [connectionIssue, setConnectionIssue] = useState<string | null>(null)
  const [retrying, setRetrying] = useState(false)

  useEffect(() => {
    // 매 이펙트 실행마다 새 Room을 만든다. React StrictMode의 개발 모드 이중 실행(mount→cleanup→mount)에서
    // 첫 시도가 connect 도중 취소되면 그 Room의 내부 엔진(RTCEngine)이 손상된 상태로 남는데,
    // 같은 인스턴스로 재연결을 시도하면 "PC manager is closed" 오류가 난다. 취소된 Room은 버리고
    // 재시도 때마다 새 인스턴스로 연결해야 안전하다. activeConnection이 갱신되면(수동 재시도) 이
    // 이펙트가 다시 돌며 같은 방식으로 새 Room을 만들어 재연결한다.
    const activeRoom = new Room()
    let cancelled = false
    let giveUpTimer: number | null = null

    const clearGiveUpTimer = () => {
      if (giveUpTimer !== null) {
        window.clearTimeout(giveUpTimer)
        giveUpTimer = null
      }
    }

    // LiveKit이 연결 끊김을 감지하고 자체적으로 재접속을 시도하는 동안 발생한다. 짧게 끊겼다 바로
    // 이어지면(Reconnected) 사용자가 느끼지 못하지만, RECONNECT_GIVE_UP_MS를 넘기면 자동 재시도만
    // 계속 믿지 않고 수동 재시도 다이얼로그로 전환한다.
    const handleReconnecting = () => {
      if (cancelled) return
      setReconnecting(true)
      clearGiveUpTimer()
      giveUpTimer = window.setTimeout(() => {
        if (cancelled) return
        setReconnecting(false)
        setConnectionIssue(CONNECTION_TROUBLE_MESSAGE)
      }, RECONNECT_GIVE_UP_MS)
    }

    const handleReconnected = () => {
      if (cancelled) return
      clearGiveUpTimer()
      setReconnecting(false)
      setConnectionIssue(null)
    }

    // 강퇴되거나 방장이 세션을 종료하면 서버가 이 클라이언트를 강제로 끊는다. 자발적으로 나갈 때는
    // cleanup에서 cancelled를 먼저 true로 만든 뒤 disconnect를 호출하므로 여기서 걸러진다.
    //
    // DisconnectReason에는 그 외에도 여러 사유가 있는데, 특히 개발 모드 StrictMode의 이중 mount로
    // 같은 identity의 연결이 두 개 생겼다가 뒤늦게 도착한 연결이 정리되며 지금 연결이
    // DUPLICATE_IDENTITY로 끊기는 경우가 있다. 이 경우까지 반응하면 아무 조작 없이도 몇 초 뒤
    // 튕기므로 무시한다. 그 외 사유(SIGNAL_CLOSE, CONNECTION_TIMEOUT 등 순수 연결 문제로 LiveKit이
    // 재접속을 포기한 경우)는 수동 재시도 다이얼로그로 안내한다.
    const handleDisconnected = (reason?: DisconnectReason) => {
      if (cancelled) return
      clearGiveUpTimer()
      setReconnecting(false)
      if (reason === DisconnectReason.PARTICIPANT_REMOVED || reason === DisconnectReason.ROOM_DELETED) {
        onLeave()
        return
      }
      if (reason === DisconnectReason.DUPLICATE_IDENTITY) return
      setConnectionIssue(CONNECTION_TROUBLE_MESSAGE)
    }

    activeRoom.on(RoomEvent.Reconnecting, handleReconnecting)
    activeRoom.on(RoomEvent.Reconnected, handleReconnected)
    activeRoom.on(RoomEvent.Disconnected, handleDisconnected)

    const connectToRoom = async () => {
      setRoom(activeRoom)
      try {
        await activeRoom.connect(activeConnection.serverUrl, activeConnection.participantToken)
        if (cancelled) return
        setConnectionIssue(null)

        await Promise.all([
          activeRoom.localParticipant.setCameraEnabled(
            true,
            initialDevices.cameraDeviceId ? { deviceId: initialDevices.cameraDeviceId } : undefined,
          ),
          activeRoom.localParticipant.setMicrophoneEnabled(
            true,
            initialDevices.micDeviceId ? { deviceId: initialDevices.micDeviceId } : undefined,
          ),
        ])
      } catch (error) {
        console.error('LiveKit 세션 연결 실패', error)
        if (cancelled) return
        // 토큰이 만료·무효화된 경우 LiveKit이 ConnectionErrorReason.NotAllowed로 구분해준다.
        // 순수 네트워크 문제와 구분해 다른 안내를 보여준다.
        const isPermissionError =
          error instanceof ConnectionError && error.reason === ConnectionErrorReason.NotAllowed
        setConnectionIssue(
          isPermissionError
            ? '이 세션에 참여할 권한이 없습니다. 다시 로그인하거나 관리자에게 문의해 주세요.'
            : '세션 연결에 실패했습니다. 네트워크 상태를 확인해 주세요.',
        )
      }
    }

    void connectToRoom()

    return () => {
      cancelled = true
      clearGiveUpTimer()
      activeRoom.off(RoomEvent.Reconnecting, handleReconnecting)
      activeRoom.off(RoomEvent.Reconnected, handleReconnected)
      activeRoom.off(RoomEvent.Disconnected, handleDisconnected)
      void activeRoom.disconnect()
    }
    // activeConnection이 바뀔 때만(최초 접속 또는 수동 재시도로 새 토큰을 받았을 때) 재연결한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConnection.serverUrl, activeConnection.participantToken])

  // 수동 재시도: 현재 토큰이 만료됐을 수 있으니 새 토큰을 발급받아 activeConnection을 갱신한다.
  // 그러면 위 이펙트가 새 Room으로 다시 연결을 시도한다.
  const handleManualRetry = async () => {
    setRetrying(true)
    try {
      const fresh = await createStudySessionConnection(activeConnection.sessionId)
      setConnectionIssue(null)
      setActiveConnection(fresh)
    } catch (error) {
      setConnectionIssue(toErrorMessage(error))
    } finally {
      setRetrying(false)
    }
  }

  return (
    <RoomContext.Provider value={room}>
      <RoomAudioRenderer />
      <StudySessionRoomStage
        initialDevices={initialDevices}
        selfCoverLetterId={selfCoverLetterId}
        connection={activeConnection}
        reconnecting={reconnecting}
        connectionIssue={connectionIssue}
        retrying={retrying}
        onManualRetry={handleManualRetry}
        onLeave={onLeave}
      />
    </RoomContext.Provider>
  )
}

interface StudySessionRoomStageProps {
  initialDevices: StudySessionRoomDeviceSelection
  selfCoverLetterId: number | null
  connection: StudySessionConnection
  reconnecting: boolean
  connectionIssue: string | null
  retrying: boolean
  onManualRetry: () => void
  onLeave: () => void
}

function StudySessionRoomStage({
  initialDevices,
  selfCoverLetterId,
  connection,
  reconnecting,
  connectionIssue,
  retrying,
  onManualRetry,
  onLeave,
}: StudySessionRoomStageProps) {
  const room = useRoomContext()
  const remoteParticipants = useRemoteParticipants()
  const { localParticipant, isCameraEnabled, isMicrophoneEnabled, isScreenShareEnabled } = useLocalParticipant()
  const cameraTracks = useTracks([Track.Source.Camera]).filter(isTrackReference)
  const micTracks = useTracks([Track.Source.Microphone]).filter(isTrackReference)
  const screenShareTracks = useTracks([Track.Source.ScreenShare]).filter(isTrackReference)

  const screenShareLabel = (trackRef: (typeof screenShareTracks)[number]) =>
    trackRef.participant.isLocal
      ? '내 화면'
      : `${trackRef.participant.name || trackRef.participant.identity}님의 화면`

  // LiveKit participant.identity(문자열)를 기존 코드 전반(order/lockedIds/stageMode 등)이 쓰는
  // number id로 바꿔주는 안정적인 매핑. 본인은 항상 0, 나머지는 처음 본 순서대로 1부터 채번한다.
  // ref로 렌더 중 직접 채번하지 않고, "렌더 중 상태를 조정"하는 React 공식 패턴으로 새 identity가
  // 보일 때만 다음 렌더 전에 매핑을 갱신한다.
  const [identityIdMap, setIdentityIdMap] = useState<Map<string, number>>(new Map())
  const [knownIdentities, setKnownIdentities] = useState<string[]>([])
  // 본인 카드에 선택한 자소서 제목을 보여주기 위해 서류함 목록을 조회한다. 실패해도 세션 진행은 막지 않는다.
  const [myCoverLetters, setMyCoverLetters] = useState<CoverLetterListItem[]>([])
  // 서버가 확인한 참가자 정보(닉네임·역할·제출 서류)를 userId로 찾을 수 있게 담아 둔다.
  const [membersByUserId, setMembersByUserId] = useState<
    Map<number, StudySessionMember>
  >(new Map())
  const currentIdentities = remoteParticipants.map((participant) => participant.identity)
  const identitiesChanged =
    currentIdentities.length !== knownIdentities.length ||
    currentIdentities.some((identity, index) => identity !== knownIdentities[index])

  if (identitiesChanged) {
    const nextMap = new Map(identityIdMap)
    let nextId = 1
    for (const id of nextMap.values()) nextId = Math.max(nextId, id + 1)
    for (const identity of currentIdentities) {
      if (!nextMap.has(identity)) {
        nextMap.set(identity, nextId)
        nextId += 1
      }
    }
    setIdentityIdMap(nextMap)
    setKnownIdentities(currentIdentities)
  }

  const resolveParticipantId = useCallback(
    (identity: string, isLocal: boolean) => (isLocal ? 0 : (identityIdMap.get(identity) ?? 0)),
    [identityIdMap],
  )

  useEffect(() => {
    let isActive = true

    getMyCoverLetters()
      .then((list) => {
        if (isActive) setMyCoverLetters(list.coverLetters)
      })
      .catch(() => {
        if (isActive) setMyCoverLetters([])
      })

    return () => {
      isActive = false
    }
  }, [])

  // 참가자가 드나들 때마다 서버 목록을 다시 맞춘다. identity 문자열을 이어 붙인 값이 바뀔 때만 조회한다.
  const remoteIdentityKey = currentIdentities.join(',')

  useEffect(() => {
    let isActive = true

    getStudySessionMembers(connection.sessionId)
      .then((members) => {
        if (!isActive) return
        setMembersByUserId(
          new Map(members.map((member) => [member.userId, member])),
        )
      })
      // 참가자 정보는 보조 표시라, 실패하면 LiveKit이 주는 값만으로 계속 진행한다.
      .catch(() => {})

    return () => {
      isActive = false
    }
  }, [connection.sessionId, remoteIdentityKey])

  const participants = useMemo<StudyParticipant[]>(() => {
    const selectedCoverLetter = myCoverLetters.find(
      (coverLetter) => coverLetter.coverLetterId === selfCoverLetterId,
    )

    const selfUserId = parseUserIdFromIdentity(connection.participantIdentity)
    const selfMember =
      selfUserId === null ? undefined : membersByUserId.get(selfUserId)

    const selfEntry: StudyParticipant = {
      participantId: 0,
      userId: selfMember?.userId ?? selfUserId,
      name: selfMember?.nickname || connection.participantName || '나',
      isSelf: true,
      role: selfMember?.role ?? connection.role,
      resumeId: selfMember?.resumeId ?? null,
      coverLetterTitle: selectedCoverLetter?.title ?? '선택한 자소서',
      coverLetterId: selfMember?.coverLetterId ?? selfCoverLetterId,
    }

    const remoteEntries: StudyParticipant[] = remoteParticipants.map(
      (participant) => {
        const userId = parseUserIdFromIdentity(participant.identity)
        const member = userId === null ? undefined : membersByUserId.get(userId)

        return {
          participantId: resolveParticipantId(participant.identity, false),
          userId: member?.userId ?? userId,
          // 서버 닉네임을 우선 쓰고, 없을 때만 LiveKit 값으로 내려간다. identity 문자열 노출은 마지막 수단이다.
          name: member?.nickname || participant.name || participant.identity,
          isSelf: false,
          role: member?.role ?? null,
          resumeId: member?.resumeId ?? null,
          coverLetterTitle:
            member?.coverLetterId != null ? '자소서' : '제출 안 함',
          coverLetterId: member?.coverLetterId ?? null,
        }
      },
    )

    return [selfEntry, ...remoteEntries]
  }, [
    remoteParticipants,
    selfCoverLetterId,
    myCoverLetters,
    membersByUserId,
    connection.participantName,
    connection.participantIdentity,
    connection.role,
    resolveParticipantId,
  ])

  // participants는 지금 화상에 접속해 있는 사람만 담아 그리드/영상 렌더링용으로 쓴다. 그런데 누군가
  // 먼저 나가버리면 그 사람은 이 배열에서 바로 사라져서, 아직 그 사람을 평가하지 않은 다른 참가자는
  // 더 이상 평가 대상으로 고를 수 없게 된다. 그래서 세션 우측 패널(서류·평가)에는 그리드용 배열 대신
  // 본인이 이 세션에 있는 동안 한 번이라도 본 참가자를 계속 기억해두는 이 목록을 따로 넘긴다.
  // (렌더 중 상태 조정 패턴 — 이펙트로 하면 한 프레임 지연되며 cascading render가 생긴다.)
  const [everSeenParticipantsById, setEverSeenParticipantsById] = useState<Map<number, StudyParticipant>>(
    new Map(),
  )
  const seenParticipantsNeedUpdate = participants.some((participant) => {
    const existing = everSeenParticipantsById.get(participant.participantId)
    return (
      !existing ||
      existing.name !== participant.name ||
      existing.role !== participant.role ||
      existing.resumeId !== participant.resumeId ||
      existing.coverLetterId !== participant.coverLetterId ||
      existing.coverLetterTitle !== participant.coverLetterTitle
    )
  })

  if (seenParticipantsNeedUpdate) {
    const next = new Map(everSeenParticipantsById)
    for (const participant of participants) {
      next.set(participant.participantId, participant)
    }
    setEverSeenParticipantsById(next)
  }

  const seenParticipants = useMemo(
    () => Array.from(everSeenParticipantsById.values()),
    [everSeenParticipantsById],
  )

  const cameraTrackByParticipantId = useMemo(() => {
    const map = new Map<number, (typeof cameraTracks)[number]>()
    for (const trackRef of cameraTracks) {
      map.set(resolveParticipantId(trackRef.participant.identity, trackRef.participant.isLocal), trackRef)
    }
    return map
  }, [cameraTracks, resolveParticipantId])

  const micTrackByParticipantId = useMemo(() => {
    const map = new Map<number, (typeof micTracks)[number]>()
    for (const trackRef of micTracks) {
      if (trackRef.participant.isLocal) continue
      map.set(resolveParticipantId(trackRef.participant.identity, false), trackRef)
    }
    return map
  }, [micTracks, resolveParticipantId])

  // LiveKit이 오디오 레벨 임계값 기반으로 판별한 현재 발화자 목록. 타일 테두리 강조에 쓴다.
  const speakingParticipants = useSpeakingParticipants()
  const speakingIds = useMemo(
    () =>
      new Set(
        speakingParticipants.map((participant) =>
          resolveParticipantId(participant.identity, participant.isLocal),
        ),
      ),
    [speakingParticipants, resolveParticipantId],
  )

  // 마이크 트랙이 아예 없거나(꺼짐) 트랙이 음소거 상태면 그 참가자는 음소거로 본다.
  const isMicMuted = useCallback(
    (participant: StudyParticipant) => {
      if (participant.isSelf) return !isMicrophoneEnabled
      const trackRef = micTrackByParticipantId.get(participant.participantId)
      return !trackRef || trackRef.publication.isMuted
    },
    [isMicrophoneEnabled, micTrackByParticipantId],
  )

  // 화면을 공유 중인 참가자 id 집합. 카메라 타일에 공유 중 아이콘을 띄우는 데 쓴다.
  const sharingParticipantIds = useMemo(() => {
    const set = new Set<number>()
    for (const trackRef of screenShareTracks) {
      set.add(resolveParticipantId(trackRef.participant.identity, trackRef.participant.isLocal))
    }
    return set
  }, [screenShareTracks, resolveParticipantId])

  // 참가자별 LiveKit identity. 강퇴 API는 identity가 아니라 userId를 받으므로 보관해 둔다.
  const identityByParticipantId = useMemo(() => {
    const map = new Map<number, string>()
    for (const participant of remoteParticipants) {
      map.set(resolveParticipantId(participant.identity, false), participant.identity)
    }
    return map
  }, [remoteParticipants, resolveParticipantId])

  const selfId = participants.find((participant) => participant.isSelf)?.participantId ?? null
  const isHost = connection.role === 'HOST'

  // 상호평가 진행률을 알려주는 서버 API가 없어, 각자 자신의 완료 여부를 데이터 채널로 서로
  // 알리고 취합한다. 세션 종료·나가기 확인에서 "아직 평가가 안 끝난 사람이 있는지" 판단하는 용도다.
  const [myEvaluationProgress, setMyEvaluationProgress] = useState<StudySessionEvaluationProgress>({
    completed: 0,
    total: 0,
  })
  const myEvaluationDone = myEvaluationProgress.completed >= myEvaluationProgress.total
  const myIncompleteEvaluationCount = Math.max(
    myEvaluationProgress.total - myEvaluationProgress.completed,
    0,
  )

  const [remoteEvaluationDoneByUserId, setRemoteEvaluationDoneByUserId] = useState<Map<number, boolean>>(
    new Map(),
  )

  const { send: sendEvaluationProgress } = useDataChannel(EVALUATION_PROGRESS_TOPIC, (message) => {
    const senderUserId = message.from ? parseUserIdFromIdentity(message.from.identity) : null
    if (senderUserId === null) return
    try {
      const payload = JSON.parse(new TextDecoder().decode(message.payload)) as { done?: boolean }
      setRemoteEvaluationDoneByUserId((prev) => new Map(prev).set(senderUserId, payload.done === true))
    } catch {
      // 알 수 없는 형식의 메시지는 무시한다.
    }
  })

  // 내 진행 상황이 바뀔 때, 그리고 누군가 새로 들어와 아직 내 상태를 모를 수 있을 때 다시 알린다.
  useEffect(() => {
    const payload = new TextEncoder().encode(JSON.stringify({ done: myEvaluationDone }))
    void sendEvaluationProgress(payload, { reliable: true })
  }, [myEvaluationDone, sendEvaluationProgress, remoteParticipants.length])

  // 이미 나간 사람의 완료 여부는 더 이상 의미가 없으므로, 지금 남아 있는 참가자만 센다.
  const remoteIncompleteEvaluatorCount = remoteParticipants.filter((participant) => {
    const userId = parseUserIdFromIdentity(participant.identity)
    return userId !== null && remoteEvaluationDoneByUserId.get(userId) !== true
  }).length
  const hasIncompleteEvaluations = !myEvaluationDone || remoteIncompleteEvaluatorCount > 0

  const [panelOpen, setPanelOpen] = useState(false)
  const [micGain, setMicGain] = useState(initialDevices.micGain)
  const [speakerMuted, setSpeakerMuted] = useState(false)
  const [speakerVolume, setSpeakerVolume] = useState(initialDevices.speakerVolume)
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false)
  // 평가 미완료 상태로 종료·나가기를 시도할 때 거치는 방어 단계.
  // host1 → host2는 방장 종료 전용 2단계 경고, member는 참가자 나가기 경고다.
  const [evalWarningStep, setEvalWarningStep] = useState<'host1' | 'host2' | 'member' | null>(null)
  const [leaving, setLeaving] = useState(false)
  const [leaveError, setLeaveError] = useState<string | null>(null)
  const [kickTarget, setKickTarget] = useState<{ participantId: number; name: string } | null>(null)
  const [kicking, setKicking] = useState(false)
  const [kickError, setKickError] = useState<string | null>(null)
  const [stageMode, setStageMode] = useState<StageMode>({ type: 'grid' })
  const [stripCollapsed, setStripCollapsed] = useState(false)
  const [order, setOrder] = useState<number[]>([0])
  const [lockedIds, setLockedIds] = useState<Set<number>>(new Set())
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [deviceSettingsOpen, setDeviceSettingsOpen] = useState(false)
  const [deviceOptions, setDeviceOptions] = useState<{
    camera: DeviceOption[]
    mic: DeviceOption[]
    speaker: DeviceOption[]
  }>({ camera: [], mic: [], speaker: [] })
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null)
  const [selectedMicId, setSelectedMicId] = useState<string | null>(null)
  const [selectedSpeakerId, setSelectedSpeakerId] = useState<string | null>(null)
  const [deviceSwitchError, setDeviceSwitchError] = useState<string | null>(null)
  const dragIdRef = useRef<number | null>(null)
  const videoAreaRef = useRef<HTMLDivElement>(null)
  const deviceSettingsRef = useRef<HTMLDivElement>(null)
  const [gridRef, gridSize, predictGridWidthChange] = useElementSize<HTMLDivElement>(PANEL_TRANSITION_MS)
  const [stageRef, stageSize, predictStageWidthChange] = useElementSize<HTMLDivElement>(PANEL_TRANSITION_MS)

  // 참가자 입장/퇴장에 맞춰 순서 목록을 동기화한다 — 기존 순서는 유지하고 새 참가자는 뒤에 붙인다.
  // (렌더 중 상태 조정 패턴 — effect로 하면 한 프레임 지연되며 cascading render가 생긴다.)
  const currentParticipantIds = participants.map((participant) => participant.participantId)
  const [prevParticipantIds, setPrevParticipantIds] = useState(currentParticipantIds)
  const participantIdsChanged =
    currentParticipantIds.length !== prevParticipantIds.length ||
    currentParticipantIds.some((id, index) => id !== prevParticipantIds[index])

  if (participantIdsChanged) {
    setPrevParticipantIds(currentParticipantIds)
    const kept = order.filter((id) => currentParticipantIds.includes(id))
    const added = currentParticipantIds.filter((id) => !kept.includes(id))
    setOrder([...kept, ...added])
  }

  // 새 화면 공유가 시작되면 자동으로 그 화면을 확대한다. 이미 다른 공유를 보고 있으면 시선을 뺏지 않는다.
  // (렌더 중 상태 조정 패턴)
  const screenShareSids = screenShareTracks.map((trackRef) => trackRef.publication.trackSid)
  const [prevScreenShareSids, setPrevScreenShareSids] = useState(screenShareSids)
  const screenShareSidsChanged =
    screenShareSids.length !== prevScreenShareSids.length ||
    screenShareSids.some((sid, index) => sid !== prevScreenShareSids[index])

  if (screenShareSidsChanged) {
    setPrevScreenShareSids(screenShareSids)
    const addedSid = screenShareSids.find((sid) => !prevScreenShareSids.includes(sid))
    if (addedSid && stageMode.type !== 'screen') {
      setStageMode({ type: 'screen', sid: addedSid })
    }
  }

  // 보고 있던 공유가 끝나면 남아 있는 다른 공유로 넘어가고, 더 없으면 그리드로 복귀한다.
  if (stageMode.type === 'screen' && !screenShareSids.includes(stageMode.sid)) {
    setStageMode(
      screenShareSids.length > 0 ? { type: 'screen', sid: screenShareSids[0] } : { type: 'grid' },
    )
  }

  const stageScreenShareTrack =
    stageMode.type === 'screen'
      ? (screenShareTracks.find((trackRef) => trackRef.publication.trackSid === stageMode.sid) ?? null)
      : null

  // 세션 접속 시 이미 카메라·마이크 권한을 받은 상태라 별도 getUserMedia 없이 목록만 조회한다.
  useEffect(() => {
    let isActive = true
    const refreshDeviceOptions = () => {
      navigator.mediaDevices
        .enumerateDevices()
        .then((list) => {
          if (!isActive) return
          setDeviceOptions({
            camera: toDeviceOptions(list, 'videoinput', '카메라'),
            mic: toDeviceOptions(list, 'audioinput', '마이크'),
            speaker: toDeviceOptions(list, 'audiooutput', '스피커'),
          })
        })
        .catch(() => {})
    }

    refreshDeviceOptions()
    navigator.mediaDevices.addEventListener('devicechange', refreshDeviceOptions)
    return () => {
      isActive = false
      navigator.mediaDevices.removeEventListener('devicechange', refreshDeviceOptions)
    }
  }, [])

  const cameraDeviceId = selectedCameraId ?? room.getActiveDevice('videoinput') ?? null
  const micDeviceId = selectedMicId ?? room.getActiveDevice('audioinput') ?? null
  const speakerDeviceId = selectedSpeakerId ?? room.getActiveDevice('audiooutput') ?? null

  const handleChangeCamera = (id: string) => {
    setSelectedCameraId(id)
    setDeviceSwitchError(null)
    void room.switchActiveDevice('videoinput', id).catch(() => setDeviceSwitchError('카메라를 변경하지 못했습니다.'))
  }

  const handleChangeMic = (id: string) => {
    setSelectedMicId(id)
    setDeviceSwitchError(null)
    void room.switchActiveDevice('audioinput', id).catch(() => setDeviceSwitchError('마이크를 변경하지 못했습니다.'))
  }

  const handleChangeSpeaker = (id: string) => {
    setSelectedSpeakerId(id)
    setDeviceSwitchError(null)
    void room.switchActiveDevice('audiooutput', id).catch(() => setDeviceSwitchError('스피커를 변경하지 못했습니다.'))
  }

  useEffect(() => {
    if (!contextMenu) return
    const closeMenu = () => setContextMenu(null)
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setContextMenu(null)
    }
    window.addEventListener('click', closeMenu)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('click', closeMenu)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [contextMenu])

  useEffect(() => {
    if (!deviceSettingsOpen) return
    const handleClickOutside = (event: MouseEvent) => {
      if (deviceSettingsRef.current?.contains(event.target as Node)) return
      setDeviceSettingsOpen(false)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDeviceSettingsOpen(false)
    }
    window.addEventListener('click', handleClickOutside)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('click', handleClickOutside)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [deviceSettingsOpen])

  const orderedParticipants = useMemo(
    () =>
      order
        .map((id) => participants.find((participant) => participant.participantId === id))
        .filter((participant): participant is StudyParticipant => Boolean(participant)),
    [order, participants],
  )

  // 셀을 꽉 채우는 대신, 레터박스가 가장 적게 남도록 타일 크기 자체를 4:3으로 계산한다.
  // 그리드에는 참가자 카메라와 진행 중인 화면 공유가 모두 타일로 배치되므로 둘을 합쳐 센다.
  const gridTileSize = useMemo(
    () =>
      computeGridTileSize(
        participants.length + screenShareTracks.length,
        gridSize?.width ?? 0,
        gridSize?.height ?? 0,
        GRID_GAP,
      ),
    [participants.length, screenShareTracks.length, gridSize],
  )

  const stageParticipants = useMemo(() => {
    if (stageMode.type !== 'participants') return []
    return stageMode.ids
      .map((id) => participants.find((participant) => participant.participantId === id))
      .filter((participant): participant is StudyParticipant => Boolean(participant))
  }, [stageMode, participants])

  // 확대된 화면도 그리드와 같은 방식으로, 확대 인원수에 맞춰 레터박스가 최소화되게 크기를 계산한다.
  const stageTileSize = useMemo(
    () => computeGridTileSize(stageParticipants.length, stageSize?.width ?? 0, stageSize?.height ?? 0, GRID_GAP),
    [stageParticipants.length, stageSize],
  )

  const handleToggleScreenShare = () => {
    void localParticipant.setScreenShareEnabled(!isScreenShareEnabled)
  }

  // 확대만 해제하고 그리드로 돌아간다. 진행 중인 화면 공유는 그리드에 타일로 남으므로 중단하지 않는다.
  const handleReturnToGrid = () => {
    setStageMode({ type: 'grid' })
  }

  const stagePinnedIds = stageMode.type === 'participants' ? stageMode.ids : []

  const handleDragStart = (id: number) => {
    dragIdRef.current = id
  }

  const handleDropOn = (targetId: number) => {
    const draggedId = dragIdRef.current
    dragIdRef.current = null
    if (draggedId === null || draggedId === targetId) return
    if (draggedId === selfId || targetId === selfId) return
    if (lockedIds.has(draggedId) || lockedIds.has(targetId)) return

    const draggedIsStaged = stagePinnedIds.includes(draggedId)
    const targetIsStaged = stagePinnedIds.includes(targetId)

    if (draggedIsStaged && targetIsStaged) {
      // 확대된 참가자끼리는 확대 목록 안에서 서로 자리를 맞바꾼다.
      setStageMode((mode) => {
        if (mode.type !== 'participants') return mode
        const next = [...mode.ids]
        const from = next.indexOf(draggedId)
        const to = next.indexOf(targetId)
        if (from === -1 || to === -1) return mode
        ;[next[from], next[to]] = [next[to], next[from]]
        return { type: 'participants', ids: next }
      })
      return
    }

    if (draggedIsStaged !== targetIsStaged) {
      // 확대된 참가자와 위 스트립(또는 그리드) 참가자를 드래그로 맞바꾼다:
      // 확대 목록에서 기존 참가자가 있던 자리를 새 참가자로 교체한다.
      setStageMode((mode) => {
        if (mode.type !== 'participants') return mode
        const stagedId = draggedIsStaged ? draggedId : targetId
        const incomingId = draggedIsStaged ? targetId : draggedId
        return { type: 'participants', ids: mode.ids.map((id) => (id === stagedId ? incomingId : id)) }
      })
      return
    }

    setOrder((prev) => {
      const next = [...prev]
      const from = next.indexOf(draggedId)
      const to = next.indexOf(targetId)
      if (from === -1 || to === -1) return prev
      ;[next[from], next[to]] = [next[to], next[from]]
      return next
    })
  }

  const openContextMenu = (event: ReactMouseEvent<HTMLDivElement>, participantId: number) => {
    event.preventDefault()
    setContextMenu({ participantId, x: event.clientX, y: event.clientY })
  }

  const toggleLock = (id: number) => {
    setLockedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // 최대 인원(MAX_STAGE_PARTICIPANTS)까지 확대 목록에 추가한다. 이미 꽉 찼으면 무시한다.
  const handleEnlarge = (id: number) => {
    setStageMode((mode) => {
      const currentIds = mode.type === 'participants' ? mode.ids : []
      if (currentIds.includes(id) || currentIds.length >= MAX_STAGE_PARTICIPANTS) return mode
      return { type: 'participants', ids: [...currentIds, id] }
    })
  }

  // 확대 목록에서 한 명만 뺀다. 마지막 한 명이었으면 그리드로 돌아간다.
  const handleUnpin = (id: number) => {
    setStageMode((mode) => {
      if (mode.type !== 'participants') return mode
      const nextIds = mode.ids.filter((existingId) => existingId !== id)
      return nextIds.length > 0 ? { type: 'participants', ids: nextIds } : { type: 'grid' }
    })
  }

  // 나가기·종료 버튼을 누르면, 평가가 덜 끝난 상태인지에 따라 다른 확인 절차로 보낸다.
  // 다 끝났다면 평소처럼 단순 확인 다이얼로그로, 아니라면 경고 단계부터 거치게 한다.
  const handleLeaveButtonClick = () => {
    if (isHost) {
      setEvalWarningStep(hasIncompleteEvaluations ? 'host1' : null)
      setLeaveDialogOpen(!hasIncompleteEvaluations)
      return
    }
    setEvalWarningStep(myIncompleteEvaluationCount > 0 ? 'member' : null)
    setLeaveDialogOpen(myIncompleteEvaluationCount === 0)
  }

  // 방장이 나가면 세션 자체를 종료한다 — 참가자만 따로 나가는 API는 없고, 방장이 없는 세션을 계속
  // 유지할 방법도 없기 때문이다. 종료 요청이 실패하면 나가기를 진행하지 않고 재시도할 수 있게 한다.
  const handleConfirmLeave = async () => {
    if (!isHost) {
      setLeaveDialogOpen(false)
      setEvalWarningStep(null)
      onLeave()
      return
    }

    setLeaving(true)
    setLeaveError(null)
    try {
      await endStudySession(connection.sessionId)
      // onLeave()가 라우팅 이동에 실패해도(예외 발생) 다이얼로그를 먼저 닫아버리면 에러 문구를
      // 보여줄 곳이 없어 화면만 멈춘 것처럼 보인다. 화면 전환이 확실히 시작된 뒤에 다이얼로그 상태를 정리한다.
      onLeave()
      setLeaveDialogOpen(false)
      setEvalWarningStep(null)
    } catch (error) {
      setLeaveError(toErrorMessage(error))
    } finally {
      setLeaving(false)
    }
  }

  const openKickConfirm = (participantId: number) => {
    const participant = participants.find((entry) => entry.participantId === participantId)
    if (!participant) return
    setKickError(null)
    setKickTarget({ participantId, name: participant.name })
  }

  const handleConfirmKick = async () => {
    if (!kickTarget) return
    // 세션 참가자 목록으로 확인한 userId를 우선 쓰고, 아직 조회되지 않았으면 identity에서 뽑아낸다.
    const target = participants.find(
      (entry) => entry.participantId === kickTarget.participantId,
    )
    const identity = identityByParticipantId.get(kickTarget.participantId)
    const targetUserId =
      target?.userId ?? (identity ? parseUserIdFromIdentity(identity) : null)
    if (targetUserId === null) {
      setKickError('참가자 정보를 확인할 수 없습니다.')
      return
    }

    setKicking(true)
    setKickError(null)
    try {
      await kickStudySessionParticipant(connection.sessionId, targetUserId)
      setKickTarget(null)
    } catch (error) {
      setKickError(toErrorMessage(error))
    } finally {
      setKicking(false)
    }
  }

  // 패널이 열고 닫힐 폭만큼 그리드/스테이지 폭을 미리 계산해 둔다 — 실측 리사이즈 이벤트를
  // 기다리면 전환 도중 여러 번 재계산되며 타일이 쌓였다 정렬되는 것처럼 보인다.
  const handleTogglePanel = () => {
    setPanelOpen((wasOpen) => {
      const deltaWidth = wasOpen ? PANEL_WIDTH : -PANEL_WIDTH
      predictGridWidthChange(deltaWidth)
      predictStageWidthChange(deltaWidth)
      return !wasOpen
    })
  }

  const contextMenuIsPinned = contextMenu ? stagePinnedIds.includes(contextMenu.participantId) : false
  const contextMenuAtLimit = !contextMenuIsPinned && stagePinnedIds.length >= MAX_STAGE_PARTICIPANTS

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="relative flex min-h-0 flex-1">
        {/* 영상 영역 + 장치설정바를 한 열로 묶어, 패널이 열리면 이 열 전체가 함께 밀리게 한다. */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div ref={videoAreaRef} className="relative min-h-0 flex-1 overflow-hidden p-4">
            {reconnecting ? (
              <div className="absolute inset-x-4 top-4 z-30 flex items-center justify-center gap-2 rounded-ait-s bg-status-warning px-4 py-2 text-center text-body-2 text-white shadow-elevation-2">
                <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden="true" />
                재접속 중입니다...
              </div>
            ) : null}

            {stageMode.type === 'grid' ? (
              <div
                key="grid"
                ref={gridRef}
                className="screen-fade-in flex h-full w-full flex-wrap content-center items-center justify-center gap-3"
              >
                {orderedParticipants.map((participant) => (
                  <div
                    key={participant.participantId}
                    className="shrink-0 transition-[width,height] ease-standard duration-(--duration-base)"
                    style={
                      gridTileSize.width > 0
                        ? { width: gridTileSize.width, height: gridTileSize.height }
                        : { width: '30%', aspectRatio: CAMERA_ASPECT }
                    }
                  >
                    <ParticipantTile
                      participant={participant}
                      speaking={speakingIds.has(participant.participantId)}
                      micMuted={isMicMuted(participant)}
                      sharingScreen={sharingParticipantIds.has(participant.participantId)}
                      trackRef={cameraTrackByParticipantId.get(participant.participantId) ?? null}
                      audioTrackRef={
                        participant.isSelf ? null : (micTrackByParticipantId.get(participant.participantId) ?? null)
                      }
                      draggableEnabled={!participant.isSelf}
                      locked={lockedIds.has(participant.participantId)}
                      onDragStart={() => handleDragStart(participant.participantId)}
                      onDropOn={() => handleDropOn(participant.participantId)}
                      onContextMenu={
                        participant.isSelf ? undefined : (event) => openContextMenu(event, participant.participantId)
                      }
                      className="h-full w-full"
                    />
                  </div>
                ))}

                {screenShareTracks.map((trackRef) => (
                  <div
                    key={trackRef.publication.trackSid}
                    className="shrink-0 transition-[width,height] ease-standard duration-(--duration-base)"
                    style={
                      gridTileSize.width > 0
                        ? { width: gridTileSize.width, height: gridTileSize.height }
                        : { width: '30%', aspectRatio: CAMERA_ASPECT }
                    }
                  >
                    <ScreenShareTile
                      trackRef={trackRef}
                      label={screenShareLabel(trackRef)}
                      onSelect={() => setStageMode({ type: 'screen', sid: trackRef.publication.trackSid })}
                      className="h-full w-full"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div key="stage" className="screen-fade-in flex h-full min-h-0 flex-col gap-2">
                <div
                  className={cn(
                    'hide-scrollbar flex shrink-0 items-center gap-3 overflow-x-auto overflow-y-hidden transition-[height] ease-standard duration-(--duration-base)',
                    stripCollapsed ? 'h-0' : 'h-24',
                  )}
                >
                  {/* 지금 확대해서 보고 있는 공유 화면은 아래 스테이지에 이미 보이므로 위 줄에서는 뺀다. */}
                  {screenShareTracks
                    .filter(
                      (trackRef) =>
                        !(stageMode.type === 'screen' && trackRef.publication.trackSid === stageMode.sid),
                    )
                    .map((trackRef) => (
                      <ScreenShareTile
                        key={trackRef.publication.trackSid}
                        trackRef={trackRef}
                        label={screenShareLabel(trackRef)}
                        onSelect={() => setStageMode({ type: 'screen', sid: trackRef.publication.trackSid })}
                        className="aspect-12/9 h-24 w-auto shrink-0"
                      />
                    ))}

                  {/* 확대된 참가자는 아래 스테이지에 이미 보이므로 위 줄에는 남겨두지 않는다. */}
                  {orderedParticipants
                    .filter((participant) => !stagePinnedIds.includes(participant.participantId))
                    .map((participant) => (
                      <ParticipantTile
                        key={participant.participantId}
                        participant={participant}
                        speaking={speakingIds.has(participant.participantId)}
                        micMuted={isMicMuted(participant)}
                        sharingScreen={sharingParticipantIds.has(participant.participantId)}
                        trackRef={cameraTrackByParticipantId.get(participant.participantId) ?? null}
                        audioTrackRef={
                          participant.isSelf ? null : (micTrackByParticipantId.get(participant.participantId) ?? null)
                        }
                        draggableEnabled={!participant.isSelf}
                        locked={lockedIds.has(participant.participantId)}
                        onDragStart={() => handleDragStart(participant.participantId)}
                        onDropOn={() => handleDropOn(participant.participantId)}
                        onContextMenu={
                          participant.isSelf ? undefined : (event) => openContextMenu(event, participant.participantId)
                        }
                        className="aspect-12/9 h-24 w-auto shrink-0"
                      />
                    ))}
                </div>

                {/* 그리드로 돌아가는 버튼이 아니라, 위 참가자 줄을 접어 확대 화면을 더 크게 보여주는 버튼이다. */}
                <button
                  type="button"
                  aria-label={stripCollapsed ? '다른 참가자 화면 펼치기' : '다른 참가자 화면 접어서 크게 보기'}
                  onClick={() => setStripCollapsed((value) => !value)}
                  className="mx-auto flex h-4 w-6 shrink-0 items-center justify-center rounded-ait-s text-text-secondary transition-colors hover:bg-status-neutral-surface"
                >
                  {stripCollapsed ? (
                    <ChevronDown className="size-3.5" aria-hidden="true" />
                  ) : (
                    <ChevronUp className="size-3.5" aria-hidden="true" />
                  )}
                </button>

                <div
                  ref={stageRef}
                  className="flex min-h-0 flex-1 flex-wrap content-center items-center justify-center gap-3 overflow-hidden"
                >
                  {stageMode.type === 'screen' ? (
                    stageScreenShareTrack ? (
                      <div className="relative size-full overflow-hidden rounded-ait-m">
                        <VideoTrack
                          trackRef={stageScreenShareTrack}
                          className="size-full bg-black object-contain"
                        />
                        <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-ait-s bg-black/60 px-2.5 py-1 text-caption text-white">
                          <ScreenShare className="size-3.5 shrink-0" aria-hidden="true" />
                          {screenShareLabel(stageScreenShareTrack)}
                        </span>
                        <button
                          type="button"
                          aria-label="확대 종료하고 그리드로 보기"
                          onClick={handleReturnToGrid}
                          className="absolute right-3 top-3 flex size-7 items-center justify-center rounded-ait-s bg-black/60 text-white transition-colors hover:bg-black/80"
                        >
                          <X className="size-4" aria-hidden="true" />
                        </button>
                      </div>
                    ) : null
                  ) : (
                    stageParticipants.map((participant) => (
                      <div
                        key={participant.participantId}
                        className="shrink-0 overflow-hidden rounded-ait-m transition-[width,height] ease-standard duration-(--duration-base)"
                        style={
                          stageTileSize.width > 0
                            ? { width: stageTileSize.width, height: stageTileSize.height }
                            : { width: '100%', aspectRatio: CAMERA_ASPECT }
                        }
                      >
                        <ParticipantTile
                          participant={participant}
                          speaking={speakingIds.has(participant.participantId)}
                          micMuted={isMicMuted(participant)}
                          sharingScreen={sharingParticipantIds.has(participant.participantId)}
                          trackRef={cameraTrackByParticipantId.get(participant.participantId) ?? null}
                          audioTrackRef={
                            participant.isSelf ? null : (micTrackByParticipantId.get(participant.participantId) ?? null)
                          }
                          draggableEnabled={!participant.isSelf}
                          locked={lockedIds.has(participant.participantId)}
                          onDragStart={() => handleDragStart(participant.participantId)}
                          onDropOn={() => handleDropOn(participant.participantId)}
                          onContextMenu={(event) => openContextMenu(event, participant.participantId)}
                          className="h-full w-full"
                        />
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            <FloatingChatButton boundsRef={videoAreaRef} />

            {contextMenu ? (
              <div
                role="menu"
                aria-label="참가자 옵션"
                style={{ top: contextMenu.y, left: contextMenu.x }}
                className="fixed z-50 w-40 rounded-ait-s border border-border-default bg-surface-default py-1 shadow-elevation-3"
              >
                <button
                  type="button"
                  role="menuitem"
                  disabled={contextMenuAtLimit}
                  onClick={() => {
                    if (contextMenuIsPinned) {
                      handleUnpin(contextMenu.participantId)
                    } else {
                      handleEnlarge(contextMenu.participantId)
                    }
                    setContextMenu(null)
                  }}
                  className={cn(
                    'block w-full px-3 py-2 text-left text-body-2 hover:bg-status-neutral-surface',
                    contextMenuAtLimit ? 'cursor-not-allowed text-text-secondary' : 'text-text-primary',
                  )}
                >
                  {contextMenuIsPinned
                    ? '확대 해제'
                    : contextMenuAtLimit
                      ? `화면 확대 (최대 ${MAX_STAGE_PARTICIPANTS}명)`
                      : '화면 확대'}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    toggleLock(contextMenu.participantId)
                    setContextMenu(null)
                  }}
                  className="block w-full px-3 py-2 text-left text-body-2 text-text-primary hover:bg-status-neutral-surface"
                >
                  {lockedIds.has(contextMenu.participantId) ? '고정 해제' : '위치 고정'}
                </button>
                {stageMode.type !== 'grid' ? (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      handleReturnToGrid()
                      setContextMenu(null)
                    }}
                    className="block w-full border-t border-border-default px-3 py-2 text-left text-body-2 text-text-primary hover:bg-status-neutral-surface"
                  >
                    전체 그리드로 보기
                  </button>
                ) : null}
                {isHost && identityByParticipantId.has(contextMenu.participantId) ? (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      openKickConfirm(contextMenu.participantId)
                      setContextMenu(null)
                    }}
                    className="block w-full border-t border-border-default px-3 py-2 text-left text-body-2 text-status-error hover:bg-status-neutral-surface"
                  >
                    강퇴
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          {/* 장치설정바: 영상 위에 떠 있지 않고 하단에 항상 고정된 자리를 차지하며, 패널이 열리면 이 열과 함께 밀린다. */}
          <div className="flex shrink-0 items-center justify-center gap-4 px-4 py-3">
            <div
              ref={deviceSettingsRef}
              className="relative flex items-center justify-center rounded-ait-pill bg-action-primary px-3 py-2 shadow-elevation-2"
            >
              {deviceSettingsOpen ? (
                <div className="absolute bottom-full left-0 pb-3">
                  <div className="flex w-96 max-w-[calc(100vw-2rem)] flex-col gap-4 rounded-ait-s bg-theater-backdrop p-4 shadow-elevation-2">
                    <div>
                      <span className="flex items-center gap-2 text-caption font-medium text-white">
                        <Video className="size-3.5" aria-hidden="true" />
                        카메라
                      </span>
                      <Dropdown
                        className="mt-1"
                        buttonClassName={deviceDropdownButtonClass}
                        ariaLabel="카메라 선택"
                        placeholder="사용 가능한 카메라가 없습니다"
                        options={deviceOptions.camera.map((device) => ({ value: device.id, label: device.label }))}
                        value={cameraDeviceId}
                        onChange={handleChangeCamera}
                      />
                    </div>

                    <div>
                      <span className="flex items-center gap-2 text-caption font-medium text-white">
                        <Mic className="size-3.5" aria-hidden="true" />
                        마이크
                      </span>
                      <Dropdown
                        className="mt-1"
                        buttonClassName={deviceDropdownButtonClass}
                        ariaLabel="마이크 선택"
                        placeholder="사용 가능한 마이크가 없습니다"
                        options={deviceOptions.mic.map((device) => ({ value: device.id, label: device.label }))}
                        value={micDeviceId}
                        onChange={handleChangeMic}
                      />
                    </div>

                    <div>
                      <span className="flex items-center gap-2 text-caption font-medium text-white">
                        <Volume2 className="size-3.5" aria-hidden="true" />
                        스피커
                      </span>
                      <Dropdown
                        className="mt-1"
                        buttonClassName={deviceDropdownButtonClass}
                        ariaLabel="스피커 선택"
                        placeholder="사용 가능한 스피커가 없습니다"
                        options={deviceOptions.speaker.map((device) => ({ value: device.id, label: device.label }))}
                        value={speakerDeviceId}
                        onChange={handleChangeSpeaker}
                        openUpward
                      />
                    </div>

                    {deviceSwitchError ? <p className="text-caption text-theater-live">{deviceSwitchError}</p> : null}
                  </div>
                </div>
              ) : null}

              <button
                type="button"
                aria-pressed={deviceSettingsOpen}
                aria-label={deviceSettingsOpen ? '장치 설정 접기' : '장치 설정 펼치기'}
                onClick={() => setDeviceSettingsOpen((value) => !value)}
                className={cn(
                  'flex size-10 items-center justify-center rounded-ait-s text-white transition-colors hover:bg-white/15',
                  deviceSettingsOpen && 'bg-white/20',
                )}
              >
                <Settings className="size-5" aria-hidden="true" />
              </button>
            </div>

            <div className="flex items-center gap-1.5 rounded-ait-pill bg-action-primary px-3 py-2 shadow-elevation-2">
              <button
                type="button"
                aria-pressed={!isCameraEnabled}
                aria-label={isCameraEnabled ? '카메라 끄기' : '카메라 켜기'}
                onClick={() => void localParticipant.setCameraEnabled(!isCameraEnabled)}
                className={cn(
                  'flex size-10 items-center justify-center rounded-ait-s text-white transition-colors hover:bg-white/15',
                  !isCameraEnabled && 'text-theater-live',
                )}
              >
                {isCameraEnabled ? <Video className="size-5" aria-hidden="true" /> : <VideoOff className="size-5" aria-hidden="true" />}
              </button>

              <HoverVolumeButton
                icon={<Mic className="size-5" aria-hidden="true" />}
                mutedIcon={<MicOff className="size-5" aria-hidden="true" />}
                muted={!isMicrophoneEnabled}
                onToggleMuted={() => void localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)}
                gain={micGain}
                onChangeGain={setMicGain}
                label="마이크"
              />

              <HoverVolumeButton
                icon={<Volume2 className="size-5" aria-hidden="true" />}
                mutedIcon={<VolumeX className="size-5" aria-hidden="true" />}
                muted={speakerMuted}
                onToggleMuted={() => setSpeakerMuted((value) => !value)}
                gain={speakerVolume}
                onChangeGain={setSpeakerVolume}
                label="스피커"
              />

              <button
                type="button"
                aria-pressed={isScreenShareEnabled}
                aria-label={isScreenShareEnabled ? '화면 공유 중지' : '화면 공유'}
                onClick={handleToggleScreenShare}
                className={cn(
                  'flex size-10 items-center justify-center rounded-ait-s text-white transition-colors hover:bg-white/15',
                  isScreenShareEnabled && 'bg-white/20',
                )}
              >
                <ScreenShare className="size-5" aria-hidden="true" />
              </button>
            </div>

            <button
              type="button"
              aria-label="세션 나가기"
              onClick={handleLeaveButtonClick}
              className="flex size-12 items-center justify-center rounded-ait-l bg-status-error text-white shadow-elevation-2 transition-colors hover:opacity-90"
            >
              <Phone className="size-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        <button
          type="button"
          aria-label={panelOpen ? '패널 접기' : '패널 펼치기'}
          onClick={handleTogglePanel}
          className="z-10 flex w-6 shrink-0 items-center justify-center border-y border-l border-border-default bg-surface-default text-text-secondary transition-colors hover:bg-status-neutral-surface"
        >
          {panelOpen ? <ChevronRight className="size-4" aria-hidden="true" /> : <ChevronLeft className="size-4" aria-hidden="true" />}
        </button>

        <div
          className="shrink-0 overflow-hidden border-l border-border-default bg-surface-default transition-[width] ease-standard duration-(--duration-base)"
          style={{ width: panelOpen ? PANEL_WIDTH : 0 }}
        >
          <div className="h-full" style={{ width: PANEL_WIDTH }}>
            <StudySessionSidePanel
              sessionId={connection.sessionId}
              participants={seenParticipants}
              onEvaluationProgressChange={setMyEvaluationProgress}
            />
          </div>
        </div>
      </div>

      <Dialog
        open={leaveDialogOpen}
        onOpenChange={(open) => {
          if (leaving) return
          setLeaveDialogOpen(open)
          if (!open) setLeaveError(null)
        }}
      >
        <DialogContent className="w-[min(26rem,calc(100vw-2rem))] p-6" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{isHost ? '세션을 종료할까요?' : '세션에서 나갈까요?'}</DialogTitle>
            <DialogDescription>
              {isHost
                ? '방장이 나가면 세션이 종료되고 모든 참가자와의 연결이 끊어집니다.'
                : '나가면 화상 스터디 세션 연결이 종료됩니다.'}
            </DialogDescription>
          </DialogHeader>
          {leaveError ? <p className="mt-3 text-body-2 text-status-error">{leaveError}</p> : null}
          <DialogFooter className="mt-6">
            <Button type="button" variant="text" disabled={leaving} onClick={() => setLeaveDialogOpen(false)}>
              계속 참여
            </Button>
            <Button type="button" variant="destructive" disabled={leaving} onClick={() => void handleConfirmLeave()}>
              {isHost ? (leaving ? '종료 중…' : '세션 종료') : '나가기'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 방장 종료 1단계: 아직 평가 중인 스터디원이 있다는 사실만 먼저 알린다. */}
      <ConfirmDialog
        open={evalWarningStep === 'host1'}
        onOpenChange={(open) => {
          if (!open) setEvalWarningStep(null)
        }}
        title="아직 평가중인 스터디원이 있어요"
        description="그래도 세션을 종료하실 건가요?"
        cancelLabel="계속 참여"
        confirmLabel="그래도 종료"
        confirmVariant="destructive"
        onConfirm={() => setEvalWarningStep('host2')}
      />

      {/* 방장 종료 2단계: 실제로 놓치게 되는 결과를 한 번 더 못박는 마지막 확인. */}
      <ConfirmDialog
        open={evalWarningStep === 'host2'}
        onOpenChange={(open) => {
          if (leaving) return
          if (!open) {
            setEvalWarningStep(null)
            setLeaveError(null)
          }
        }}
        title="이대로 세션을 종료하면 평가를 받지 못하는 스터디원이 생깁니다"
        cancelLabel="취소"
        confirmLabel={leaving ? '종료 중…' : '그래도 종료'}
        confirmVariant="destructive"
        isConfirming={leaving}
        onConfirm={() => void handleConfirmLeave()}
      >
        {leaveError ? <p className="text-body-2 text-status-error">{leaveError}</p> : null}
      </ConfirmDialog>

      {/* 참가자 나가기: 본인이 아직 평가하지 않은 인원이 남아 있을 때만 건너뛰어도 괜찮은지 확인한다. */}
      <ConfirmDialog
        open={evalWarningStep === 'member'}
        onOpenChange={(open) => {
          if (!open) setEvalWarningStep(null)
        }}
        title={`아직 ${myIncompleteEvaluationCount}명의 평가를 완료하지 않았습니다`}
        description="평가를 건너뛸까요?"
        cancelLabel="취소"
        confirmLabel="나가기"
        confirmVariant="destructive"
        onConfirm={() => void handleConfirmLeave()}
      />

      <Dialog
        open={kickTarget !== null}
        onOpenChange={(open) => {
          if (kicking) return
          if (!open) {
            setKickTarget(null)
            setKickError(null)
          }
        }}
      >
        <DialogContent className="w-[min(26rem,calc(100vw-2rem))] p-6" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{kickTarget?.name}님을 강퇴할까요?</DialogTitle>
            <DialogDescription>강퇴하면 이 세션에 다시 참여할 수 없습니다.</DialogDescription>
          </DialogHeader>
          {kickError ? <p className="mt-3 text-body-2 text-status-error">{kickError}</p> : null}
          <DialogFooter className="mt-6">
            <Button type="button" variant="text" disabled={kicking} onClick={() => setKickTarget(null)}>
              취소
            </Button>
            <Button type="button" variant="destructive" disabled={kicking} onClick={() => void handleConfirmKick()}>
              {kicking ? '강퇴 중…' : '강퇴'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 재접속을 포기했거나 최초 접속 자체가 실패했을 때: 자동으로 나가지 않고 재시도·나가기를 사용자가 고르게 한다. */}
      <Dialog open={connectionIssue !== null} onOpenChange={() => {}}>
        <DialogContent className="w-[min(26rem,calc(100vw-2rem))] p-6" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>연결에 문제가 발생했습니다</DialogTitle>
            <DialogDescription>{connectionIssue}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6">
            <Button type="button" variant="text" disabled={retrying} onClick={onLeave}>
              나가기
            </Button>
            <Button type="button" disabled={retrying} onClick={() => void onManualRetry()}>
              {retrying ? '다시 시도 중…' : '다시 시도'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
