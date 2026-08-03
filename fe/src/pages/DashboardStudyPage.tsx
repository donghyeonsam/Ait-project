import { AlertCircle, Users, UsersRound } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  getPeerFeedbackList,
  type PeerFeedbackSessionSummary,
} from '@/api/peer-feedback'
import { getMyStudyGroups, type MyStudyGroup } from '@/api/study-groups'
import { getStudySessionStatus } from '@/api/study-sessions'
import { toErrorMessage } from '@/api/http'
import { ScoreTrendChart } from '@/components/dashboard/ScoreTrendChart'
import { StudyRecordItem } from '@/components/dashboard/StudyRecordItem'
import { StudySessionReportModal } from '@/components/dashboard/StudySessionReportModal'
import { PageLayout } from '@/components/layout/PageLayout'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { ScoreTrendPoint, StudyRecord } from '@/types/dashboard'
import { cn } from '@/lib/utils'

interface StudyDashboardNavState {
  /** 방금 나온 세션. 다른 참가자 평가가 아직 안 모였을 수 있어 "평가 수집중" 상태로 먼저 보여준다. */
  justLeftSessionId?: number
  justLeftGroupId?: number
}

const TREND_POINT_COUNT = 7
// 세션 종료 웹훅 처리 전까지는 폴링으로 "평가 수집중" 상태가 풀렸는지 확인한다.
const PENDING_POLL_INTERVAL_MS = 10_000

