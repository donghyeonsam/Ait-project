import { Link } from 'react-router-dom'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { useInView } from '@/lib/useInView'
import { cn } from '@/lib/utils'
import type { MyStudyGroup } from '@/api/study-groups'

interface MyStudySectionProps {
  studies: MyStudyGroup[]
  isLoading: boolean
  errorMessage: string | null
  activeSessionGroupIds: Set<number>
  onEnterSession: (study: MyStudyGroup) => void
}

const MAX_VISIBLE_AVATARS = 4

// 로그인 사용자가 참여 중인 스터디 목록을 보여주고 그룹 페이지로 연결한다.
export function MyStudySection({
  studies,
  isLoading,
  errorMessage,
  activeSessionGroupIds,
  onEnterSession,
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

      {isLoading ? (
        <p className="mt-6 text-body-2 text-text-secondary" role="status">
          참여 중인 스터디를 불러오고 있어요...
        </p>
      ) : errorMessage ? (
        <p className="mt-6 text-body-2 text-status-error" role="alert">
          {errorMessage}
        </p>
      ) : studies.length === 0 ? (
        <p className="mt-6 text-body-2 text-text-secondary">
          아직 참여 중인 스터디가 없어요. 아래에서 스터디를 찾아보세요.
        </p>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {studies.map((study) => {
            const hasActiveSession = activeSessionGroupIds.has(study.id)
            const visibleAvatars = Math.min(
              study.currentMemberCount,
              MAX_VISIBLE_AVATARS,
            )
            const hiddenMembers = Math.max(
              study.currentMemberCount - MAX_VISIBLE_AVATARS,
              0,
            )

            return (
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
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'size-2 shrink-0 rounded-ait-pill',
                          hasActiveSession
                            ? 'bg-status-success'
                            : 'bg-status-neutral',
                        )}
                        role="img"
                        aria-label={
                          hasActiveSession
                            ? '세션 진행 중'
                            : '진행 중인 세션 없음'
                        }
                      />
                      <h3 className="truncate text-body-1 font-semibold text-text-primary">
                        {study.title}
                      </h3>
                    </div>
                    <p className="mt-2 truncate text-caption text-text-secondary">
                      {study.description}
                    </p>
                  </div>

                  {study.owner ? (
                    <span className="shrink-0 rounded-ait-s border border-status-achievement-border bg-status-achievement-surface px-3 py-1 text-caption font-medium text-action-primary">
                      그룹장
                    </span>
                  ) : (
                    <span className="shrink-0 rounded-ait-s border border-border-default bg-background-default px-3 py-1 text-caption text-text-secondary">
                      그룹원
                    </span>
                  )}
                </div>

                <div className="pointer-events-none relative z-10 mt-6 flex flex-wrap items-end justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div
                      className="flex -space-x-2"
                      aria-label={`${study.currentMemberCount}명 참여 중`}
                    >
                      {Array.from({ length: visibleAvatars }, (_, index) => (
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
                    {hiddenMembers ? (
                      <span className="text-caption text-text-secondary">
                        +{hiddenMembers}
                      </span>
                    ) : null}
                    <span className="text-caption text-text-secondary">
                      {study.currentMemberCount}/{study.capacity}명
                    </span>
                  </div>

                  {/* 그룹장은 세션이 없어도 프리조인에서 새로 시작할 수 있어 항상 눌러볼 수 있다.
                      그룹원은 참여할 세션이 있을 때만 의미가 있으므로, 왼쪽 상태 점과 같은 기준
                      (활성 세션 여부)으로 버튼을 활성/비활성화해 상태를 그대로 드러낸다. */}
                  <Button
                    type="button"
                    variant="secondary"
                    className="cta-lift pointer-events-auto"
                    disabled={!study.owner && !hasActiveSession}
                    onClick={() => onEnterSession(study)}
                  >
                    {study.owner && !hasActiveSession ? '세션 시작하기' : '세션 참여하기'}
                  </Button>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
