import { PageIntro } from '@/components/common/PageIntro'
import { PageLayout } from '@/components/layout/PageLayout'

// 이용약관 화면. 본문 확정 전이라 제목만 노출하는 자리표시 페이지다.
export function TermsPage() {
  return (
    <PageLayout>
      <PageIntro title="이용약관" />
    </PageLayout>
  )
}
