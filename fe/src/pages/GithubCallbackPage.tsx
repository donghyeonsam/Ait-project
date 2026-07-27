import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { confirmGithubInstallation } from '@/api/github'
import { toErrorMessage } from '@/api/http'
import { PageLayout } from '@/components/layout/PageLayout'
import { Button } from '@/components/ui/button'

class MissingInstallationIdError extends Error {}

// GitHub App 설치 후 리다이렉트되는 콜백 화면. installation_id로 연동을 확정하고 마이페이지로 보낸다.
export function GithubCallbackPage() {
  const navigate = useNavigate()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const hasRequestedRef = useRef(false)

  useEffect(() => {
    // StrictMode의 개발용 이중 마운트로 연동 요청이 두 번 나가지 않도록 한 번만 실행한다.
    if (hasRequestedRef.current) return
    hasRequestedRef.current = true

    const installationId = new URLSearchParams(window.location.search).get('installation_id')

    Promise.resolve()
      .then(() => {
        if (!installationId) {
          throw new MissingInstallationIdError('GitHub 설치 정보를 확인할 수 없습니다. GitHub 연동을 다시 시도해주세요.')
        }
        return confirmGithubInstallation(installationId)
      })
      .then(() => {
        window.alert('연동 성공!')
        navigate('/mypage', { replace: true })
      })
      .catch((error: unknown) => {
        setErrorMessage(
          error instanceof MissingInstallationIdError ? error.message : toErrorMessage(error),
        )
      })
  }, [navigate])

  return (
    <PageLayout>
      <section className="flex min-h-[50vh] flex-col items-center justify-center gap-4 py-16 text-center">
        {errorMessage ? (
          <>
            <p className="text-body-1 text-status-error" role="alert">
              {errorMessage}
            </p>
            <Button type="button" variant="secondary" onClick={() => navigate('/mypage')}>
              마이페이지로 이동
            </Button>
          </>
        ) : (
          <p className="text-body-1 text-text-secondary" role="status">
            GitHub 연동을 확인하고 있어요...
          </p>
        )}
      </section>
    </PageLayout>
  )
}
