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
  useLocalParticipant,
  useRemoteParticipants,
  useSpeakingParticipants,
  useTracks,
} from '@livekit/components-react'
import { DisconnectReason, Room, RoomEvent, Track } from 'livekit-client'
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Mic,
  MicOff,
  Phone,
  ScreenShare,
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
import { StudySessionSidePanel } from '@/components/study/StudySessionSidePanel'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { StudyParticipant } from '@/mocks/study'
import { getMyCoverLetters, type CoverLetterListItem } from '@/api/cover-letters'
import {
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
/** 한 번에 확대해 볼 수 있는 참가자 수. */
const MAX_STAGE_PARTICIPANTS = 4
/** 우측 패널 펼침 폭. 패널 토글 시 그리드 폭 변화를 미리 계산하는 데도 쓴다. */
const PANEL_WIDTH = 320
// 패널 폭 전환(--duration-base)과 같은 값. 전환이 끝날 때까지 실측 리사이즈 대신 예측값을 쓴다.
const PANEL_TRANSITION_MS = 250

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
// TODO: 실제 API 연동 필요 — 평가 제출 API로 교체.
export function StudySessionRoom({
  initialDevices,
  selfCoverLetterId,
  connection,
  onLeave,
}: StudySessionRoomProps) {
  const [room, setRoom] = useState(() => new Room())
  const [connectionError, setConnectionError] = useState<string | null>(null)

  useEffect(() => {
    // 매 이펙트 실행마다 새 Room을 만든다. React StrictMode의 개발 모드 이중 실행(mount→cleanup→mount)에서
    // 첫 시도가 connect 도중 취소되면 그 Room의 내부 엔진(RTCEngine)이 손상된 상태로 남는데,
    // 같은 인스턴스로 재연결을 시도하면 "PC manager is closed" 오류가 난다. 취소된 Room은 버리고
    // 재시도 때마다 새 인스턴스로 연결해야 안전하다.
    const activeRoom = new Room()
    let cancelled = false

    // 강퇴되거나 방장이 세션을 종료하면 서버가 이 클라이언트를 강제로 끊는다. 자발적으로 나갈 때는
    // cleanup에서 cancelled를 먼저 true로 만든 뒤 disconnect를 호출하므로 여기서 걸러진다.
    //
    // DisconnectReason에는 그 외에도 여러 사유가 있는데(DUPLICATE_IDENTITY, SIGNAL_CLOSE 등),
    // 특히 개발 모드 StrictMode의 이중 mount로 같은 identity의 연결이 두 개 생겼다가 뒤늦게
    // 도착한 연결이 정리되며 지금 연결이 DUPLICATE_IDENTITY로 끊기는 경우가 있다. 그런 사유까지
    // 나가기로 처리하면 아무 조작 없이도 몇 초 뒤 튕기므로, 실제로 강퇴/세션 종료인 경우에만 나간다.
    const handleDisconnected = (reason?: DisconnectReason) => {
      if (cancelled) return
      if (reason !== DisconnectReason.PARTICIPANT_REMOVED && reason !== DisconnectReason.ROOM_DELETED) return
      onLeave()
    }
    activeRoom.on(RoomEvent.Disconnected, handleDisconnected)

    const connectToRoom = async () => {
      setRoom(activeRoom)
      try {
        await activeRoom.connect(connection.serverUrl, connection.participantToken)
        if (cancelled) return

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
        if (!cancelled) {
          setConnectionError('세션 연결에 실패했습니다. 네트워크 상태를 확인해 주세요.')
        }
      }
    }

    void connectToRoom()

    return () => {
      cancelled = true
      activeRoom.off(RoomEvent.Disconnected, handleDisconnected)
      void activeRoom.disconnect()
    }
    // 최초 접속 정보로 한 번만 연결한다. 재연결이 필요한 경우는 이 화면을 다시 마운트해서 처리한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connection.serverUrl, connection.participantToken])

  return (
    <RoomContext.Provider value={room}>
      <RoomAudioRenderer />
      <StudySessionRoomStage
        initialDevices={initialDevices}
        selfCoverLetterId={selfCoverLetterId}
        connection={connection}
        connectionError={connectionError}
        onLeave={onLeave}
      />
    </RoomContext.Provider>
  )
}

interface StudySessionRoomStageProps {
  initialDevices: StudySessionRoomDeviceSelection
  selfCoverLetterId: number | null
  connection: StudySessionConnection
  connectionError: string | null
  onLeave: () => void
}

function StudySessionRoomStage({
  initialDevices,
  selfCoverLetterId,
  connection,
  connectionError,
  onLeave,
}: StudySessionRoomStageProps) {
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
      resumeSummary: '내가 선택한 이력서가 여기에 표시됩니다.',
      coverLetterTitle: selectedCoverLetter?.title ?? '선택한 자소서',
      coverLetterSummary: selectedCoverLetter
        ? `${selectedCoverLetter.title} (${selectedCoverLetter.companyName} · ${selectedCoverLetter.role})`
        : '내가 선택한 자소서가 여기에 표시됩니다.',
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
          // TODO: 실제 API 연동 필요 — 참가자별 이력서·자소서 열람 API가 생기면 제출 여부 대신 실제 내용을 채운다.
          resumeSummary:
            member?.resumeId != null
              ? '이력서를 제출했습니다. 내용 열람은 아직 제공되지 않습니다.'
              : '제출한 이력서가 없습니다.',
          coverLetterTitle:
            member?.coverLetterId != null ? '제출한 자소서' : '제출 안 함',
          coverLetterSummary:
            member?.coverLetterId != null
              ? '자소서를 제출했습니다. 내용 열람은 아직 제공되지 않습니다.'
              : '제출한 자소서가 없습니다.',
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

  const [panelOpen, setPanelOpen] = useState(false)
  const [micGain, setMicGain] = useState(initialDevices.micGain)
  const [speakerMuted, setSpeakerMuted] = useState(false)
  const [speakerVolume, setSpeakerVolume] = useState(initialDevices.speakerVolume)
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false)
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
  const dragIdRef = useRef<number | null>(null)
  const videoAreaRef = useRef<HTMLDivElement>(null)
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

  // 방장이 나가면 세션 자체를 종료한다 — 참가자만 따로 나가는 API는 없고, 방장이 없는 세션을 계속
  // 유지할 방법도 없기 때문이다. 종료 요청이 실패하면 나가기를 진행하지 않고 재시도할 수 있게 한다.
  const handleConfirmLeave = async () => {
    if (!isHost) {
      setLeaveDialogOpen(false)
      onLeave()
      return
    }

    setLeaving(true)
    setLeaveError(null)
    try {
      await endStudySession(connection.sessionId)
      setLeaveDialogOpen(false)
      onLeave()
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
            {connectionError ? (
              <div className="absolute inset-x-4 top-4 z-30 rounded-ait-s bg-status-error px-4 py-2 text-center text-body-2 text-white shadow-elevation-2">
                {connectionError}
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
              onClick={() => setLeaveDialogOpen(true)}
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
            <StudySessionSidePanel participants={participants} />
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
    </div>
  )
}
