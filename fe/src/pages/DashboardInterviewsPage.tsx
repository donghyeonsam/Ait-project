import { ChevronDown, Flame, UsersRound } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { InterviewRecordItem } from '@/components/dashboard/InterviewRecordItem'
import { ReportModal } from '@/components/dashboard/ReportModal'
import { ScoreTrendChart } from '@/components/dashboard/ScoreTrendChart'
import { StatCard } from '@/components/dashboard/StatCard'
import { PageLayout } from '@/components/layout/PageLayout'
import { Button } from '@/components/ui/button'
import { interviewRecords, type InterviewRecord, type InterviewType, type JobType } from '@/mocks/dashboard'
import { cn } from '@/lib/utils'

const interviewTypes: Array<'전체' | InterviewType> = [
  '전체',
  '종합',
  '직무',
  '기술',
  '포폴',
  'CS',
]

const jobTypes: Array<'전체 분야' | JobType> = [
  '전체 분야',
  'FE',
  'BE',
  'AI',
  'Data',
  'Infra',
  '보안',
  'QA',
  'Mobile',
  'PM/PO',
]

const RECORD_PAGE_SIZE = 4

export function DashboardInterviewsPage() {
  const [activeType, setActiveType] = useState<'전체' | InterviewType>('전체')
  const [activeField, setActiveField] = useState<'전체 분야' | JobType>('전체 분야')
  const [sortOrder, setSortOrder] = useState<'latest' | 'oldest'>('latest')
  const [visibleRecordCount, setVisibleRecordCount] = useState(RECORD_PAGE_SIZE)
  const [selectedRecord, setSelectedRecord] = useState(interviewRecords[0])
  const [reportOpen, setReportOpen] = useState(false)

  const filteredRecords = useMemo(() => {
    const filtered = interviewRecords.filter(
      (record) =>
        (activeType === '전체' || record.type === activeType) &&
        (activeField === '전체 분야' || record.field === activeField),
    )
    return sortOrder === 'latest' ? filtered : [...filtered].reverse()
  }, [activeField, activeType, sortOrder])

  const visibleRecords = filteredRecords.slice(0, visibleRecordCount)
  const hasMoreRecords = visibleRecordCount < filteredRecords.length

  const openReport = useCallback((record: InterviewRecord) => {
    setSelectedRecord(record)
    setReportOpen(true)
  }, [])

  const closeReport = useCallback(() => setReportOpen(false), [])

  return (
    <PageLayout contentClassName="max-w-interviews">
      <section className="pb-8 pt-12" aria-labelledby="page-title">
        <h1 id="page-title" className="text-h1">AI 모의면접</h1>
        <p className="mt-2 text-body-2 text-text-secondary">
          실전처럼 연습하고, 면접 역량의 변화를 확인해보세요.
        </p>
      </section>

      <section className="interview-summary-grid grid gap-10" aria-label="모의면접 활동 요약">
        <div>
          <StatCard
            compact
            index={0}
            icon={<UsersRound className="size-7" />}
            label="이번 주 모의면접"
            value={4}
            unit="회"
            deltaLabel="1회"
          />
          <div className="my-6 border-t border-border-default" />
          <StatCard
            compact
            index={1}
            icon={<Flame className="size-7" />}
            label="연속 연습"
            value={1}
            unit="일"
            footerLabel="최고 기록"
            deltaLabel="7일"
          />
        </div>
        <section className="dashboard-panel interview-chart-panel" aria-labelledby="score-chart-title">
          <h2 id="score-chart-title" className="text-h3 font-semibold">종합 점수 추이</h2>
          <ScoreTrendChart filled className="mt-1" />
        </section>
      </section>

      <section className="mt-10 border-t border-chart-axis pb-24 pt-4" aria-labelledby="records-title">
        <h2 id="records-title" className="text-h2">AI 면접기록</h2>

        <div className="mt-4 flex items-center gap-6">
          <span className="shrink-0 text-body-1">면접 유형</span>
          <div className="flex flex-wrap items-center gap-4" role="radiogroup" aria-label="면접 유형">
            {interviewTypes.map((type) => (
              <button
                key={type}
                type="button"
                role="radio"
                aria-checked={activeType === type}
                className={cn(
                  'min-w-16 rounded-ait-s border px-4 py-1 text-body-2 transition-colors duration-150',
                  activeType === type
                    ? 'border-action-primary bg-action-primary font-medium text-surface-default'
                    : 'border-border-default bg-status-neutral-surface text-text-secondary hover:border-action-primary hover:text-action-primary',
                )}
                onClick={() => {
                  setActiveType(type)
                  setVisibleRecordCount(RECORD_PAGE_SIZE)
                }}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-6 border-b border-chart-axis pb-4">
          <label htmlFor="field-filter" className="shrink-0 text-body-1">세부 분야</label>
          <div className="flex items-center gap-4">
            <select
              id="field-filter"
              value={activeField}
              onChange={(event) => {
                setActiveField(event.target.value as '전체 분야' | JobType)
                setVisibleRecordCount(RECORD_PAGE_SIZE)
              }}
              className="min-w-44 rounded-ait-s border border-chart-axis bg-surface-default px-4 py-2 text-body-2"
            >
              {jobTypes.map((field) => <option key={field}>{field}</option>)}
            </select>
            <label htmlFor="sort-order" className="sr-only">정렬 순서</label>
            <select
              id="sort-order"
              value={sortOrder}
              onChange={(event) => {
                setSortOrder(event.target.value as 'latest' | 'oldest')
                setVisibleRecordCount(RECORD_PAGE_SIZE)
              }}
              className="min-w-28 rounded-ait-s border border-chart-axis bg-surface-default px-4 py-2 text-body-2"
            >
              <option value="latest">최신순</option>
              <option value="oldest">오래된순</option>
            </select>
          </div>
        </div>

        <div
          id="interview-record-list"
          key={`${activeType}-${activeField}-${sortOrder}`}
          className="mt-8 space-y-4"
          aria-live="polite"
        >
          {filteredRecords.length ? (
            visibleRecords.map((record, index) => (
              <InterviewRecordItem
                key={record.id}
                record={record}
                index={index % RECORD_PAGE_SIZE}
                onOpenReport={openReport}
              />
            ))
          ) : (
            <div className="rounded-ait-m border border-border-default bg-surface-default px-8 py-10 text-center">
              <h3 className="text-h3">조건에 맞는 면접 기록이 없습니다</h3>
              <p className="mt-2 text-body-2 text-text-secondary">다른 면접 유형이나 세부 분야를 선택해 주세요.</p>
            </div>
          )}
        </div>
        {hasMoreRecords ? (
          <div className="mt-8 flex justify-center">
            <Button
              type="button"
              variant="secondary"
              className="min-w-44"
              aria-controls="interview-record-list"
              onClick={() =>
                setVisibleRecordCount((count) =>
                  Math.min(count + RECORD_PAGE_SIZE, filteredRecords.length),
                )
              }
            >
              SHOW MORE
              <ChevronDown className="size-5" aria-hidden="true" />
            </Button>
          </div>
        ) : null}
      </section>

      <ReportModal
        open={reportOpen}
        record={selectedRecord}
        onClose={closeReport}
      />
    </PageLayout>
  )
}
