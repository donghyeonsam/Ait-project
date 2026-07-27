import {
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type TransitionEvent,
} from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type {
  RecruitmentStatus,
  StudyCardData,
  StudyRole,
} from '@/mocks/study-lounge'

interface StudyCardProps {
  study: StudyCardData
  isApplied: boolean
  onApply: (study: StudyCardData) => void
}

const roleBadgeClasses: Record<StudyRole, string> = {
  프론트엔드: 'bg-tag-fe-surface text-tag-fe',
  백엔드: 'bg-tag-be-surface text-tag-be',
  AI: 'bg-tag-ai-surface text-tag-ai',
  서버: 'bg-status-info-surface text-status-info',
  DATA: 'bg-status-success-surface text-tag-data',
  INFRA: 'bg-status-neutral-surface text-tag-infra',
  'PM/PO': 'bg-tag-pm-surface text-tag-pm',
  PT면접: 'bg-status-achievement-surface text-action-primary',
  인성면접: 'bg-status-neutral-surface text-text-secondary',
}

const statusClasses: Record<RecruitmentStatus, string> = {
  '모집 중': 'text-status-success',
  '마감 임박': 'text-status-success',
  '신청 대기': 'text-status-warning',
  마감: 'text-text-secondary',
}

interface StudyCardExpandedContentProps {
  study: StudyCardData
}

// 카드가 확장됐을 때 일정과 주요 활동을 짧게 보충한다.
export function StudyCardExpandedContent({
  study,
}: StudyCardExpandedContentProps) {
  return (
    <div className="px-4 pb-20 pt-4 text-body-2 text-text-primary">
      <div>
        <p className="font-semibold">정기모임 일정</p>
        <ul className="mt-1 list-disc space-y-1 pl-6">
          {study.schedule.map((schedule) => (
            <li key={schedule}>{schedule}</li>
          ))}
        </ul>
      </div>

      <div className="mt-3">
        <p className="font-semibold">주요 활동</p>
        <ul className="mt-1 list-disc space-y-1 pl-6">
          {study.activities.map((activity) => (
            <li key={activity}>{activity}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}

// 고정된 그리드 셀 위에서 세부 정보가 겹쳐 펼쳐지는 스터디 카드다.
export function StudyCard({ study, isApplied, onApply }: StudyCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isExpansionComplete, setIsExpansionComplete] = useState(false)
  const isClosed = study.recruitmentStatus === '마감'

  const expandCard = () => {
    if (isExpanded) return

    setIsExpanded(true)
    setIsExpansionComplete(
      typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    )
  }

  const collapseCard = () => {
    setIsExpansionComplete(false)
    setIsExpanded(false)
  }

  const toggleCard = () => {
    if (isExpanded) {
      collapseCard()
      return
    }

    expandCard()
  }

  const handleMouseLeave = (event: MouseEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(document.activeElement)) {
      collapseCard()
    }
  }

  const handleBlur = (event: FocusEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      collapseCard()
    }
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      toggleCard()
    }
  }

  const handleTransitionEnd = (event: TransitionEvent<HTMLElement>) => {
    if (
      event.target === event.currentTarget &&
      event.propertyName === 'height' &&
      isExpanded
    ) {
      setIsExpansionComplete(true)
    }
  }

  return (
    <div
      className={cn(
        'relative h-40 transition-[height] [transition-duration:var(--duration-base)] [transition-timing-function:var(--easing-emphasized)]',
        isExpanded && 'max-md:h-[22rem]',
      )}
    >
      <article
        tabIndex={0}
        aria-expanded={isExpanded}
        aria-label={`${study.title} 상세 정보`}
        onMouseEnter={expandCard}
        onMouseLeave={handleMouseLeave}
        onFocusCapture={expandCard}
        onBlurCapture={handleBlur}
        onKeyDown={handleKeyDown}
        onTransitionEnd={handleTransitionEnd}
        onClick={(event) => {
          if ((event.target as HTMLElement).closest('button')) return
          toggleCard()
        }}
        className={cn(
          'absolute inset-x-0 top-0 overflow-hidden rounded-ait-m border border-border-default bg-surface-default shadow-elevation-1 transition-[height,transform,box-shadow] [transition-duration:var(--duration-base)] [transition-timing-function:var(--easing-emphasized)]',
          isExpanded
            ? 'z-[var(--z-index-dropdown)] h-[22rem] -translate-y-1 shadow-elevation-2'
            : 'h-40',
        )}
      >
        <div className="p-4 pb-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className={cn(
                  'inline-flex h-6 w-[63px] shrink-0 items-center justify-center whitespace-nowrap rounded-[3px] px-1 text-center text-[10px] leading-none',
                  roleBadgeClasses[study.role],
                )}
              >
                {study.badgeLabel ?? study.role}
              </span>
              {study.recruitmentStatus === '마감 임박' ? (
                <span className="inline-flex h-6 w-[63px] shrink-0 items-center justify-center whitespace-nowrap rounded-[3px] border border-[#B20000] bg-[#FFF4F4] px-1 text-[10px] font-medium leading-none text-[#B20000]">
                  마감 임박
                </span>
              ) : null}
            </div>

            <span
              className={cn(
                'shrink-0 text-caption font-medium',
                statusClasses[study.recruitmentStatus],
              )}
            >
              {study.recruitmentStatus === '마감 임박'
                ? '모집 중'
                : study.recruitmentStatus}
            </span>
          </div>

          <h3 className="mt-3 truncate text-body-1 font-semibold text-text-primary">
            {study.title}
          </h3>
          <p className="mt-1 truncate text-caption text-chart-axis">
            {study.description}
          </p>
        </div>

        {isExpanded ? <StudyCardExpandedContent study={study} /> : null}

        <div className="absolute inset-x-4 bottom-4 flex items-center justify-between gap-4">
          <span className="text-caption text-chart-axis">
            {study.membersLabel ??
              `${study.currentMembers}/${study.capacity}명`}
          </span>
          {isExpansionComplete ? (
            <Button
              type="button"
              variant="secondary"
              className="px-4 py-2 font-normal"
              disabled={isClosed || isApplied}
              onClick={() => onApply(study)}
            >
              {isClosed ? '마감됨' : isApplied ? '신청 완료' : '신청하기'}
            </Button>
          ) : null}
        </div>
      </article>
    </div>
  )
}
