import { useNavigate } from 'react-router-dom'
import type { CoverLetterDetail } from '@/api/cover-letters'
import { CoverLetterCreateEditor } from '@/components/documents/CoverLetterCreateEditor'
import { PageLayout } from '@/components/layout/PageLayout'

// 새 자기소개서를 작성하고 저장 후 상세 편집 화면으로 이동한다.
export function CoverLetterCreatePage() {
  const navigate = useNavigate()

  const handleCreated = (coverLetter: CoverLetterDetail) => {
    navigate(`/mypage/documents/cover-letters/${coverLetter.coverLetterId}`, {
      replace: true,
    })
  }

  return (
    <PageLayout>
      <div className="py-10">
        <CoverLetterCreateEditor onCreated={handleCreated} />
      </div>
    </PageLayout>
  )
}
