import { useEffect, useState } from 'react'
import { ApiError, toErrorMessage } from '@/api/http'
import { getMyResume, type Resume } from '@/api/resume'
import { ResumeEditor } from '@/components/documents/ResumeEditor'
import { PageLayout } from '@/components/layout/PageLayout'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/useAuth'

function handleResumeLoadError(
  requestError: unknown,
  setError: (value: string | null) => void,
) {
  // 이력서를 아직 작성하지 않은 사용자는 정상 상태(404)이므로 오류로 취급하지 않는다.
  if (requestError instanceof ApiError && requestError.status === 404) {
    setError(null)
    return
  }
  setError(toErrorMessage(requestError))
}

// 현재 사용자의 이력서를 불러와 독립된 편집 페이지로 제공한다.
export function ResumePage() {
  const { user } = useAuth()
  const [resume, setResume] = useState<Resume | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadResume = () => {
    setIsLoading(true)
    setError(null)
    getMyResume()
      .then(setResume)
      .catch((requestError: unknown) => handleResumeLoadError(requestError, setError))
      .finally(() => setIsLoading(false))
  }

  useEffect(() => {
    let active = true

    getMyResume()
      .then((response) => {
        if (active) setResume(response)
      })
      .catch((requestError: unknown) => {
        if (active) handleResumeLoadError(requestError, setError)
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  return (
    <PageLayout>
      <div className="py-10 sm:py-14">
        {isLoading ? (
          <section className="mypage-panel py-16 text-center" role="status">
            <p className="text-body-1 text-text-secondary">이력서를 불러오는 중입니다.</p>
          </section>
        ) : error ? (
          <section className="mypage-panel py-16 text-center" role="alert">
            <p className="text-body-1 text-status-error">{error}</p>
            <Button type="button" variant="secondary" className="mt-4" onClick={loadResume}>
              다시 시도
            </Button>
          </section>
        ) : resume ? (
          <ResumeEditor
            resume={resume}
            email={user?.email ?? ''}
            onUpdated={setResume}
          />
        ) : (
          <section className="mypage-panel py-16 text-center">
            <p className="text-body-1 text-text-secondary">아직 작성된 이력서가 없습니다.</p>
          </section>
        )}
      </div>
    </PageLayout>
  )
}
