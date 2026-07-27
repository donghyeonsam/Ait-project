import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { PageLayout } from '@/components/layout/PageLayout'
import { StudyApplicationModal } from '@/components/study/StudyApplicationModal'
import { StudyCalendar } from '@/components/study/StudyCalendar'
import { StudyChatFloatingButton } from '@/components/study/StudyChatFloatingButton'
import { StudyChatModal } from '@/components/study/StudyChatModal'
import { StudyGroupChatPanel } from '@/components/study/StudyGroupChatPanel'
import { StudyGroupManagerPanel } from '@/components/study/StudyGroupManagerPanel'
import { StudyGroupMemberPanel } from '@/components/study/StudyGroupMemberPanel'
import { StudyHeroGlow } from '@/components/study/StudyHeroGlow'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useInView } from '@/lib/useInView'
import { cn } from '@/lib/utils'
import {
  mockMyStudies,
  mockStudyCalendarEvents,
  mockStudyChatGroups,
  mockStudyGroupMembers,
  type StudyGroupMember,
} from '@/mocks/study-lounge'

// 선택한 마이 스터디의 운영 정보, 구성원, 채팅과 일정을 조합한다.
export function StudyGroupPage() {
  const { studyId } = useParams()
  const navigate = useNavigate()
  const study = mockMyStudies.find(
    (candidate) => candidate.id === Number(studyId),
  )
  const [members, setMembers] = useState<StudyGroupMember[]>(() =>
    (mockStudyGroupMembers[Number(studyId)] ?? []).map((member) => ({
      ...member,
    })),
  )
  const [isRecruiting, setIsRecruiting] = useState(true)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [isApplicationModalOpen, setIsApplicationModalOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [memberToRemove, setMemberToRemove] =
    useState<StudyGroupMember | null>(null)
  const { ref: headerRef, isInView: isHeaderInView } =
    useInView<HTMLDivElement>({ threshold: 0.1 })
  const { ref: panelsRef, isInView: isPanelsInView } =
    useInView<HTMLDivElement>({ threshold: 0.05 })

  if (!study) {
    return <Navigate to="/study" replace />
  }

  const isLeader = study.role === '그룹장'
  const chatGroup =
    mockStudyChatGroups[study.id === 101 ? 0 : 1] ?? mockStudyChatGroups[0]
  const calendarEvents = mockStudyCalendarEvents[study.id] ?? []

  const inviteMember = (nickname: string) => {
    if (members.length >= study.capacity) return
    // TODO: 실제 API 연동 필요 — 닉네임 초대 성공 후 구성원/초대 대기 목록을 갱신한다.
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

  const removeMember = (memberId: number) => {
    // TODO: 실제 API 연동 필요 — 내보내기 성공 응답 후 구성원 목록을 갱신한다.
    setMembers((currentMembers) =>
      currentMembers.filter((member) => member.id !== memberId),
    )
  }

  const confirmMemberRemoval = () => {
    if (!memberToRemove) return
    removeMember(memberToRemove.id)
    setMemberToRemove(null)
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
              {study.title}
            </h1>
            <p className="mt-3 text-body-2 text-text-secondary">
              {study.description}
            </p>
            <p className="mt-2 text-caption text-chart-axis">
              구성원 {members.length}/{study.capacity} · 생성일 {study.createdAt}{' '}
              · 그룹장 {study.leaderName}
            </p>

            <div
              className={cn(
                'mt-6 flex flex-wrap items-center justify-between gap-4 rounded-ait-m border p-4',
                study.isLive
                  ? 'study-live-banner border-status-success bg-status-success-surface'
                  : 'border-border-default bg-background-default',
              )}
            >
              <div>
                <p
                  className={`flex items-center gap-3 text-body-1 font-semibold ${
                    study.isLive
                      ? 'text-status-success'
                      : 'text-text-primary'
                  }`}
                >
                  <span
                    className={`size-2 rounded-ait-pill ${
                      study.isLive
                        ? 'status-live-dot bg-status-success'
                        : 'bg-status-neutral'
                    }`}
                    aria-hidden="true"
                  />
                  {study.meetingState}
                </p>
                <p className="mt-1 pl-5 text-caption text-text-secondary">
                  {study.isLive
                    ? '지금 바로 참여할 수 있어요.'
                    : '예정된 세션 시간을 확인해 주세요.'}
                </p>
              </div>
              <Button asChild className="cta-lift text-white">
                <Link to="/study/session/prejoin">
                  {study.isLive ? '세션 참여하기' : '세션 준비하기'}
                </Link>
              </Button>
            </div>
          </div>

          {isLeader ? (
            <div className="self-end">
              <StudyGroupManagerPanel
                applicantCount={2}
                isRecruiting={isRecruiting}
                onRecruitingChange={setIsRecruiting}
                onReviewApplications={() => setIsApplicationModalOpen(true)}
                onDeleteGroup={() => setIsDeleteDialogOpen(true)}
              />
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
            capacity={study.capacity}
            canManage={isLeader}
            onRemoveMember={(memberId) => {
              const selectedMember = members.find(
                (member) => member.id === memberId,
              )
              if (selectedMember) setMemberToRemove(selectedMember)
            }}
            onInviteMember={inviteMember}
          />
          <StudyGroupChatPanel group={chatGroup} />
        </div>

        <div className="my-6 border-t border-status-achievement" />
        <StudyCalendar events={calendarEvents} />
      </section>

      <StudyChatFloatingButton
        unreadCount={42}
        onClick={() => setIsChatOpen(true)}
      />
      <StudyChatModal open={isChatOpen} onOpenChange={setIsChatOpen} />

      <StudyApplicationModal
        open={isApplicationModalOpen}
        onOpenChange={setIsApplicationModalOpen}
      />

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
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
          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              취소
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => navigate('/study', { replace: true })}
            >
              그룹 삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={memberToRemove !== null}
        onOpenChange={(open) => {
          if (!open) setMemberToRemove(null)
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
          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setMemberToRemove(null)}
            >
              취소
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmMemberRemoval}
            >
              내보내기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  )
}
