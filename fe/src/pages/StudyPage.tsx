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
import {
  loadAppliedStudyIds,
  saveAppliedStudyIds,
} from '@/lib/applied-study-storage'
import { addNotificationListener } from '@/lib/notification-stream'
import { useAuth } from '@/lib/useAuth'
import { useInView } from '@/lib/useInView'
import { cn } from '@/lib/utils'

// 더보기 클릭마다 받아오는 페이지 크기. 서버 목록 API의 기본 페이지 크기(6)와 맞춘다.
const GROUPS_PAGE_SIZE = 6
// 검색어 입력마다 서버에 바로 요청하지 않고 타이핑이 멎을 때까지 기다리는 지연 시간.
const SEARCH_DEBOUNCE_MS = 300

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

// 서버가 상태값으로 모집 필터를 받으므로 화면 필터를 그 값으로 옮긴다.
function toStatusParam(filter: RecruitmentFilter): StudyGroupStatus | undefined {
  if (filter === 'recruiting') return 'RECRUITING'
  if (filter === 'active') return 'ACTIVE'
  return undefined
}

// 스터디 탐색부터 신청, 그룹 대화까지 라운지 UI 흐름을 조합한다.
export function StudyPage() {
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuth()
  const currentUserId = user?.userId ?? null
  const [query, setQuery] = useState('')
  // 검색어는 debouncedQuery로 지연시켜서, 타이핑마다 서버에 요청이 나가지 않게 한다.
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [recruitment, setRecruitment] = useState<RecruitmentFilter>('all')
  const [sort, setSort] = useState<StudySort>('latest')
  const [groups, setGroups] = useState<StudyGroupListItem[]>([])
  const [totalGroupCount, setTotalGroupCount] = useState(0)
  const [groupPage, setGroupPage] = useState(0)
  const [hasMoreGroups, setHasMoreGroups] = useState(false)
  const [isLoadingGroups, setIsLoadingGroups] = useState(true)
  const [isLoadingMoreGroups, setIsLoadingMoreGroups] = useState(false)
  const [groupsError, setGroupsError] = useState<string | null>(null)
  // 검색·필터가 바뀌지 않아도 목록을 다시 받아야 할 때(재시도, 가입 승인 등) 이 값을 올려 effect를 재실행시킨다.
  const [groupsReloadKey, setGroupsReloadKey] = useState(0)
  const [myStudies, setMyStudies] = useState<MyStudyGroup[]>([])
  const [isLoadingMyStudies, setIsLoadingMyStudies] = useState(true)
  const [myStudiesError, setMyStudiesError] = useState<string | null>(null)
  const [activeSessionGroupIds, setActiveSessionGroupIds] = useState<
    Set<number>
  >(() => new Set())
  // 신청 완료 표시는 새로고침 후에도 유지되도록 localStorage 값으로 시작한다.
  const [appliedStudyIds, setAppliedStudyIds] = useState<Set<number>>(() =>
    currentUserId === null ? new Set() : loadAppliedStudyIds(currentUserId),
  )
  const [toast, setToast] = useState<
    { message: string; variant: 'success' | 'error' } | null
  >(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [applicationTarget, setApplicationTarget] =
    useState<StudyCardData | null>(null)
  const { ref: heroRef, isInView: isHeroInView } = useInView<HTMLElement>({
    threshold: 0.1,
  })
  const { ref: searchRef, isInView: isSearchInView } = useInView<HTMLElement>({
    threshold: 0.05,
  })

  useEffect(() => {
    const timer = window.setTimeout(
      () => setDebouncedQuery(query.trim()),
      SEARCH_DEBOUNCE_MS,
    )
    return () => window.clearTimeout(timer)
  }, [query])

  // 검색어·모집 상태·정렬·재시도 요청이 바뀔 때마다 1페이지부터 새로 받아온다.
  useEffect(() => {
    let isActive = true

    const loadGroups = async () => {
      setIsLoadingGroups(true)
      try {
        const result = await getStudyGroups({
          status: toStatusParam(recruitment),
          keyword: debouncedQuery || undefined,
          sortBy: sort,
          page: 0,
          size: GROUPS_PAGE_SIZE,
        })
        if (!isActive) return
        setGroups(result.content)
        setTotalGroupCount(result.totalElements)
        setGroupPage(0)
        setHasMoreGroups(!result.last)
        setGroupsError(null)
      } catch (error) {
        if (!isActive) return
        setGroups([])
        setTotalGroupCount(0)
        setHasMoreGroups(false)
        setGroupsError(toErrorMessage(error))
      } finally {
        if (isActive) setIsLoadingGroups(false)
      }
    }

    void loadGroups()

    return () => {
      isActive = false
    }
  }, [debouncedQuery, recruitment, sort, groupsReloadKey])

  // 다음 페이지를 이어 붙인다. 검색·필터가 바뀌면 위 effect가 목록을 통째로 새로 받으므로 여기서는 신경 쓰지 않는다.
  const loadMoreGroups = () => {
    if (isLoadingMoreGroups || !hasMoreGroups) return
    setIsLoadingMoreGroups(true)
    const nextPage = groupPage + 1
    getStudyGroups({
      status: toStatusParam(recruitment),
      keyword: debouncedQuery || undefined,
      sortBy: sort,
      page: nextPage,
      size: GROUPS_PAGE_SIZE,
    })
      .then((result) => {
        setGroups((current) => [...current, ...result.content])
        setGroupPage(nextPage)
        setHasMoreGroups(!result.last)
      })
      .catch((error: unknown) => {
        setToast({ message: toErrorMessage(error), variant: 'error' })
      })
      .finally(() => setIsLoadingMoreGroups(false))
  }

  const loadMyStudies = useCallback(
    () =>
      getMyStudyGroups()
        .then((studies) => {
          setMyStudies(studies)
          setMyStudiesError(null)
          // 승인되어 내 스터디가 된 그룹은 저장된 신청 기록에서 걷어내 계속 쌓이지 않게 한다.
          if (currentUserId !== null) {
            const joinedIds = new Set(studies.map((study) => study.id))
            const storedIds = loadAppliedStudyIds(currentUserId)
            const remainingIds = new Set(
              [...storedIds].filter((groupId) => !joinedIds.has(groupId)),
            )
            if (remainingIds.size !== storedIds.size) {
              saveAppliedStudyIds(currentUserId, remainingIds)
            }
          }
        })
        .catch((error: unknown) => {
          setMyStudies([])
          setMyStudiesError(toErrorMessage(error))
        })
        .finally(() => setIsLoadingMyStudies(false)),
    [currentUserId],
  )

  useEffect(() => {
    void loadMyStudies()
  }, [loadMyStudies])

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

  // 승인·거절 알림이 오면 신청 완료 표시를 걷어내고, 승인이면 내 스터디 목록과 찾기 목록을 함께 갱신한다.
  // (가입한 그룹은 서버가 찾기 목록에서 자동으로 제외하므로 목록을 다시 받아야 화면에서 빠진다.)
  useEffect(() => {
    if (currentUserId === null) return
    return addNotificationListener((item) => {
      if (item.type !== 'GROUP_APPROVE' && item.type !== 'GROUP_REJECT') return
      setAppliedStudyIds((current) => {
        if (!current.has(item.targetId)) return current
        const next = new Set(current)
        next.delete(item.targetId)
        saveAppliedStudyIds(currentUserId, next)
        return next
      })
      if (item.type === 'GROUP_APPROVE') {
        void loadMyStudies()
        setGroupsReloadKey((key) => key + 1)
      }
    })
  }, [currentUserId, loadMyStudies])

  const studyCards = useMemo(() => groups.map(toStudyCard), [groups])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 3500)
    return () => window.clearTimeout(timer)
  }, [toast])

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
      setAppliedStudyIds((currentIds) => {
        const next = new Set(currentIds).add(target.id)
        if (currentUserId !== null) saveAppliedStudyIds(currentUserId, next)
        return next
      })
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
            총 {totalGroupCount}개의 스터디
          </p>
        </div>

        <StudySearchFilters
          query={query}
          recruitment={recruitment}
          sort={sort}
          onQueryChange={setQuery}
          onRecruitmentChange={setRecruitment}
          onSortChange={setSort}
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
              onClick={() => setGroupsReloadKey((key) => key + 1)}
            >
              다시 시도
            </Button>
          </div>
        ) : (
          <>
            <StudyCardGrid
              studies={studyCards}
              appliedStudyIds={appliedStudyIds}
              onApply={openApplicationDialog}
            />

            {hasMoreGroups ? (
              <div className="mt-8 flex justify-center">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={loadMoreGroups}
                  disabled={isLoadingMoreGroups}
                  aria-busy={isLoadingMoreGroups}
                >
                  {isLoadingMoreGroups ? '불러오는 중' : '더보기'}
                </Button>
              </div>
            ) : null}
          </>
        )}
      </section>

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
