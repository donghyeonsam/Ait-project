import { PageIntro } from '@/components/common/PageIntro'
import { PageLayout } from '@/components/layout/PageLayout'

// 대시보드의 스터디 라운지 화면. 기능 구현 전이라 소개 문구만 노출하는 자리표시 페이지다.
export function DashboardStudyPage() {
  return (
    <PageLayout contentClassName="max-w-dashboard">
      <PageIntro
        title="스터디 라운지"
        description="대시보드에서 참여한 스터디 기록과 일정을 확인해보세요."
      />
    </PageLayout>
  )
}
