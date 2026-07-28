import { ChevronDown } from 'lucide-react'
import { useEffect, useState } from 'react'
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
  getStudyGroupApplications,
  processStudyGroupApplication,
  type StudyGroupApplication,
} from '@/api/study-groups'
import { toErrorMessage } from '@/api/http'

interface StudyApplicationModalProps {
  groupId: number
  open: boolean
  onOpenChange: (open: boolean) => void
  onApplicationProcessed?: () => void
}

type ApplicationResult = 'approved' | 'rejected'

// 그룹장이 가입 신청 내용을 펼쳐 보고 승인 또는 거절 상태를 처리한다.
export function StudyApplicationModal({
  groupId,
  open,
  onOpenChange,
  onApplicationProcessed,
}: StudyApplicationModalProps) {
  const [applications, setApplications] = useState<StudyGroupApplication[]>([])
  const [results, setResults] = useState<Record<number, ApplicationResult>>({})
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [processingId, setProcessingId] = useState<number | null>(null)
  const [processError, setProcessError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return

    let isActive = true

    getStudyGroupApplications(groupId)
      .then((fetchedApplications) => {
        if (!isActive) return
        setApplications(fetchedApplications)
        setExpandedId(fetchedApplications[0]?.applicationId ?? null)
        setResults({})
        setLoadError(null)
      })
      .catch((error: unknown) => {
        if (!isActive) return
        setApplications([])
        setLoadError(toErrorMessage(error))
      })
      .finally(() => {
        if (isActive) setIsLoading(false)
      })

    return () => {
      isActive = false
    }
  }, [open, groupId])

  const processApplication = async (
    applicationId: number,
    isApprove: boolean,
  ) => {
    setProcessingId(applicationId)
    setProcessError(null)

    try {
      await processStudyGroupApplication(groupId, applicationId, isApprove)
      setResults((current) => ({
        ...current,
        [applicationId]: isApprove ? 'approved' : 'rejected',
      }))
      onApplicationProcessed?.()
    } catch (error) {
      setProcessError(toErrorMessage(error))
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100svh-2rem)] w-[min(47rem,calc(100vw-2rem))] overflow-y-auto border border-border-default p-4 sm:p-6">
        <DialogHeader className="pr-12">
          <DialogTitle>가입 신청</DialogTitle>
          <DialogDescription className="sr-only">
            스터디 가입 신청자의 소개를 확인하고 승인하거나 거절합니다.
          </DialogDescription>
        </DialogHeader>

        {processError ? (
          <p className="mt-4 text-caption text-status-error" role="alert">
            {processError}
          </p>
        ) : null}

        {isLoading ? (
          <p className="mt-6 text-body-2 text-text-secondary" role="status">
            가입 신청 목록을 불러오고 있어요...
          </p>
        ) : loadError ? (
          <p className="mt-6 text-body-2 text-status-error" role="alert">
            {loadError}
          </p>
        ) : applications.length === 0 ? (
          <p className="mt-6 text-body-2 text-text-secondary">
            대기 중인 가입 신청이 없습니다.
          </p>
        ) : (
          <div className="mt-6 space-y-4">
            {applications.map((application) => {
              const isExpanded = application.applicationId === expandedId
              const result = results[application.applicationId]
              const isProcessing = processingId === application.applicationId

              return (
                <article
                  key={application.applicationId}
                  className="overflow-hidden rounded-ait-m border border-border-default bg-surface-default"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedId((currentId) =>
                        currentId === application.applicationId
                          ? null
                          : application.applicationId,
                      )
                    }
                    aria-expanded={isExpanded}
                    aria-controls={`application-${application.applicationId}-details`}
                    className="flex w-full items-center gap-3 p-4 text-left"
                  >
                    <Avatar className="size-10">
                      <AvatarFallback className="border-0 bg-profile-avatar text-transparent">
                        신청자
                      </AvatarFallback>
                    </Avatar>
                    <p className="min-w-0 flex-1 truncate text-body-1 text-text-primary">
                      <span className="font-medium">
                        {application.nickname}
                      </span>
                    </p>
                    {result ? (
                      <span
                        className={cn(
                          'shrink-0 rounded-ait-s border px-3 py-1 text-caption font-medium',
                          result === 'approved'
                            ? 'border-status-success-border bg-status-success-surface text-status-success'
                            : 'border-status-error-border bg-status-error-surface text-status-error',
                        )}
                      >
                        {result === 'approved' ? '승인 완료' : '거절 완료'}
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
                    id={`application-${application.applicationId}-details`}
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
                          {application.message}
                        </p>

                        {!result ? (
                          <div className="mt-6 flex justify-end gap-3">
                            <button
                              type="button"
                              disabled={isProcessing}
                              onClick={() =>
                                void processApplication(
                                  application.applicationId,
                                  true,
                                )
                              }
                              className="rounded-ait-s border border-status-success-border bg-status-success-surface px-4 py-2 text-body-2 font-semibold text-status-success transition-shadow hover:shadow-elevation-1 disabled:opacity-50"
                            >
                              승인
                            </button>
                            <button
                              type="button"
                              disabled={isProcessing}
                              onClick={() =>
                                void processApplication(
                                  application.applicationId,
                                  false,
                                )
                              }
                              className="rounded-ait-s border border-status-error-border bg-surface-default px-4 py-2 text-body-2 font-semibold text-status-error transition-shadow hover:bg-status-error-surface disabled:opacity-50"
                            >
                              거절
                            </button>
                          </div>
                        ) : (
                          <p
                            className={cn(
                              'mt-6 text-right text-body-2 font-medium',
                              result === 'approved'
                                ? 'text-status-success'
                                : 'text-status-error',
                            )}
                            role="status"
                          >
                            {result === 'approved'
                              ? `${application.nickname}님의 가입을 승인했습니다.`
                              : `${application.nickname}님의 가입을 거절했습니다.`}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
