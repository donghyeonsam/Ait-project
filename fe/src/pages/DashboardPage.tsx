import { CalendarDays, ChartNoAxesCombined, ClipboardList, UsersRound } from 'lucide-react'
import { PageLayout } from '@/components/layout/PageLayout'
import { useAuth } from '@/lib/useAuth'

// 활동 요약 카드의 항목 정의. 값은 데이터 연동 전까지 '—'로 비워 둔다.
const emptyMetrics = [
  { label: '이번 주 모의면접', unit: '회', icon: UsersRound },
  { label: '최근 모의면접 종합점수', unit: '점', icon: ChartNoAxesCombined },
  { label: '누적 스터디 횟수', unit: '회', icon: ClipboardList },
  { label: '목표 달성률', unit: '%', icon: CalendarDays },
]

function EmptyPanel({ title, description }: { title: string; description: string }) {
  return (
    <section className="dashboard-panel min-h-64">
      <h2 className="text-h3 font-semibold">{title}</h2>
      <div className="flex min-h-48 items-center justify-center rounded-ait-m border border-dashed border-border-default bg-surface-default px-8 text-center">
        <p className="text-body-2 text-text-secondary">{description}</p>
      </div>
    </section>
  )
}

// 로그인 후 첫 화면. 요약 지표와 최근 기록 패널을 배치하며, 데이터 연동 전까지 빈 상태를 보여준다.
export function DashboardPage() {
  const { user } = useAuth()

  return (
    <PageLayout contentClassName="max-w-dashboard">
      <section className="pb-10 pt-10" aria-labelledby="page-title">
        <h1 id="page-title" className="text-h1">
          좋은 아침이에요, {user?.nickname ?? '사용자'}님
        </h1>
        <p className="mt-2 text-body-2 text-text-secondary">
          오늘도 Ait과 함께 면접 역량을 한 단계 성장시켜보세요.
        </p>
      </section>

      <section className="dashboard-stats grid grid-cols-4 gap-4" aria-label="활동 요약">
        {emptyMetrics.map(({ label, unit, icon: Icon }) => (
          <article key={label} className="rounded-ait-m border border-border-default bg-background-default p-6 shadow-elevation-1">
            <div className="flex items-center gap-4">
              <span className="flex size-14 items-center justify-center rounded-ait-pill bg-status-neutral-surface text-action-primary" aria-hidden="true">
                <Icon className="size-8" />
              </span>
              <div>
                <p className="text-body-2 text-text-secondary">{label}</p>
                <p className="mt-1 flex items-baseline gap-1">
                  <strong className="text-h2">—</strong>
                  <span className="text-caption">{unit}</span>
                </p>
              </div>
            </div>
            <p className="mt-4 text-caption text-text-secondary">연동된 데이터가 없습니다.</p>
          </article>
        ))}
      </section>

      <div className="my-8 border-t border-border-default" />

      <div className="dashboard-main-grid grid gap-10">
        <EmptyPanel title="최근 AI면접 기록" description="저장된 면접 기록이 없습니다." />
        <EmptyPanel title="종합 점수 추이" description="면접 분석 데이터가 연결되면 점수 추이가 표시됩니다." />
      </div>

      <div className="my-10 border-t border-border-default" />

      <div className="dashboard-main-grid grid gap-10 pb-20">
        <EmptyPanel title="최근 스터디 기록" description="저장된 스터디 기록이 없습니다." />
        <EmptyPanel title="나의 스터디 일정" description="등록된 스터디 일정이 없습니다." />
      </div>
    </PageLayout>
  )
}
