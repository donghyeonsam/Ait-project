import { PageIntro } from '@/components/common/PageIntro'
import { PageLayout } from '@/components/layout/PageLayout'

// 녹화·AI 분석 안내 화면. 본문 확정 전이라 제목만 노출하는 자리표시 페이지다.
export function RecordingNoticePage() {
  return (
    <PageLayout>
      <PageIntro title="녹화 · AI 분석 안내" />
    </PageLayout>
  )
}
