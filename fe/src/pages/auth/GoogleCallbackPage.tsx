import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loginWithGoogle } from '@/api/auth'
import { toErrorMessage } from '@/api/http'
import { PageLayout } from '@/components/layout/PageLayout'
import { Button } from '@/components/ui/button'
import { consumeGoogleOAuthState, getGoogleRedirectUri } from '@/lib/googleOAuth'
import { useAuth } from '@/lib/useAuth'

class OAuthDeniedError extends Error {}
class OAuthStateMismatchError extends Error {}

// 구글 인가 코드 콜백 화면. code를 백엔드와 교환해 로그인·가입을 완료하고 대시보드로 이동한다.
export function GoogleCallbackPage() {
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
    const expectedState = consumeGoogleOAuthState()

    Promise.resolve()
      .then(() => {
        if (deniedReason) {
          throw new OAuthDeniedError('구글 로그인이 취소되었습니다.')
        }
        if (!code || !state || state !== expectedState) {
          throw new OAuthStateMismatchError('구글 로그인 요청을 확인할 수 없습니다. 다시 시도해주세요.')
        }
        return loginWithGoogle(code, getGoogleRedirectUri())
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
  }, [navigate, signIn])

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
            구글 로그인을 확인하고 있어요...
          </p>
        )}
      </section>
    </PageLayout>
  )
}
