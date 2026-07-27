import { PageIntro } from '@/components/common/PageIntro'
import { PageLayout } from '@/components/layout/PageLayout'

// 개인정보처리방침 화면. 본문 확정 전이라 제목만 노출하는 자리표시 페이지다.
export function PrivacyPage() {
  return (
    <PageLayout>
      <PageIntro title="개인정보처리방침" />
    </PageLayout>
  )
}
