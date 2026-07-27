import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import {
  mockStudyApplications,
  type StudyApplication,
} from '@/mocks/study-lounge'

interface StudyApplicationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const statusLabels: Record<StudyApplication['status'], string> = {
  pending: '검토 대기',
  approved: '승인 완료',
  rejected: '거절 완료',
}

// 그룹장이 가입 신청 내용을 펼쳐 보고 승인 또는 거절 상태를 처리한다.
export function StudyApplicationModal({
  open,
  onOpenChange,
}: StudyApplicationModalProps) {
  const [applications, setApplications] = useState<StudyApplication[]>(() =>
    mockStudyApplications.map((application) => ({ ...application })),
  )
  const [expandedId, setExpandedId] = useState<number | null>(
    mockStudyApplications[0]?.id ?? null,
  )

  const updateStatus = (
    applicationId: number,
    status: StudyApplication['status'],
  ) => {
    setApplications((currentApplications) =>
      currentApplications.map((application) =>
        application.id === applicationId
          ? { ...application, status }
          : application,
      ),
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100svh-2rem)] w-[min(47rem,calc(100vw-2rem))] overflow-y-auto border border-border-default p-4 sm:p-6">
        <DialogHeader className="pr-12">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <DialogTitle>가입 신청</DialogTitle>
            <p className="text-body-2 font-medium text-action-primary">
              금융권 면접 PT 대비
            </p>
          </div>
          <DialogDescription className="sr-only">
            스터디 가입 신청자의 소개를 확인하고 승인하거나 거절합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6 space-y-4">
          {applications.map((application) => {
            const isExpanded = application.id === expandedId
            return (
              <article
                key={application.id}
                className="overflow-hidden rounded-ait-m border border-border-default bg-surface-default"
              >
                <button
                  type="button"
                  onClick={() =>
                    setExpandedId((currentId) =>
                      currentId === application.id ? null : application.id,
                    )
                  }
                  aria-expanded={isExpanded}
                  aria-controls={`application-${application.id}-details`}
                  className="flex w-full items-center gap-3 p-4 text-left"
                >
                  <Avatar className="size-10">
                    <AvatarFallback className="border-0 bg-profile-avatar text-transparent">
                      신청자
                    </AvatarFallback>
                  </Avatar>
                  <p className="min-w-0 flex-1 truncate text-body-1 text-text-primary">
                    <span className="font-medium">{application.name}</span>
                    <span className="text-text-secondary">
                      {' '}
                      · {application.role}
                    </span>
                  </p>
                  {application.status !== 'pending' ? (
                    <span
                      className={cn(
                        'shrink-0 rounded-ait-s border px-3 py-1 text-caption font-medium',
                        application.status === 'approved'
                          ? 'border-status-success-border bg-status-success-surface text-status-success'
                          : 'border-status-error-border bg-status-error-surface text-status-error',
                      )}
                    >
                      {statusLabels[application.status]}
                    </span>
                  ) : null}
                  <ChevronDown
                    className={cn(
                      'size-5 shrink-0 text-action-primary transition-transform [transition-duration:var(--duration-base)]',
                      isExpanded && 'rotate-180 opacity-0',
                    )}
                    aria-hidden="true"
                  />
                </button>

                <div
                  id={`application-${application.id}-details`}
                  aria-hidden={!isExpanded}
                  inert={!isExpanded}
                  className={cn(
                    'grid transition-[grid-template-rows,opacity] [transition-duration:var(--duration-base)] [transition-timing-function:var(--easing-emphasized)]',
                    isExpanded
                      ? 'grid-rows-[1fr] opacity-100'
                      : 'grid-rows-[0fr] opacity-0',
                  )}
                >
                  <div className="overflow-hidden">
                    <div className="px-4 pb-4 pt-2 sm:px-12">
                      <p className="whitespace-pre-wrap text-body-1 leading-8 text-text-primary">
                        {application.introduction}
                      </p>

                      {application.status === 'pending' ? (
                        <div className="mt-6 flex justify-end gap-3">
                          <button
                            type="button"
                            onClick={() =>
                              updateStatus(application.id, 'approved')
                            }
                            className="rounded-ait-s border border-status-success-border bg-status-success-surface px-4 py-2 text-body-2 font-semibold text-status-success transition-shadow hover:shadow-elevation-1"
                          >
                            승인
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              updateStatus(application.id, 'rejected')
                            }
                            className="rounded-ait-s border border-status-error-border bg-surface-default px-4 py-2 text-body-2 font-semibold text-status-error transition-shadow hover:bg-status-error-surface"
                          >
                            거절
                          </button>
                        </div>
                      ) : (
                        <p
                          className={cn(
                            'mt-6 text-right text-body-2 font-medium',
                            application.status === 'approved'
                              ? 'text-status-success'
                              : 'text-status-error',
                          )}
                          role="status"
                        >
                          {application.status === 'approved'
                            ? `${application.name}님의 가입을 승인했습니다.`
                            : `${application.name}님의 가입을 거절했습니다.`}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
