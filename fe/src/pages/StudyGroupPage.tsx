import { ArrowLeft } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PageLayout } from '@/components/layout/PageLayout'
import { StudyApplicationModal } from '@/components/study/StudyApplicationModal'
import { StudyCalendar } from '@/components/study/StudyCalendar'
import { StudyChatFloatingButton } from '@/components/study/StudyChatFloatingButton'
import { StudyChatModal } from '@/components/study/StudyChatModal'
import { StudyGroupChatPanel } from '@/components/study/StudyGroupChatPanel'
import { StudyGroupManagerPanel } from '@/components/study/StudyGroupManagerPanel'
import {
  StudyGroupMemberPanel,
  type StudyGroupMember,
} from '@/components/study/StudyGroupMemberPanel'
import { StudyHeroGlow } from '@/components/study/StudyHeroGlow'
import { StudyLeaderTransferDialog } from '@/components/study/StudyLeaderTransferDialog'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  getMyStudyGroups,
  getStudyGroupApplications,
  getStudyGroupDetail,
  kickStudyGroupMember,
  updateStudyGroupStatus,
  type StudyGroupDetail,
} from '@/api/study-groups'
import { toErrorMessage } from '@/api/http'
import { getStudyGroupActiveSession } from '@/api/study-sessions'
import { useAuth } from '@/lib/useAuth'
import { useInView } from '@/lib/useInView'
import { cn } from '@/lib/utils'

function formatCreatedAt(value: string) {
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleDateString('ko-KR')
}

