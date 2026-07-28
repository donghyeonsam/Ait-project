import {
  useState,
  type AnimationEvent,
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type TransitionEvent,
} from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type StudyRole =
  | '프론트엔드'
  | '백엔드'
  | 'AI'
  | '서버'
  | 'DATA'
  | 'INFRA'
  | 'PM/PO'
  | 'PT면접'
  | '인성면접'

export type RecruitmentStatus = '모집 중' | '마감 임박' | '신청 대기' | '마감'

export interface StudyCardData {
  id: number
  title: string
  description: string
  recruitmentStatus: RecruitmentStatus
  capacity: number
  /** 정렬 기준. 서버의 createdAt(ISO 문자열)을 그대로 쓴다. */
  createdAt: string
  // 아래 항목은 스터디 그룹 목록 응답에 아직 없어서, 값이 있을 때만 렌더한다.
  role?: StudyRole
  badgeLabel?: string
  currentMembers?: number
  schedule?: string[]
  activities?: string[]
}

interface StudyCardProps {
  study: StudyCardData
  isApplied: boolean
  onApply: (study: StudyCardData) => void
  index?: number
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
// 일정·활동은 서버 응답에 없을 수 있어, 그때는 잘려 있던 소개 전문을 대신 펼쳐 보여준다.
export function StudyCardExpandedContent({
  study,
}: StudyCardExpandedContentProps) {
  const schedule = study.schedule ?? []
  const activities = study.activities ?? []

  if (schedule.length === 0 && activities.length === 0) {
    return (
      <div className="px-4 pb-20 pt-4 text-body-2 text-text-primary">
        <p className="font-semibold">스터디 소개</p>
        <p className="study-expand-item mt-1 whitespace-pre-line text-text-secondary">
          {study.description}
        </p>
      </div>
    )
  }

  return (
    <div className="px-4 pb-20 pt-4 text-body-2 text-text-primary">
      {schedule.length > 0 ? (
        <div>
          <p className="font-semibold">정기모임 일정</p>
          <ul className="mt-1 list-disc space-y-1 pl-6">
            {schedule.map((item, itemIndex) => (
              <li
                key={item}
                className="study-expand-item"
                style={{ '--item-order': itemIndex } as CSSProperties}
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {activities.length > 0 ? (
        <div className="mt-3">
          <p className="font-semibold">주요 활동</p>
          <ul className="mt-1 list-disc space-y-1 pl-6">
            {activities.map((activity, itemIndex) => (
              <li
                key={activity}
                className="study-expand-item"
                style={
                  {
                    '--item-order': schedule.length + itemIndex,
                  } as CSSProperties
                }
              >
                {activity}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

// 고정된 그리드 셀 위에서 세부 정보가 겹쳐 펼쳐지는 스터디 카드다.
export function StudyCard({
  study,
  isApplied,
  onApply,
  index = 0,
}: StudyCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isExpansionComplete, setIsExpansionComplete] = useState(false)
  // 진입 스태거가 끝나면 래퍼의 잔여 transform(스태킹 컨텍스트)을 없애
  // hover 확장이 이웃 카드 위로 겹칠 수 있게 한다.
  const [hasEntered, setHasEntered] = useState(false)
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

  const handleEntranceEnd = (event: AnimationEvent<HTMLElement>) => {
    if (
      event.target === event.currentTarget &&
      event.animationName === 'study-card-enter'
    ) {
      setHasEntered(true)
    }
  }

  return (
    <div
      onAnimationEnd={handleEntranceEnd}
      style={{ '--card-order': index } as CSSProperties}
      className={cn(
        'relative h-40 transition-[height] [transition-duration:var(--duration-base)] [transition-timing-function:var(--easing-emphasized)]',
        !hasEntered && 'study-card-enter',
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
          'group absolute inset-x-0 top-0 overflow-hidden rounded-ait-m border border-border-default bg-surface-default shadow-elevation-1 transition-[height,transform,box-shadow] [transition-duration:var(--duration-base)] [transition-timing-function:var(--easing-emphasized)]',
          isExpanded
            ? 'z-[var(--z-index-dropdown)] h-[22rem] -translate-y-1 shadow-elevation-2'
            : 'h-40',
        )}
      >
        <div className="p-4 pb-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              {study.role ? (
                <span
                  className={cn(
                    'inline-flex h-6 w-[63px] shrink-0 items-center justify-center whitespace-nowrap rounded-[3px] px-1 text-center text-[10px] leading-none transition-transform [transition-duration:var(--duration-fast)] [transition-timing-function:var(--easing-standard)] group-hover:-translate-y-0.5',
                    roleBadgeClasses[study.role],
                  )}
                >
                  {study.badgeLabel ?? study.role}
                </span>
              ) : null}
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
            {study.currentMembers === undefined
              ? `정원 ${study.capacity}명`
              : `${study.currentMembers}/${study.capacity}명`}
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
