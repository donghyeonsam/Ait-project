import { Link } from 'react-router-dom'
import { PageIntro } from '@/components/common/PageIntro'
import { PageLayout } from '@/components/layout/PageLayout'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <PageLayout>
      <PageIntro
        title="페이지를 찾을 수 없어요"
        description="주소가 변경되었거나 삭제된 페이지입니다."
      >
        <Button asChild className="mt-6">
          <Link to="/dashboard">대시보드로 돌아가기</Link>
        </Button>
      </PageIntro>
    </PageLayout>
  )
}
