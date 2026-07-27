import { FileSearch } from 'lucide-react'
import { PageLayout } from '@/components/layout/PageLayout'

// 대시보드의 AI 모의면접 기록 화면. 기록 API 연동 전까지 빈 상태만 보여준다.
export function DashboardInterviewsPage() {
  return (
    <PageLayout contentClassName="max-w-interviews">
      <section className="pb-8 pt-12" aria-labelledby="page-title">
        <h1 id="page-title" className="text-h1">AI 모의면접</h1>
        <p className="mt-2 text-body-2 text-text-secondary">
          실전처럼 연습하고, 면접 역량의 변화를 확인해보세요.
        </p>
      </section>

      <section className="dashboard-panel mb-24 flex min-h-96 flex-col items-center justify-center text-center" aria-labelledby="records-title">
        <span className="flex size-16 items-center justify-center rounded-ait-pill bg-status-neutral-surface text-action-primary" aria-hidden="true">
          <FileSearch className="size-8" />
        </span>
        <h2 id="records-title" className="mt-5 text-h2">저장된 면접 기록이 없습니다</h2>
        <p className="mt-2 text-body-2 text-text-secondary">
          면접 기록 API가 연결되면 분석 결과와 점수 추이를 확인할 수 있습니다.
        </p>
      </section>
    </PageLayout>
  )
}
