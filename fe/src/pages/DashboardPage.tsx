import { PageIntro } from '@/components/common/PageIntro'
import { PageLayout } from '@/components/layout/PageLayout'

export function DashboardPage() {
  return (
    <PageLayout>
      <PageIntro
        title="좋은 아침이에요, OO님"
        description="오늘도 Ait과 함께 면접 역량을 한 단계 성장시켜보세요."
      />
    </PageLayout>
  )
}