// 선택한 스터디 그룹의 운영 정보와 구성원을 서버에서 불러오고, 채팅·일정 UI를 함께 조합한다.
export function StudyGroupPage() {
  const { studyId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const groupId = Number(studyId)

  const isValidGroupId = Number.isInteger(groupId) && groupId > 0

  const [detail, setDetail] = useState<StudyGroupDetail | null>(null)
  const [members, setMembers] = useState<StudyGroupMember[]>([])
  const [isLoading, setIsLoading] = useState(isValidGroupId)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isRecruiting, setIsRecruiting] = useState(true)
  const [statusError, setStatusError] = useState<string | null>(null)
  const [hasActiveSession, setHasActiveSession] = useState(false)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [unreadChatCount, setUnreadChatCount] = useState(0)
  const [isApplicationModalOpen, setIsApplicationModalOpen] = useState(false)
  const [applicantCount, setApplicantCount] = useState(0)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isLeaderTransferDialogOpen, setIsLeaderTransferDialogOpen] =
    useState(false)
  const [transferredLeaderName, setTransferredLeaderName] = useState<
    string | null
  >(null)
  const [memberToRemove, setMemberToRemove] =
    useState<StudyGroupMember | null>(null)
  const [isRemovingMember, setIsRemovingMember] = useState(false)
  const [memberRemovalError, setMemberRemovalError] = useState<string | null>(
    null,
  )
  const [isDeletingGroup, setIsDeletingGroup] = useState(false)
  const [groupDeleteError, setGroupDeleteError] = useState<string | null>(null)
  const { ref: headerRef, isInView: isHeaderInView } =
    useInView<HTMLDivElement>({ threshold: 0.1 })
  const { ref: panelsRef, isInView: isPanelsInView } =
    useInView<HTMLDivElement>({ threshold: 0.05 })

  const currentUserId = user?.userId ?? null

  useEffect(() => {
    if (!isValidGroupId) return

    let isActive = true

    // 모집 상태는 그룹 상세 응답에 없어서 내 스터디 목록에서 같은 그룹을 찾아 채운다.
    Promise.all([
      getStudyGroupDetail(groupId),
      getMyStudyGroups().catch(() => []),
    ])
      .then(([groupDetail, myGroups]) => {
        if (!isActive) return
        setDetail(groupDetail)
        setMembers(
          groupDetail.members.map((member) => ({
            id: member.userId,
            name: member.name,
            role: member.owner ? '그룹장' : '그룹원',
            isSelf: member.userId === currentUserId,
          })),
        )
        setIsRecruiting(
          myGroups.find((group) => group.id === groupId)?.groupStatus ===
            'RECRUITING',
        )
        setLoadError(null)
      })
      .catch((error: unknown) => {
        if (!isActive) return
        setLoadError(toErrorMessage(error))
      })
      .finally(() => {
        if (isActive) setIsLoading(false)
      })

    return () => {
      isActive = false
    }
  }, [groupId, currentUserId, isValidGroupId])

  // 세션 진행 여부는 그룹 상세 응답에 없어 활성 세션 조회로 따로 채운다. 실패하면 비활성으로 둔다.
  useEffect(() => {
    if (!isValidGroupId) return

    let isActive = true
    getStudyGroupActiveSession(groupId)
      .then((session) => {
        if (isActive) setHasActiveSession(session.hasActiveSession)
      })
      .catch(() => {
        if (isActive) setHasActiveSession(false)
      })

    return () => {
      isActive = false
    }
  }, [groupId, isValidGroupId])

  // 신청 목록 API는 방장만 호출할 수 있어 방장이 아닐 때는 요청하지 않는다.
  const loadApplicantCount = useCallback(() => {
    if (!detail || detail.ownerId !== currentUserId) return

    getStudyGroupApplications(groupId)
      .then((applications) => setApplicantCount(applications.length))
      .catch(() => {})
  }, [groupId, detail, currentUserId])

  useEffect(() => {
    loadApplicantCount()
  }, [loadApplicantCount])

  const handleIncomingChatMessage = useCallback(() => {
    setUnreadChatCount((count) => count + 1)
  }, [])

  const handleChatOpenChange = (open: boolean) => {
    setIsChatOpen(open)
    setUnreadChatCount(0)
  }

  if (!isValidGroupId) {
    return (
      <PageLayout contentClassName="max-w-dashboard px-4 sm:px-8">
        <div className="flex flex-col items-center gap-4 py-24 text-center">
          <p className="text-body-1 text-status-error" role="alert">
            올바르지 않은 스터디 그룹입니다.
          </p>
          <Button type="button" variant="secondary" onClick={() => navigate('/study')}>
            스터디 라운지로 이동
          </Button>
        </div>
      </PageLayout>
    )
  }

  if (isLoading) {
    return (
      <PageLayout contentClassName="max-w-dashboard px-4 sm:px-8">
        <p className="py-24 text-center text-body-1 text-text-secondary" role="status">
          스터디 그룹 정보를 불러오고 있어요...
        </p>
      </PageLayout>
    )
  }

  if (loadError || !detail) {
    return (
      <PageLayout contentClassName="max-w-dashboard px-4 sm:px-8">
        <div className="flex flex-col items-center gap-4 py-24 text-center">
          <p className="text-body-1 text-status-error" role="alert">
            {loadError ?? '스터디 그룹을 찾을 수 없습니다.'}
          </p>
          <Button type="button" variant="secondary" onClick={() => navigate('/study')}>
            스터디 라운지로 이동
          </Button>
        </div>
      </PageLayout>
    )
  }

  const isLeader =
    currentUserId !== null &&
    detail.ownerId === currentUserId &&
    transferredLeaderName === null
  const leaderName =
    transferredLeaderName ??
    detail.members.find((member) => member.owner)?.name ??
    '알 수 없음'
  const leaderCandidates = members.filter(
    (member) => !member.isSelf && member.role !== '초대 대기',
  )

  const changeRecruiting = async (nextIsRecruiting: boolean) => {
    const previous = isRecruiting
    setIsRecruiting(nextIsRecruiting)
    setStatusError(null)

    try {
      // 모집 완료는 그룹 종료(CLOSED)가 아니라 "모집만 끝난 활동 중" 상태(ACTIVE)에 대응한다.
      await updateStudyGroupStatus(
        groupId,
        nextIsRecruiting ? 'RECRUITING' : 'ACTIVE',
      )
    } catch (error) {
      setIsRecruiting(previous)
      setStatusError(toErrorMessage(error))
    }
  }

  // 세션 생성과 참여의 진입점이 같다. 입장 전 화면이 활성 세션 여부를 보고 생성할지 참여할지 가른다.
  const enterSession = () => {
    navigate(`/study/groups/${groupId}/session/prejoin`)
  }

  const inviteMember = (nickname: string) => {
    if (members.length >= detail.capacity) return
    // TODO: 실제 API 연동 필요 — 초대 엔드포인트가 없어 화면에서만 대기 항목을 추가한다.
    setMembers((currentMembers) => [
      ...currentMembers,
      {
        id: Date.now(),
        name: nickname,
        role: '초대 대기',
        isSelf: false,
      },
    ])
  }

  const dropMemberFromView = (memberId: number) => {
    setMembers((currentMembers) =>
      currentMembers.filter((member) => member.id !== memberId),
    )
    setDetail((currentDetail) =>
      currentDetail === null
        ? currentDetail
        : {
            ...currentDetail,
            currentMemberCount: Math.max(currentDetail.currentMemberCount - 1, 0),
            members: currentDetail.members.filter(
              (member) => member.userId !== memberId,
            ),
          },
    )
  }

  const confirmMemberRemoval = async () => {
    if (!memberToRemove) return
    const target = memberToRemove

    // 초대 대기는 초대 API가 없어 화면에만 존재하는 항목이라 서버에 요청할 대상이 없다.
    if (target.role === '초대 대기') {
      setMembers((currentMembers) =>
        currentMembers.filter((member) => member.id !== target.id),
      )
      setMemberToRemove(null)
      return
    }

    setIsRemovingMember(true)
    setMemberRemovalError(null)

    try {
      await kickStudyGroupMember(groupId, target.id)
      dropMemberFromView(target.id)
      setMemberToRemove(null)
    } catch (error) {
      setMemberRemovalError(toErrorMessage(error))
    } finally {
      setIsRemovingMember(false)
    }
  }

  // 그룹 삭제는 BE가 논리 삭제라 상태를 CLOSED로 바꾸는 것으로 처리한다.
  const confirmGroupDeletion = async () => {
    setIsDeletingGroup(true)
    setGroupDeleteError(null)
    try {
      await updateStudyGroupStatus(groupId, 'CLOSED')
      navigate('/study', { replace: true })
    } catch (error) {
      setGroupDeleteError(toErrorMessage(error))
      setIsDeletingGroup(false)
    }
  }

  const transferLeadership = (memberId: number) => {
    const nextLeader = members.find((member) => member.id === memberId)
    if (!nextLeader || nextLeader.isSelf || nextLeader.role === '초대 대기') {
      return
    }

    // TODO: 실제 API 연동 필요 — 위임 엔드포인트가 없어 화면에서만 그룹장을 바꾼다.
    setMembers((currentMembers) =>
      currentMembers.map((member) =>
        member.id === memberId
          ? { ...member, role: `${member.role} · 그룹장` }
          : member,
      ),
    )
    setTransferredLeaderName(nextLeader.name)
  }

  return (
    <PageLayout contentClassName="relative isolate max-w-dashboard px-4 sm:px-8">
      <StudyHeroGlow />
      <section className="py-8" aria-labelledby="study-group-title">
        <Link
          to="/study"
          className="inline-flex items-center gap-1 rounded-ait-s py-2 text-caption text-text-secondary transition-colors hover:text-action-primary"
        >
          <ArrowLeft className="size-3" aria-hidden="true" />
          스터디 라운지
        </Link>

        <div
          ref={headerRef}
          className={cn(
            'study-reveal mt-10 grid gap-6',
            isLeader && 'lg:grid-cols-[minmax(0,1fr)_29rem]',
            isHeaderInView && 'is-visible',
          )}
        >
          <div>
            <h1 id="study-group-title" className="text-h1 text-text-primary">
              {detail.title}
            </h1>
            <p className="mt-3 text-body-2 text-text-secondary">
              {detail.description}
            </p>
            <p className="mt-2 text-caption text-chart-axis">
              구성원 {detail.currentMemberCount}/{detail.capacity} · 생성일{' '}
              {formatCreatedAt(detail.createdAt)} · 그룹장 {leaderName}
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-ait-m border border-border-default bg-background-default p-4">
              <div>
                <p className="flex items-center gap-3 text-body-1 font-semibold text-text-primary">
                  <span
                    className={cn(
                      'size-2 rounded-ait-pill',
                      hasActiveSession
                        ? 'bg-status-success'
                        : 'bg-status-neutral',
                    )}
                    role="img"
                    aria-label={
                      hasActiveSession ? '세션 진행 중' : '진행 중인 세션 없음'
                    }
                  />
                  화상 스터디 세션
                </p>
                <p className="mt-1 pl-5 text-caption text-text-secondary">
                  {hasActiveSession
                    ? '진행 중인 세션이 있어요. 지금 참여할 수 있어요.'
                    : isLeader
                      ? '세션을 시작하면 그룹원이 참여할 수 있어요.'
                      : '그룹장이 세션을 시작하면 참여할 수 있어요.'}
                </p>
              </div>
              {hasActiveSession || isLeader ? (
                <Button
                  type="button"
                  className="cta-lift text-white"
                  onClick={enterSession}
                >
                  {hasActiveSession ? '세션 참여하기' : '세션 시작하기'}
                </Button>
              ) : null}
            </div>
          </div>

          {isLeader ? (
            <div className="self-end">
              <StudyGroupManagerPanel
                applicantCount={applicantCount}
                isRecruiting={isRecruiting}
                onRecruitingChange={(next) => void changeRecruiting(next)}
                onReviewApplications={() => setIsApplicationModalOpen(true)}
                onTransferLeadership={() =>
                  setIsLeaderTransferDialogOpen(true)
                }
                onDeleteGroup={() => setIsDeleteDialogOpen(true)}
              />
              {statusError ? (
                <p className="mt-2 text-caption text-status-error" role="alert">
                  {statusError}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        <div
          ref={panelsRef}
          className={cn(
            'study-reveal mt-4 grid items-stretch gap-6 lg:grid-cols-2',
            isPanelsInView && 'is-visible',
          )}
        >
          <StudyGroupMemberPanel
            members={members}
            capacity={detail.capacity}
            canManage={isLeader}
            onRemoveMember={(memberId) => {
              const selectedMember = members.find(
                (member) => member.id === memberId,
              )
              if (selectedMember) setMemberToRemove(selectedMember)
            }}
            onInviteMember={inviteMember}
          />
          <StudyGroupChatPanel
            groupId={groupId}
            currentUserId={currentUserId}
            isOwner={isLeader}
            initialNotice={detail.notice}
            onIncomingMessage={handleIncomingChatMessage}
          />
        </div>

        <div className="my-6 border-t border-status-achievement" />
        <StudyCalendar groupId={groupId} />
      </section>

      <StudyChatFloatingButton
        unreadCount={unreadChatCount}
        onClick={() => handleChatOpenChange(true)}
      />
      <StudyChatModal open={isChatOpen} onOpenChange={handleChatOpenChange} />

      <StudyApplicationModal
        groupId={groupId}
        open={isApplicationModalOpen}
        onOpenChange={setIsApplicationModalOpen}
        onApplicationProcessed={loadApplicantCount}
      />

      <StudyLeaderTransferDialog
        open={isLeaderTransferDialogOpen}
        candidates={leaderCandidates}
        onOpenChange={setIsLeaderTransferDialogOpen}
        onTransfer={transferLeadership}
      />

      <Dialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          // 삭제 요청이 진행되는 동안에는 대화상자를 닫지 않는다.
          if (!open && isDeletingGroup) return
          setIsDeleteDialogOpen(open)
          if (!open) setGroupDeleteError(null)
        }}
      >
        <DialogContent
          className="w-[min(28rem,calc(100vw-2rem))] border border-border-default p-6"
          showCloseButton={false}
        >
          <DialogHeader>
            <DialogTitle>그룹을 삭제할까요?</DialogTitle>
            <DialogDescription>
              삭제하면 이 그룹과 일정에 다시 접근할 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          {groupDeleteError ? (
            <p className="mt-4 text-body-2 text-status-error" role="alert">
              {groupDeleteError}
            </p>
          ) : null}
          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="secondary"
              disabled={isDeletingGroup}
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              취소
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeletingGroup}
              aria-busy={isDeletingGroup}
              onClick={() => void confirmGroupDeletion()}
            >
              {isDeletingGroup ? '삭제하는 중' : '그룹 삭제'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={memberToRemove !== null}
        onOpenChange={(open) => {
          if (open || isRemovingMember) return
          setMemberToRemove(null)
          setMemberRemovalError(null)
        }}
      >
        <DialogContent
          className="w-[min(28rem,calc(100vw-2rem))] border border-border-default p-6"
          showCloseButton={false}
        >
          <DialogHeader>
            <DialogTitle>
              {memberToRemove?.name} 님을 내보낼까요?
            </DialogTitle>
            <DialogDescription>
              내보내면 이 스터디 그룹과 일정에 더 이상 접근할 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          {memberRemovalError ? (
            <p className="mt-4 text-body-2 text-status-error" role="alert">
              {memberRemovalError}
            </p>
          ) : null}
          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="secondary"
              disabled={isRemovingMember}
              onClick={() => {
                setMemberToRemove(null)
                setMemberRemovalError(null)
              }}
            >
              취소
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isRemovingMember}
              aria-busy={isRemovingMember}
              onClick={() => void confirmMemberRemoval()}
            >
              {isRemovingMember ? '내보내는 중' : '내보내기'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  )
}
