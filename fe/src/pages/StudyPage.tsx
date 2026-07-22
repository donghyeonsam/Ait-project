import { PageIntro } from '@/components/common/PageIntro'
import { PageLayout } from '@/components/layout/PageLayout'

export function StudyPage() {
  return (
    <PageLayout>
      <PageIntro
        title="스터디 라운지"
        description="함께 준비하는 사람들과 면접 스터디를 시작해보세요."
      />
    </PageLayout>
  )
}
