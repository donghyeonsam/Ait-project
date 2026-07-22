import { PageIntro } from '@/components/common/PageIntro'
import { PageLayout } from '@/components/layout/PageLayout'

export function CommunityPage() {
  return (
    <PageLayout>
      <PageIntro
        title="커뮤니티"
        description="면접 경험과 준비 과정을 자유롭게 나눠보세요."
      />
    </PageLayout>
  )
}
