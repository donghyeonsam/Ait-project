import { ChevronDown, ExternalLink, GitFork } from 'lucide-react'
import { useEffect, useState } from 'react'
import { confirmGithubInstallation } from '@/api/github'
import { toErrorMessage } from '@/api/http'
import { GitHubIcon } from '@/components/icons/GitHubIcon'
import { Button } from '@/components/ui/button'
import { isGithubInstallMessage, openGithubInstallPopup } from '@/lib/githubInstall'
import type { ProfileRepository } from '@/types/profile'

const GITHUB_APP_INSTALL_URL = 'https://github.com/apps/Ait-deploy/installations/new'

interface RepoAccordionProps {
  repositories: ProfileRepository[]
  loading?: boolean
  onInstalled?: () => void
}

// 등록한 GitHub 저장소를 펼쳐 보는 아코디언.
export function RepoAccordion({
  repositories,
  loading = false,
  onInstalled,
}: RepoAccordionProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isInstalling, setIsInstalling] = useState(false)
  const [installError, setInstallError] = useState<string | null>(null)

  // 설치 팝업(GithubCallbackPage)이 installation_id만 postMessage로 넘기면, 로그인된 이 창이
  // 직접 연동 확정 API를 호출하고 목록을 새로고침한다.
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return
      if (!isGithubInstallMessage(event.data)) return

      if ('error' in event.data) {
        setInstallError(event.data.error)
        return
      }

      setIsInstalling(true)
      setInstallError(null)
      confirmGithubInstallation(event.data.installationId)
        .then(() => onInstalled?.())
        .catch((requestError: unknown) => setInstallError(toErrorMessage(requestError)))
        .finally(() => setIsInstalling(false))
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [onInstalled])

  const startInstall = () => {
    setInstallError(null)
    const popup = openGithubInstallPopup(GITHUB_APP_INSTALL_URL)
    if (!popup) {
      setInstallError('팝업이 차단되어 있습니다. 브라우저의 팝업 차단을 해제한 뒤 다시 시도해주세요.')
    }
  }

  return (
    <div className="border-t border-border-default pt-4">
      <button
        type="button"
        className="flex w-full items-center justify-between rounded-ait-s py-1 text-left text-body-2 font-semibold text-action-primary"
        aria-expanded={isOpen}
        aria-controls="registered-repositories"
        onClick={() => setIsOpen((value) => !value)}
      >
        <span className="flex items-center gap-2">
          <GitFork className="size-4" aria-hidden="true" />
          등록 레포지토리
          <span className="text-caption font-normal text-text-secondary">{repositories.length}</span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className={`size-5 transition-transform [transition-duration:var(--duration-base)] [transition-timing-function:var(--easing-standard)] ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      <div id="registered-repositories" className={`repo-accordion-content ${isOpen ? 'is-open' : ''}`}>
        <div className="overflow-hidden">
          {loading ? (
            <p className="pt-3 text-caption text-text-secondary" role="status">
              GitHub 저장소를 다시 불러오는 중입니다.
            </p>
          ) : repositories.length ? (
            <ul className="space-y-2 pt-3">
              {repositories.map((repository, index) => (
                <li
                  key={repository.id}
                  className="repo-list-item flex items-center gap-2 rounded-ait-s bg-status-neutral-surface p-3"
                  style={{ '--repo-order': index } as React.CSSProperties}
                >
                  <a
                    href={repository.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex min-w-0 flex-1 items-center justify-between gap-3 text-body-2 font-medium text-action-primary"
                  >
                    <span className="truncate">{repository.name}</span>
                    <ExternalLink className="size-4 shrink-0" aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="pt-3 text-caption text-text-secondary">등록된 레포지토리가 없습니다.</p>
          )}

          {installError ? (
            <p className="pt-3 text-caption text-status-error" role="alert">
              {installError}
            </p>
          ) : null}

          <Button
            type="button"
            variant="secondary"
            className="mt-3 w-full"
            disabled={isInstalling}
            onClick={startInstall}
          >
            <GitHubIcon className="size-5" aria-hidden="true" />
            {isInstalling ? '연동 확인 중...' : '레포지토리 연동하기'}
          </Button>
        </div>
      </div>
    </div>
  )
}
