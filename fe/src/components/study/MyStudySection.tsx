import { Link } from 'react-router-dom'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { useInView } from '@/lib/useInView'
import { cn } from '@/lib/utils'
import type { MyStudyData } from '@/mocks/study-lounge'

interface MyStudySectionProps {
  studies: MyStudyData[]
  onEnterStudy: (study: MyStudyData) => void
  onManageApplications: () => void
}

// 로그인 사용자가 참여 중인 스터디와 바로 실행할 행동을 보여준다.
export function MyStudySection({
  studies,
  onEnterStudy,
  onManageApplications,
}: MyStudySectionProps) {
  const { ref, isInView } = useInView<HTMLElement>({ threshold: 0.1 })

  return (
    <section
      ref={ref}
      className={cn('study-reveal', isInView && 'is-visible')}
      aria-labelledby="my-study-title"
    >
      <h2 id="my-study-title" className="text-h3 text-text-primary">
        마이 스터디
      </h2>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {studies.map((study) => (
          <article
            key={study.id}
            className="group relative flex min-h-36 flex-col rounded-ait-m border border-border-default bg-surface-default p-6 shadow-elevation-1 transition-[transform,box-shadow] [transition-duration:var(--duration-fast)] [transition-timing-function:var(--easing-standard)] hover:-translate-y-0.5 hover:shadow-elevation-2"
          >
            <Link
              to={`/study/groups/${study.id}`}
              className="absolute inset-0 rounded-ait-m"
              aria-label={`${study.title} 그룹 페이지로 이동`}
            />

            <div className="pointer-events-none relative z-10 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <span
                    className={`size-2 shrink-0 rounded-ait-pill ${
                      study.isLive
                        ? 'status-live-dot bg-status-success'
                        : 'bg-status-neutral-border'
                    }`}
                    aria-hidden="true"
                  />
                  <h3 className="truncate text-body-1 font-semibold text-text-primary">
                    {study.title}
                  </h3>
                </div>
                <p
                  className={`mt-2 text-caption ${
                    study.isLive
                      ? 'font-medium text-status-success'
                      : 'text-text-secondary'
                  }`}
                >
                  {study.meetingState}
                </p>
              </div>

              {study.role === '그룹장' ? (
                <button
                  type="button"
                  onClick={onManageApplications}
                  className="pointer-events-auto shrink-0 rounded-ait-s border border-status-achievement-border bg-status-achievement-surface px-3 py-1 text-caption font-medium text-action-primary transition-shadow hover:shadow-elevation-1"
                  aria-label={`${study.title} 가입 신청 관리`}
                >
                  그룹장
                </button>
              ) : (
                <span className="shrink-0 rounded-ait-s border border-border-default bg-background-default px-3 py-1 text-caption text-text-secondary">
                  그룹원
                </span>
              )}
            </div>

            <div className="pointer-events-none relative z-10 mt-6 flex flex-wrap items-end justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex -space-x-2" aria-label={`${study.visibleAvatars}명 참여 중`}>
                  {Array.from({ length: study.visibleAvatars }, (_, index) => (
                    <Avatar
                      key={`${study.id}-avatar-${index + 1}`}
                      className="size-9 border-2 border-surface-default"
                    >
                      <AvatarFallback className="border-0 bg-profile-avatar text-transparent">
                        참여자
                      </AvatarFallback>
                    </Avatar>
                  ))}
                </div>
                {study.hiddenMembers ? (
                  <span className="text-caption text-text-secondary">
                    +{study.hiddenMembers}
                  </span>
                ) : null}
                <span className="text-caption text-text-secondary">
                  {study.currentMembers}/{study.capacity}명
                </span>
              </div>

              <Button
                type="button"
                variant={study.isLive ? 'primary' : 'secondary'}
                className="cta-lift pointer-events-auto"
                onClick={() => onEnterStudy(study)}
              >
                입장하기
              </Button>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
