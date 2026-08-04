import { Plus } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageLayout } from '@/components/layout/PageLayout'
import { MyStudySection } from '@/components/study/MyStudySection'
import { StudyApplicationToast } from '@/components/study/StudyApplicationToast'
import { StudyApplyDialog } from '@/components/study/StudyApplyDialog'
import type {
  RecruitmentStatus,
  StudyCardData,
} from '@/components/study/StudyCard'
import { StudyCardGrid } from '@/components/study/StudyCardGrid'
import { StudyChatFloatingButton } from '@/components/study/StudyChatFloatingButton'
import { StudyChatModal } from '@/components/study/StudyChatModal'
import { StudyCreateDialog } from '@/components/study/StudyCreateDialog'
import {
  StudySearchFilters,
  type RecruitmentFilter,
  type StudySort,
} from '@/components/study/StudySearchFilters'
import { Button } from '@/components/ui/button'
import {
  applyToStudyGroup,
  getMyStudyGroups,
  getStudyGroups,
  type MyStudyGroup,
  type StudyGroupListItem,
  type StudyGroupStatus,
} from '@/api/study-groups'
import { toErrorMessage } from '@/api/http'
import { getStudyGroupActiveSession } from '@/api/study-sessions'
import { useAuth } from '@/lib/useAuth'
import { useInView } from '@/lib/useInView'
import { cn } from '@/lib/utils'

const INITIAL_VISIBLE_STUDIES = 6
const LOAD_MORE_COUNT = 3
// 목록 API는 페이지네이션을 지원하지만 화면의 검색·정렬이 전체 목록 기준이라 한 번에 받아둔다.
const STUDY_PAGE_SIZE = 100

const recruitmentStatusByGroupStatus: Record<
  StudyGroupStatus,
  RecruitmentStatus
> = {
  RECRUITING: '모집 중',
  ACTIVE: '마감',
  CLOSED: '마감',
}

function toStudyCard(group: StudyGroupListItem): StudyCardData {
  return {
    id: group.id,
    title: group.title,
    description: group.description,
    capacity: group.capacity,
    createdAt: group.createdAt,
    recruitmentStatus: recruitmentStatusByGroupStatus[group.groupStatus],
    currentMembers: group.currentMemberCount,
  }
}

function matchesRecruitmentFilter(
  groupStatus: StudyGroupStatus,
  filter: RecruitmentFilter,
) {
  if (filter === 'all') return true
  if (filter === 'recruiting') return groupStatus === 'RECRUITING'
  if (filter === 'active') return groupStatus === 'ACTIVE'
  return groupStatus === 'CLOSED'
}

