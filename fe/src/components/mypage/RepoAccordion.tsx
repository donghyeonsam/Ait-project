import { ChevronDown, ExternalLink, GitFork } from 'lucide-react'
import { useEffect, useState } from 'react'
import { confirmGithubInstallation } from '@/api/github'
import { toErrorMessage } from '@/api/http'
import { GitHubIcon } from '@/components/icons/GitHubIcon'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { isGithubInstallMessage, openGithubInstallPopup } from '@/lib/githubInstall'
import type { ProfileRepository } from '@/types/profile'

const GITHUB_APP_INSTALL_URL = 'https://github.com/apps/Ait-deploy/installations/new'

interface RepoAccordionProps {
  repositories: ProfileRepository[]
  loading?: boolean
  onDelete?: (id: number) => Promise<void>
  onInstalled?: () => void
}

// 등록한 GitHub 저장소를 펼쳐 보는 아코디언.
// 삭제 API·확인 다이얼로그는 그대로 두되, 목록에서 삭제를 트리거하는 버튼은 화면에 노출하지 않는다.
export function RepoAccordion({
  repositories,
  loading = false,
  onDelete,
  onInstalled,
}: RepoAccordionProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<ProfileRepository | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
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

  const confirmDelete = async () => {
    if (!pendingDelete || !onDelete) return
    setIsDeleting(true)
    setDeleteError(null)
    try {
      await onDelete(pendingDelete.id)
      setPendingDelete(null)
    } catch (requestError) {
      setDeleteError(toErrorMessage(requestError))
    } finally {
      setIsDeleting(false)
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

          {deleteError ? (
            <p className="pt-3 text-caption text-status-error" role="alert">
              {deleteError}
            </p>
          ) : null}

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

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          // 삭제 요청이 진행되는 동안에는 대화상자를 닫지 않는다.
          if (!open && !isDeleting) setPendingDelete(null)
        }}
        title="레포지토리 연동을 삭제할까요?"
        description={
          pendingDelete
            ? `'${pendingDelete.name}' 연동이 삭제되며, 면접 설정에서 더 이상 선택할 수 없습니다.`
            : undefined
        }
        confirmLabel={isDeleting ? '삭제 중...' : '삭제'}
        cancelLabel="취소"
        onConfirm={confirmDelete}
      />
    </div>
  )
}
