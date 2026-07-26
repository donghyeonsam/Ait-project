import { useNavigate } from 'react-router-dom'
import { PageIntro } from '@/components/common/PageIntro'
import { PageLayout } from '@/components/layout/PageLayout'
import { Button } from '@/components/ui/button'

export function StudyPage() {
  const navigate = useNavigate()

  return (
    <PageLayout>
      <PageIntro
        title="스터디 라운지"
        description="함께 준비하는 사람들과 면접 스터디를 시작해보세요."
      >
        {/* TODO: 임시 진입 버튼 — 내 스터디 그룹, 세션 생성/참가 흐름이 구현되면 제거하고 해당 흐름에서 연결한다. */}
        <Button
          type="button"
          className="mt-6"
          onClick={() => navigate('/study/session/prejoin')}
        >
          (임시) 세션 입장하기
        </Button>
      </PageIntro>
    </PageLayout>
  )
}
