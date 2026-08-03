// 깃허브 OAuth 인가 코드 요청 URL을 만들고, 콜백에서 검증할 state를 세션에 보관한다.
const githubOAuthStateKey = 'ait.github-oauth-state'
const githubClientId = import.meta.env.VITE_GITHUB_CLIENT_ID

export function getGithubRedirectUri() {
  return `${window.location.origin}/oauth/github/callback`
}

export function buildGithubAuthUrl() {
  const state = window.crypto.randomUUID()
  window.sessionStorage.setItem(githubOAuthStateKey, state)

  const params = new URLSearchParams({
    client_id: githubClientId,
    redirect_uri: getGithubRedirectUri(),
    scope: 'read:user user:email',
    state,
  })

  return `https://github.com/login/oauth/authorize?${params.toString()}`
}

// 콜백에서 한 번만 사용하도록 저장해둔 state를 꺼내면서 세션에서 지운다.
export function consumeGithubOAuthState() {
  const state = window.sessionStorage.getItem(githubOAuthStateKey)
  window.sessionStorage.removeItem(githubOAuthStateKey)
  return state
}
