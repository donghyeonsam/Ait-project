// GitHub App 설치 팝업(부모 창)과 콜백 페이지(팝업) 사이의 postMessage 계약과 팝업 창 열기를 담당한다.
export const githubInstallMessageSource = 'ait-github-install'

export type GithubInstallMessage =
  | { source: typeof githubInstallMessageSource; installationId: string }
  | { source: typeof githubInstallMessageSource; error: string }

export function isGithubInstallMessage(data: unknown): data is GithubInstallMessage {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as { source?: unknown }).source === githubInstallMessageSource
  )
}

const popupWidth = 600
const popupHeight = 700

export function openGithubInstallPopup(url: string) {
  const left = window.screenX + Math.max((window.outerWidth - popupWidth) / 2, 0)
  const top = window.screenY + Math.max((window.outerHeight - popupHeight) / 2, 0)

  return window.open(
    url,
    'ait-github-install',
    `width=${popupWidth},height=${popupHeight},left=${left},top=${top}`,
  )
}
