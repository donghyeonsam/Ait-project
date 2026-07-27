import { PageIntro } from '@/components/common/PageIntro'
import { PageLayout } from '@/components/layout/PageLayout'

// 커뮤니티 화면. 기능 구현 전이라 소개 문구만 노출하는 자리표시 페이지다.
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
