import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  getCoverLetter,
  type CoverLetterDetail,
} from '@/api/cover-letters'
import { toErrorMessage } from '@/api/http'
import { CoverLetterEditor } from '@/components/documents/CoverLetterEditor'
import { PageLayout } from '@/components/layout/PageLayout'
import { Button } from '@/components/ui/button'

// 경로로 선택된 자기소개서를 불러와 독립된 편집 페이지로 제공한다.
export function CoverLetterPage() {
  const { coverLetterId: coverLetterIdParam } = useParams()
  const coverLetterId = Number(coverLetterIdParam)
  const hasValidCoverLetterId = Number.isInteger(coverLetterId) && coverLetterId > 0
  const [coverLetter, setCoverLetter] = useState<CoverLetterDetail | null>(null)
  const [isLoading, setIsLoading] = useState(hasValidCoverLetterId)
  const [error, setError] = useState<string | null>(
    hasValidCoverLetterId ? null : '올바르지 않은 자기소개서 주소입니다.',
  )

  const loadCoverLetter = () => {
    if (!hasValidCoverLetterId) {
      setError('올바르지 않은 자기소개서 주소입니다.')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)
    getCoverLetter(coverLetterId)
      .then(setCoverLetter)
      .catch((requestError: unknown) => setError(toErrorMessage(requestError)))
      .finally(() => setIsLoading(false))
  }

  useEffect(() => {
    if (!hasValidCoverLetterId) return

    let active = true
    getCoverLetter(coverLetterId)
      .then((response) => {
        if (active) setCoverLetter(response)
      })
      .catch((requestError: unknown) => {
        if (active) setError(toErrorMessage(requestError))
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [coverLetterId, hasValidCoverLetterId])

  return (
    <PageLayout>
      <div className="py-10">
        {isLoading ? (
          <section className="mypage-panel py-16 text-center" role="status">
            <p className="text-body-1 text-text-secondary">
              자기소개서를 불러오는 중입니다.
            </p>
          </section>
        ) : error ? (
          <section className="mypage-panel py-16 text-center" role="alert">
            <p className="text-body-1 text-status-error">{error}</p>
            {hasValidCoverLetterId ? (
              <Button
                type="button"
                variant="secondary"
                className="mt-4"
                onClick={loadCoverLetter}
              >
                다시 시도
              </Button>
            ) : (
              <Button asChild variant="secondary" className="mt-4">
                <Link to="/mypage">마이페이지로</Link>
              </Button>
            )}
          </section>
        ) : coverLetter ? (
          <CoverLetterEditor
            key={coverLetter.coverLetterId}
            coverLetter={coverLetter}
            onUpdated={setCoverLetter}
          />
        ) : null}
      </div>
    </PageLayout>
  )
}
