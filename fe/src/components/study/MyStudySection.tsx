import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/useAuth'
import { useInView } from '@/lib/useInView'
import { cn } from '@/lib/utils'
import { getStudyGroupDetail, type MyStudyGroup } from '@/api/study-groups'

interface MyStudySectionProps {
  studies: MyStudyGroup[]
  isLoading: boolean
  errorMessage: string | null
  onOpenStudy: (study: MyStudyGroup) => void
}

const MAX_VISIBLE_AVATARS = 4

// 로그인 사용자가 참여 중인 스터디 목록을 보여주고 그룹 페이지로 연결한다.
export function MyStudySection({
  studies,
  isLoading,
  errorMessage,
  onOpenStudy,
}: MyStudySectionProps) {
  const { ref, isInView } = useInView<HTMLElement>({ threshold: 0.1 })
  const { user } = useAuth()
  const currentUserId = user?.userId ?? null
  // 목록 응답(/me/all)에는 owner 여부가 없어 그룹당 상세 조회로 보충한다.
  const [ownerIdByGroup, setOwnerIdByGroup] = useState<Record<number, number>>({})

  useEffect(() => {
    let isActive = true

    void Promise.all(
      studies.map((study) =>
        getStudyGroupDetail(study.id)
          .then((detail) => [study.id, detail.ownerId] as const)
          .catch(() => null),
      ),
    ).then((results) => {
      if (!isActive) return
      setOwnerIdByGroup(
        Object.fromEntries(results.filter((result) => result !== null)),
      )
    })

    return () => {
      isActive = false
    }
  }, [studies])

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
                      {/* TODO: 실제 API 연동 필요 — 그룹의 활성 세션 조회 엔드포인트가 없어 항상 비활성(회색)으로 표시한다. */}
                      <span
                        className="size-2 shrink-0 rounded-ait-pill bg-status-neutral"
                        aria-hidden="true"
                      />
                      <h3 className="truncate text-body-1 font-semibold text-text-primary">
                        {study.title}
                      </h3>
                    </div>
                    <p className="mt-2 truncate text-caption text-text-secondary">
                      {study.description}
                    </p>
                  </div>

                  {ownerIdByGroup[study.id] !== undefined ? (
                    <span
                      className={cn(
                        'shrink-0 rounded-ait-s border px-3 py-1 text-caption',
                        ownerIdByGroup[study.id] === currentUserId
                          ? 'border-status-achievement-border bg-status-achievement-surface text-action-primary'
                          : 'border-border-default bg-background-default text-text-secondary',
                      )}
                    >
                      {ownerIdByGroup[study.id] === currentUserId
                        ? '그룹장'
                        : '그룹원'}
                    </span>
                  ) : null}
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

                  <Button
                    type="button"
                    variant="secondary"
                    className="cta-lift pointer-events-auto"
                    onClick={() => onOpenStudy(study)}
                  >
                    {/* TODO: 실제 API 연동 필요 — 활성 세션 조회가 없어 항상 비활성으로 가정한다.
                        그룹장은 세션을 새로 만들 수 있어 "세션 생성하기"로 안내하고, 그룹원은
                        직접 만들 수 없어 그룹 페이지로 안내한다. */}
                    {ownerIdByGroup[study.id] === currentUserId
                      ? '세션 생성하기'
                      : '그룹 페이지'}
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
