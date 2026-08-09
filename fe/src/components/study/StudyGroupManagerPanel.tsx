import { LockKeyhole, UserRoundCog } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StudyGroupManagerPanelProps {
  applicantCount: number
  isRecruiting: boolean
  onRecruitingChange: (isRecruiting: boolean) => void
  onReviewApplications: () => void
  onTransferLeadership: () => void
  onDeleteGroup: () => void
}

// 그룹장이 모집 상태와 가입 신청, 권한 위임, 그룹 삭제 행동을 관리한다.
export function StudyGroupManagerPanel({
  applicantCount,
  isRecruiting,
  onRecruitingChange,
  onReviewApplications,
  onTransferLeadership,
  onDeleteGroup,
}: StudyGroupManagerPanelProps) {
  return (
    <aside className="rounded-ait-m border border-border-default bg-surface-default p-4 shadow-elevation-1">
      <h2 className="flex items-center gap-2 text-body-1 font-semibold text-text-primary">
        <LockKeyhole className="size-4" aria-hidden="true" />
        관리자 메뉴
      </h2>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <span className="text-body-2 text-text-primary">모집 상태 변경</span>
        <div
          className={cn(
            'relative inline-grid grid-cols-2 rounded-ait-pill border p-0.5 transition-[background-color,border-color] [transition-duration:var(--duration-base)] [transition-timing-function:var(--easing-standard)]',
            isRecruiting
              ? 'border-status-success-border bg-status-success-surface'
              : 'border-status-error-border bg-status-error-surface',
          )}
          role="group"
          aria-label="모집 상태 변경"
        >
          <span
            className={cn(
              'study-recruitment-indicator pointer-events-none absolute bottom-0.5 left-0.5 top-0.5 w-[calc(50%_-_0.125rem)] rounded-ait-pill bg-surface-default shadow-elevation-1 transition-transform [transition-duration:var(--duration-base)] [transition-timing-function:var(--easing-emphasized)]',
              !isRecruiting && 'translate-x-full',
            )}
            aria-hidden="true"
          />
          <button
            type="button"
            aria-pressed={isRecruiting}
            onClick={() => onRecruitingChange(true)}
            className={cn(
              'relative rounded-ait-pill px-3 py-1 text-caption font-semibold transition-colors [transition-duration:var(--duration-base)]',
              isRecruiting
                ? 'text-status-success'
                : 'text-text-secondary',
            )}
          >
            모집 중
          </button>
          <button
            type="button"
            aria-pressed={!isRecruiting}
            onClick={() => onRecruitingChange(false)}
            className={cn(
              'relative rounded-ait-pill px-3 py-1 text-caption font-semibold transition-colors [transition-duration:var(--duration-base)]',
              !isRecruiting
                ? 'text-status-error'
                : 'text-text-secondary',
            )}
          >
            모집 완료
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
        <button
          type="button"
          onClick={onReviewApplications}
          className="inline-flex items-center gap-3 rounded-ait-s text-body-2 text-text-primary hover:text-action-primary"
        >
          가입 신청 검토
          <span className="inline-flex size-5 items-center justify-center rounded-ait-pill bg-status-error text-caption font-semibold text-surface-default">
            {applicantCount}
          </span>
        </button>
      </div>

      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={onTransferLeadership}
          className="inline-flex items-center gap-1 rounded-ait-s border border-action-primary px-3 py-1 text-caption font-medium text-action-primary transition-colors hover:bg-status-info-surface"
        >
          <UserRoundCog className="size-3.5" aria-hidden="true" />
          그룹장 위임
        </button>
        <button
          type="button"
          onClick={onDeleteGroup}
          className="rounded-ait-s border border-status-error-border px-3 py-1 text-caption font-medium text-status-error transition-colors hover:bg-status-error-surface"
        >
          그룹 삭제
        </button>
      </div>
    </aside>
  )
}
