// 구글 OAuth 인가 코드 요청 URL을 만들고, 콜백에서 검증할 state를 세션에 보관한다.
const googleOAuthStateKey = 'ait.google-oauth-state'
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

export function getGoogleRedirectUri() {
  return `${window.location.origin}/oauth/google/callback`
}

export function buildGoogleAuthUrl() {
  const state = window.crypto.randomUUID()
  window.sessionStorage.setItem(googleOAuthStateKey, state)

  const params = new URLSearchParams({
    client_id: googleClientId,
    redirect_uri: getGoogleRedirectUri(),
    response_type: 'code',
    scope: 'openid email profile',
    prompt: 'select_account',
    state,
  })

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

// 콜백에서 한 번만 사용하도록 저장해둔 state를 꺼내면서 세션에서 지운다.
export function consumeGoogleOAuthState() {
  const state = window.sessionStorage.getItem(googleOAuthStateKey)
  window.sessionStorage.removeItem(googleOAuthStateKey)
  return state
}
