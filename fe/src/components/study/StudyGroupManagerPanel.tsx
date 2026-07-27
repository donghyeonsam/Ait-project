import { LockKeyhole } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StudyGroupManagerPanelProps {
  applicantCount: number
  isRecruiting: boolean
  onRecruitingChange: (isRecruiting: boolean) => void
  onReviewApplications: () => void
  onDeleteGroup: () => void
}

// 그룹장이 모집 상태와 가입 신청, 그룹 삭제 행동을 관리한다.
export function StudyGroupManagerPanel({
  applicantCount,
  isRecruiting,
  onRecruitingChange,
  onReviewApplications,
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
            'inline-flex rounded-ait-pill border p-0.5 transition-colors',
            isRecruiting
              ? 'border-status-success-border bg-status-success-surface'
              : 'border-status-error-border bg-status-error-surface',
          )}
          role="group"
          aria-label="모집 상태 변경"
        >
          <button
            type="button"
            aria-pressed={isRecruiting}
            onClick={() => onRecruitingChange(true)}
            className={cn(
              'rounded-ait-pill px-3 py-1 text-caption transition-colors',
              isRecruiting
                ? 'bg-surface-default font-semibold text-status-success shadow-elevation-1'
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
              'rounded-ait-pill px-3 py-1 text-caption transition-colors',
              !isRecruiting
                ? 'bg-surface-default font-semibold text-status-error shadow-elevation-1'
                : 'text-text-secondary',
            )}
          >
            모집 완료
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={onReviewApplications}
        className="mt-3 inline-flex items-center gap-3 rounded-ait-s text-body-2 text-text-primary hover:text-action-primary"
      >
        가입 신청 검토
        <span className="inline-flex size-5 items-center justify-center rounded-ait-pill bg-status-error text-caption font-semibold text-surface-default">
          {applicantCount}
        </span>
      </button>

      <div className="mt-3 flex justify-end">
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