// 서버 생성 시각을 'YYYY. MM. DD.' 형식으로 표시한다.
function formatRecordDate(value: string) {
  const date = new Date(value)
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}. ${mm}. ${dd}.`
}

// 그룹별 직전 세션과의 점수 차를 계산해 화면 기록으로 바꾼다.
// TODO: 실제 API 연동 필요 — 응답에 groupId가 없어 sessionTitle(그룹명)을 그룹 구분 키로 대신 쓴다.
function toStudyRecords(items: PeerFeedbackSessionSummary[]): StudyRecord[] {
  const groupKeyOf = (item: PeerFeedbackSessionSummary) => item.groupId ?? item.sessionTitle

  const byGroup = new Map<string | number, PeerFeedbackSessionSummary[]>()
  for (const item of items) {
    const key = groupKeyOf(item)
    const list = byGroup.get(key)
    if (list) {
      list.push(item)
    } else {
      byGroup.set(key, [item])
    }
  }

  const deltaBySessionId = new Map<number, number>()
  const roundBySessionId = new Map<number, number>()
  for (const list of byGroup.values()) {
    const ascending = [...list].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    ascending.forEach((item, index) => {
      deltaBySessionId.set(
        item.sessionId,
        index > 0 ? item.scoreAvg - ascending[index - 1].scoreAvg : 0,
      )
      roundBySessionId.set(item.sessionId, index + 1)
    })
  }

  return [...items]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((item) => ({
      sessionId: item.sessionId,
      groupId: item.groupId,
      groupTitle: item.sessionTitle,
      date: formatRecordDate(item.createdAt),
      score: item.scoreAvg,
      delta: deltaBySessionId.get(item.sessionId) ?? 0,
      round: roundBySessionId.get(item.sessionId) ?? 1,
      status: 'completed' as const,
    }))
}

// 이 페이지의 두 상단 카드는 지난 주 대비 같은 비교값이 없어, 카운트업 애니메이션이 붙은
// StatCard 대신 라벨·값만 보여주는 단순한 카드를 쓴다.
function SimpleStatCard({
  icon,
  label,
  value,
  className,
}: {
  icon: ReactNode
  label: string
  value: ReactNode
  className?: string
}) {
  return (
    <article
      className={cn(
        'flex items-center rounded-ait-m border border-border-default bg-background-default p-4 shadow-elevation-1 lg:p-6',
        className,
      )}
    >
      <div className="flex items-center gap-4">
        <span
          className="flex size-14 shrink-0 items-center justify-center rounded-ait-pill bg-status-neutral-surface text-action-primary"
          aria-hidden="true"
        >
          {icon}
        </span>
        <div className="min-w-0">
          <p className="truncate text-body-2 text-text-secondary">{label}</p>
          <p className="mt-1 truncate text-h3 font-semibold text-text-primary">{value}</p>
        </div>
      </div>
    </article>
  )
}

// 대시보드의 스터디 화면. 세션에서 받은 상호평가를 세션별 점수 추이·기록 리스트로 보여주고,
// 리포트 보기를 누르면 세션 상세(종합 점수·역량 레이더·AI 총평·팀원별 평가) 모달을 띄운다.
export function DashboardStudyPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [records, setRecords] = useState<StudyRecord[]>([])
  const [loadState, setLoadState] = useState<'loading' | 'error' | 'loaded'>('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [requestKey, setRequestKey] = useState(0)
  const [myGroups, setMyGroups] = useState<MyStudyGroup[]>([])
  const [pendingSession, setPendingSession] = useState<
    { sessionId: number; groupId?: number } | null
  >(null)
  const [groupFilter, setGroupFilter] = useState<number | 'all'>('all')
  const [sortOrder, setSortOrder] = useState<'latest' | 'oldest'>('latest')
  const [selectedRecord, setSelectedRecord] = useState<StudyRecord | null>(null)
  const [reportOpen, setReportOpen] = useState(false)
  const consumedNavState = useRef(false)

  useEffect(() => {
    let cancelled = false

    getPeerFeedbackList()
      .then(async (result) => {
        if (cancelled) return
        const initialRecords = toStudyRecords(result)
        setRecords(initialRecords)
        setLoadState('loaded')

        // 목록에는 팀원 한 명만 먼저 평가를 남겨도 세션이 잡히므로, 세션이 실제로 완전히
        // 종료됐는지 다시 확인해 아직이면 점수·리포트를 감추고 "평가 수집중"으로 되돌린다.
        const statuses = await Promise.all(
          initialRecords.map((record) =>
            getStudySessionStatus(record.sessionId).catch(() => null),
          ),
        )
        if (cancelled) return

        const endedBySessionId = new Map(
          initialRecords
            .map((record, index) => [record.sessionId, statuses[index]?.ended] as const)
            .filter(([, ended]) => ended !== undefined),
        )

        setRecords((current) =>
          current.map((record) =>
            endedBySessionId.get(record.sessionId) === false
              ? { ...record, status: 'collecting', score: 0, delta: 0 }
              : record,
          ),
        )
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setErrorMessage(toErrorMessage(error))
        setLoadState('error')
      })

    return () => {
      cancelled = true
    }
  }, [requestKey])

  // 그룹 필터 드롭다운용 목록. 실패해도 목록 자체는 그대로 보여줘야 하니 조용히 빈 목록으로 둔다.
  useEffect(() => {
    let cancelled = false

    getMyStudyGroups()
      .then((groups) => {
        if (!cancelled) setMyGroups(groups)
      })
      .catch(() => {
        if (!cancelled) setMyGroups([])
      })

    return () => {
      cancelled = true
    }
  }, [])

  // 세션방에서 나오며 넘어온 sessionId를 한 번만 소비해 "평가 수집중" 자리로 기억해둔다.
  useEffect(() => {
    const incoming = (location.state as StudyDashboardNavState | null)?.justLeftSessionId
    if (incoming === undefined || consumedNavState.current) return
    consumedNavState.current = true

    const groupId = (location.state as StudyDashboardNavState | null)?.justLeftGroupId
    setPendingSession({ sessionId: incoming, groupId })
    navigate(location.pathname, { replace: true, state: null })
  }, [location.pathname, location.state, navigate])

  const isPendingResolved =
    pendingSession !== null &&
    records.some((record) => record.sessionId === pendingSession.sessionId)

  // 세션 종료 감지가 아직 웹훅 기반이 아니라, 방금 나온 세션이 목록에 나타날 때까지 주기적으로 다시 확인한다.
  useEffect(() => {
    if (!pendingSession || isPendingResolved) return

    const timer = window.setInterval(() => {
      getPeerFeedbackList()
        .then((result) => setRecords(toStudyRecords(result)))
        .catch(() => {
          // 일시적인 조회 실패는 무시하고 다음 주기에 다시 확인한다.
        })
    }, PENDING_POLL_INTERVAL_MS)

    return () => window.clearInterval(timer)
  }, [pendingSession, isPendingResolved])

  const pendingGroupTitle = pendingSession
    ? (myGroups.find((group) => group.id === pendingSession.groupId)?.title ?? '스터디 세션')
    : null

  const trendData = useMemo<ScoreTrendPoint[]>(
    () =>
      records
        .filter((record) => record.status === 'completed')
        .slice(0, TREND_POINT_COUNT)
        .map((record) => ({ date: record.date.slice(5), score: record.score }))
        .reverse(),
    [records],
  )

  const filteredRecords = useMemo(() => {
    const selectedGroup =
      groupFilter === 'all' ? null : myGroups.find((group) => group.id === groupFilter) ?? null

    const byGroup =
      groupFilter === 'all'
        ? records
        : records.filter((record) =>
            record.groupId != null
              ? record.groupId === groupFilter
              : record.groupTitle === selectedGroup?.title,
          )

    return sortOrder === 'latest' ? byGroup : [...byGroup].reverse()
  }, [records, groupFilter, sortOrder, myGroups])

  const handleOpenReport = useCallback((record: StudyRecord) => {
    setSelectedRecord(record)
    setReportOpen(true)
  }, [])

  const handleCloseReport = useCallback(() => setReportOpen(false), [])

  const isEmpty =
    loadState === 'loaded' && records.length === 0 && !pendingSession

  return (
    <PageLayout contentClassName="max-w-interviews">
      <section className="pb-8 pt-12" aria-labelledby="page-title">
        <h1 id="page-title" className="text-h1">스터디 한눈에 보기</h1>
        <p className="mt-2 text-body-2 text-text-secondary">
          스터디 세션에서 받은 상호평가를 모아 역량 변화를 확인해보세요.
        </p>
      </section>

      {loadState === 'error' ? (
        <section
          className="dashboard-panel mb-24 flex min-h-96 flex-col items-center justify-center text-center"
          aria-labelledby="records-error-title"
        >
          <span className="flex size-16 items-center justify-center rounded-ait-pill bg-status-neutral-surface text-status-error" aria-hidden="true">
            <AlertCircle className="size-8" />
          </span>
          <h2 id="records-error-title" className="mt-5 text-h2">스터디 기록을 불러오지 못했습니다</h2>
          <p className="mt-2 text-body-2 text-text-secondary">{errorMessage}</p>
          <Button
            type="button"
            variant="secondary"
            className="mt-6 min-w-32"
            onClick={() => {
              setLoadState('loading')
              setRequestKey((key) => key + 1)
            }}
          >
            다시 시도
          </Button>
        </section>
      ) : isEmpty ? (
        <section
          className="dashboard-panel mb-24 flex min-h-96 flex-col items-center justify-center text-center"
          aria-labelledby="records-title"
        >
          <span className="flex size-16 items-center justify-center rounded-ait-pill bg-status-neutral-surface text-action-primary" aria-hidden="true">
            <UsersRound className="size-8" />
          </span>
          <h2 id="records-title" className="mt-5 text-h2">아직 받은 평가가 없습니다</h2>
          <p className="mt-2 text-body-2 text-text-secondary">
            화상 스터디 세션에 참여하면 함께한 팀원들의 평가가 여기에 모입니다.
          </p>
        </section>
      ) : (
        <>
          <section className="interview-summary-grid grid gap-10" aria-label="스터디 활동 요약">
            <div className="flex flex-col">
              <SimpleStatCard
                className="flex-1"
                icon={<UsersRound className="size-7" />}
                label="누적 스터디"
                value={
                  <>
                    {records.length}
                    <span className="ml-1 text-caption font-normal text-text-secondary">회</span>
                  </>
                }
              />
              <div className="my-6 border-t border-border-default" />
              <SimpleStatCard
                className="flex-1"
                icon={<Users className="size-7" />}
                label="최근 스터디 그룹"
                value={records[0]?.groupTitle ?? '아직 없음'}
              />
            </div>
            <section className="dashboard-panel interview-chart-panel" aria-labelledby="score-chart-title">
              <h2 id="score-chart-title" className="text-h3 font-semibold">내 평가 점수 추이</h2>
              <ScoreTrendChart filled data={trendData} className="mt-1" />
            </section>
          </section>

          <section className="mt-10 border-t border-chart-axis pb-24 pt-4" aria-labelledby="records-title">
            <h2 id="records-title" className="text-h2">스터디 기록</h2>

            <div className="mt-4 flex flex-wrap items-center gap-3 border-b border-chart-axis pb-4">
              <div>
                <label htmlFor="study-group-filter" className="sr-only">내 스터디</label>
                <select
                  id="study-group-filter"
                  value={groupFilter}
                  onChange={(event) =>
                    setGroupFilter(
                      event.target.value === 'all' ? 'all' : Number(event.target.value),
                    )
                  }
                  className="min-w-32 rounded-ait-s border border-chart-axis bg-surface-default px-4 py-2 text-body-2"
                >
                  <option value="all">내 스터디 전체</option>
                  {myGroups.map((group) => (
                    <option key={group.id} value={group.id}>{group.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="study-sort-order" className="sr-only">정렬 순서</label>
                <select
                  id="study-sort-order"
                  value={sortOrder}
                  onChange={(event) => setSortOrder(event.target.value as 'latest' | 'oldest')}
                  className="min-w-28 rounded-ait-s border border-chart-axis bg-surface-default px-4 py-2 text-body-2"
                >
                  <option value="latest">최신순</option>
                  <option value="oldest">오래된순</option>
                </select>
              </div>
            </div>

            <div
              key={`${groupFilter}-${sortOrder}`}
              className="mt-8 space-y-4"
              aria-live="polite"
            >
              {loadState === 'loading' ? (
                Array.from({ length: 3 }, (_, index) => (
                  <div key={index} className="flex min-h-28 items-center gap-6 rounded-ait-m border border-border-default bg-surface-default px-8 py-4">
                    <div className="flex-1">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="mt-3 h-6 w-64" />
                    </div>
                    <Skeleton className="h-10 w-28" />
                  </div>
                ))
              ) : (
                <>
                  {pendingSession && !isPendingResolved ? (
                    <StudyRecordItem
                      record={{
                        sessionId: pendingSession.sessionId,
                        groupId: pendingSession.groupId,
                        groupTitle: pendingGroupTitle ?? '스터디 세션',
                        date: formatRecordDate(new Date().toISOString()),
                        score: 0,
                        delta: 0,
                        round:
                          records.filter((record) => record.groupId === pendingSession.groupId)
                            .length + 1,
                        status: 'collecting',
                      }}
                      index={0}
                      onOpenReport={() => {}}
                    />
                  ) : null}

                  {filteredRecords.length ? (
                    filteredRecords.map((record, index) => (
                      <StudyRecordItem
                        key={record.sessionId}
                        record={record}
                        index={index}
                        onOpenReport={handleOpenReport}
                      />
                    ))
                  ) : !pendingSession ? (
                    <div className="rounded-ait-m border border-border-default bg-surface-default px-8 py-10 text-center">
                      <h3 className="text-h3">아직 스터디 기록이 없습니다</h3>
                      <p className="mt-2 text-body-2 text-text-secondary">다른 그룹을 선택해 주세요.</p>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </section>
        </>
      )}

      {selectedRecord ? (
        <StudySessionReportModal
          open={reportOpen}
          record={selectedRecord}
          onClose={handleCloseReport}
        />
      ) : null}
    </PageLayout>
  )
}
