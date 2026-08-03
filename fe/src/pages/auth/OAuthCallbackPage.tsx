import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { OAuthLoginResponse } from '@/api/auth'
import { toErrorMessage } from '@/api/http'
import { PageLayout } from '@/components/layout/PageLayout'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/useAuth'

class OAuthDeniedError extends Error {}
class OAuthStateMismatchError extends Error {}

interface OAuthCallbackPageProps {
  providerLabel: string
  login: (code: string, redirectUri: string) => Promise<OAuthLoginResponse>
  getRedirectUri: () => string
  consumeState: () => string | null
}

// 소셜 로그인 인가 코드 콜백 화면. code를 백엔드와 교환해 로그인·가입을 완료하고 대시보드로 이동한다.
export function OAuthCallbackPage({
  providerLabel,
  login,
  getRedirectUri,
  consumeState,
}: OAuthCallbackPageProps) {
  const navigate = useNavigate()
  const { signIn } = useAuth()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const hasRequestedRef = useRef(false)

  useEffect(() => {
    // StrictMode의 개발용 이중 마운트로 인가 코드 교환이 두 번 나가지 않도록 한 번만 실행한다.
    if (hasRequestedRef.current) return
    hasRequestedRef.current = true

    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const state = params.get('state')
    const deniedReason = params.get('error')
    const expectedState = consumeState()

    Promise.resolve()
      .then(() => {
        if (deniedReason) {
          throw new OAuthDeniedError(`${providerLabel} 로그인이 취소되었습니다.`)
        }
        if (!code || !state || state !== expectedState) {
          throw new OAuthStateMismatchError(`${providerLabel} 로그인 요청을 확인할 수 없습니다. 다시 시도해주세요.`)
        }
        return login(code, getRedirectUri())
      })
      .then((response) => {
        signIn(response.accessToken, response.user, true)
        navigate('/dashboard', { replace: true })
      })
      .catch((error: unknown) => {
        setErrorMessage(
          error instanceof OAuthDeniedError || error instanceof OAuthStateMismatchError
            ? error.message
            : toErrorMessage(error),
        )
      })
  }, [providerLabel, login, getRedirectUri, consumeState, navigate, signIn])

  return (
    <PageLayout>
      <section className="flex min-h-[50vh] flex-col items-center justify-center gap-4 py-16 text-center">
        {errorMessage ? (
          <>
            <p className="text-body-1 text-status-error" role="alert">
              {errorMessage}
            </p>
            <Button type="button" variant="secondary" onClick={() => navigate('/login')}>
              로그인 화면으로 이동
            </Button>
          </>
        ) : (
          <p className="text-body-1 text-text-secondary" role="status">
            {providerLabel} 로그인을 확인하고 있어요...
          </p>
        )}
      </section>
    </PageLayout>
  )
}