// 스터디 탐색부터 신청, 그룹 대화까지 라운지 UI 흐름을 조합한다.
export function StudyPage() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const [query, setQuery] = useState('')
  const [recruitment, setRecruitment] = useState<RecruitmentFilter>('all')
  const [sort, setSort] = useState<StudySort>('latest')
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_STUDIES)
  const [groups, setGroups] = useState<StudyGroupListItem[]>([])
  const [isLoadingGroups, setIsLoadingGroups] = useState(true)
  const [groupsError, setGroupsError] = useState<string | null>(null)
  const [myStudies, setMyStudies] = useState<MyStudyGroup[]>([])
  const [isLoadingMyStudies, setIsLoadingMyStudies] = useState(true)
  const [myStudiesError, setMyStudiesError] = useState<string | null>(null)
  const [activeSessionGroupIds, setActiveSessionGroupIds] = useState<
    Set<number>
  >(() => new Set())
  const [appliedStudyIds, setAppliedStudyIds] = useState<Set<number>>(
    () => new Set(),
  )
  const [toast, setToast] = useState<
    { message: string; variant: 'success' | 'error' } | null
  >(null)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [applicationTarget, setApplicationTarget] =
    useState<StudyCardData | null>(null)
  const { ref: heroRef, isInView: isHeroInView } = useInView<HTMLElement>({
    threshold: 0.1,
  })
  const { ref: searchRef, isInView: isSearchInView } = useInView<HTMLElement>({
    threshold: 0.05,
  })

  // 최초 로딩은 isLoadingGroups 초기값(true)이 담당하고, 재시도·갱신 시에만 호출부에서 다시 세운다.
  const loadGroups = useCallback(
    () =>
      getStudyGroups({ size: STUDY_PAGE_SIZE })
        .then((page) => {
          setGroups(page.content)
          setGroupsError(null)
        })
        .catch((error: unknown) => {
          setGroups([])
          setGroupsError(toErrorMessage(error))
        })
        .finally(() => setIsLoadingGroups(false)),
    [],
  )

  const loadMyStudies = useCallback(
    () =>
      getMyStudyGroups()
        .then((studies) => {
          setMyStudies(studies)
          setMyStudiesError(null)
        })
        .catch((error: unknown) => {
          setMyStudies([])
          setMyStudiesError(toErrorMessage(error))
        })
        .finally(() => setIsLoadingMyStudies(false)),
    [],
  )

  useEffect(() => {
    void loadGroups()
    void loadMyStudies()
  }, [loadGroups, loadMyStudies])

  // 내 스터디 목록 응답에 활성 세션 정보가 없어 그룹별로 조회해 모은다. 실패한 그룹은 비활성으로 둔다.
  useEffect(() => {
    let isActive = true
    void Promise.all(
      myStudies.map((study) =>
        getStudyGroupActiveSession(study.id)
          .then((session) => (session.hasActiveSession ? study.id : null))
          .catch(() => null),
      ),
    ).then((groupIds) => {
      if (!isActive) return
      setActiveSessionGroupIds(
        new Set(groupIds.filter((groupId): groupId is number => groupId !== null)),
      )
    })

    return () => {
      isActive = false
    }
  }, [myStudies])

  const myStudyIds = useMemo(
    () => new Set(myStudies.map((study) => study.id)),
    [myStudies],
  )

  const filteredStudies = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('ko-KR')
    const matched = groups.filter((group) => {
      if (myStudyIds.has(group.id)) return false

      const matchesQuery =
        !normalizedQuery ||
        [group.title, group.description].some((value) =>
          value.toLocaleLowerCase('ko-KR').includes(normalizedQuery),
        )

      return (
        matchesQuery && matchesRecruitmentFilter(group.groupStatus, recruitment)
      )
    })

    return matched
      .map(toStudyCard)
      .toSorted((first, second) => {
        const difference =
          new Date(second.createdAt).getTime() -
          new Date(first.createdAt).getTime()
        return sort === 'oldest' ? -difference : difference
      })
  }, [groups, myStudyIds, query, recruitment, sort])

  const visibleStudies = filteredStudies.slice(0, visibleCount)

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 3500)
    return () => window.clearTimeout(timer)
  }, [toast])

  const resetVisibleCount = () => setVisibleCount(INITIAL_VISIBLE_STUDIES)

  // 로그인 세션이 없으면 신청 다이얼로그를 열지 않고 로그인 화면으로 보낸다.
  const openApplicationDialog = (study: StudyCardData) => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: '/study' } })
      return
    }
    setApplicationTarget(study)
  }

  const completeApplication = async (message: string) => {
    if (!applicationTarget) return
    const target = applicationTarget
    setApplicationTarget(null)

    try {
      await applyToStudyGroup(target.id, message)
      setAppliedStudyIds((currentIds) => new Set(currentIds).add(target.id))
      setToast({ message: '스터디 신청을 보냈습니다.', variant: 'success' })
    } catch (error) {
      setToast({ message: toErrorMessage(error), variant: 'error' })
    }
  }

  return (
    <PageLayout contentClassName="page-content-zoom-90 relative isolate max-w-dashboard px-4 sm:px-8">
      <section
        ref={heroRef}
        className={cn(
          'study-reveal flex flex-col gap-6 py-10 sm:flex-row sm:items-start sm:justify-between',
          isHeroInView && 'is-visible',
        )}
        aria-labelledby="page-title"
      >
        <div>
          <h1 id="page-title" className="text-h1 text-text-primary">
            면접스터디
          </h1>
          <p className="mt-2 text-body-2 text-text-secondary">
            함께 연습하고, 실전처럼 준비해요.
          </p>
        </div>

        <Button
          type="button"
          className="self-start"
          onClick={() => setIsCreateDialogOpen(true)}
        >
          <Plus className="size-4" aria-hidden="true" />
          스터디 만들기
        </Button>
      </section>

      <MyStudySection
        studies={myStudies}
        isLoading={isLoadingMyStudies}
        errorMessage={myStudiesError}
        activeSessionGroupIds={activeSessionGroupIds}
        onEnterSession={(study) =>
          navigate(`/study/groups/${study.id}/session/prejoin`)
        }
      />

      <section
        ref={searchRef}
        className={cn(
          'study-reveal mb-16 mt-8 border-t border-status-achievement pt-6',
          isSearchInView && 'is-visible',
        )}
        aria-labelledby="study-search-title"
      >
        <div className="flex flex-wrap items-baseline gap-3">
          <h2 id="study-search-title" className="text-h3 text-text-primary">
            스터디 찾기
          </h2>
          <p className="text-caption text-text-secondary">
            총 {filteredStudies.length}개의 스터디
          </p>
        </div>

        <StudySearchFilters
          query={query}
          recruitment={recruitment}
          sort={sort}
          onQueryChange={(value) => {
            setQuery(value)
            resetVisibleCount()
          }}
          onRecruitmentChange={(value) => {
            setRecruitment(value)
            resetVisibleCount()
          }}
          onSortChange={(value) => {
            setSort(value)
            resetVisibleCount()
          }}
        />

        {isLoadingGroups ? (
          <p className="mt-8 text-body-2 text-text-secondary" role="status">
            스터디 목록을 불러오고 있어요...
          </p>
        ) : groupsError ? (
          <div className="mt-8 flex flex-col items-center gap-3 rounded-ait-m border border-border-default bg-background-default p-8 text-center">
            <p className="text-body-2 text-status-error" role="alert">
              {groupsError}
            </p>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsLoadingGroups(true)
                void loadGroups()
              }}
            >
              다시 시도
            </Button>
          </div>
        ) : (
          <>
            <StudyCardGrid
              studies={visibleStudies}
              appliedStudyIds={appliedStudyIds}
              onApply={openApplicationDialog}
            />

            {visibleCount < filteredStudies.length ? (
              <div className="mt-8 flex justify-center">
                <Button
                  type="button"
                  variant="secondary"
                  className="min-w-56"
                  onClick={() =>
                    setVisibleCount((count) => count + LOAD_MORE_COUNT)
                  }
                >
                  <Plus className="size-4" aria-hidden="true" />
                  더보기
                </Button>
              </div>
            ) : null}
          </>
        )}
      </section>

      <StudyChatFloatingButton
        open={isChatOpen}
        onClick={() => setIsChatOpen((current) => !current)}
      />
      <StudyChatModal open={isChatOpen} onOpenChange={setIsChatOpen} />
      <StudyCreateDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onCreated={(groupId) => {
          navigate(`/study/groups/${groupId}`)
        }}
      />
      <StudyApplyDialog
        study={applicationTarget}
        open={applicationTarget !== null}
        onOpenChange={(open) => {
          if (!open) setApplicationTarget(null)
        }}
        onSubmit={completeApplication}
      />
      {toast ? (
        <StudyApplicationToast
          message={toast.message}
          variant={toast.variant}
          onClose={() => setToast(null)}
        />
      ) : null}
    </PageLayout>
  )
}
