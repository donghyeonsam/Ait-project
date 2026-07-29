import { ChevronDown, ExternalLink, GitFork, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { GitHubIcon } from '@/components/icons/GitHubIcon'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import type { ProfileRepository } from '@/types/profile'

const GITHUB_APP_INSTALL_URL = 'https://github.com/apps/Ait-ai-interview/installations/new'

interface RepoAccordionProps {
  repositories: ProfileRepository[]
  error?: string | null
  loading?: boolean
  mutationError?: string | null
  deletingRepositoryId?: number | null
  onRetry?: () => void
  onDelete?: (repositoryId: number) => Promise<void>
}

// 등록한 GitHub 저장소를 펼쳐 보는 아코디언. 저장소 조회는 다른 프로필과 분리돼 실패해도 재시도할 수 있다.
export function RepoAccordion({
  repositories,
  error,
  loading = false,
  mutationError,
  deletingRepositoryId,
  onRetry,
  onDelete,
}: RepoAccordionProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ProfileRepository | null>(
    null,
  )

  const confirmDelete = () => {
    if (!deleteTarget || !onDelete) return
    void onDelete(deleteTarget.id)
      .then(() => setDeleteTarget(null))
      .catch(() => {})
  }

  return (
    <>
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
          ) : error ? (
            <div className="pt-3" role="alert">
              <p className="text-caption text-status-error">
                GitHub 저장소를 불러오지 못했습니다. 다른 프로필 정보는 계속 이용할 수 있습니다.
              </p>
              {onRetry ? (
                <Button type="button" variant="secondary" className="mt-3" onClick={onRetry}>
                  GitHub 저장소 다시 불러오기
                </Button>
              ) : null}
            </div>
          ) : repositories.length ? (
            <ul className="space-y-2 pt-3">
              {repositories.map((repository, index) => (
                <li
                  key={repository.id}
                  className="repo-list-item rounded-ait-s bg-status-neutral-surface p-3"
                  style={{ '--repo-order': index } as React.CSSProperties}
                >
                  <div className="flex items-center gap-2">
                    <a
                      href={repository.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex min-w-0 flex-1 items-center justify-between gap-3 text-body-2 font-medium text-action-primary"
                    >
                      <span className="truncate">{repository.name}</span>
                      <ExternalLink className="size-4 shrink-0" aria-hidden="true" />
                    </a>
                    {onDelete ? (
                      <Button
                        type="button"
                        variant="text"
                        size="icon"
                        className="size-8 shrink-0 text-status-error"
                        aria-label={`${repository.name} 연동 삭제`}
                        disabled={deletingRepositoryId !== null}
                        onClick={() => setDeleteTarget(repository)}
                      >
                        <Trash2 aria-hidden="true" />
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="pt-3 text-caption text-text-secondary">등록된 레포지토리가 없습니다.</p>
          )}

          {mutationError ? (
            <p className="mt-3 text-caption text-status-error" role="alert">
              {mutationError}
            </p>
          ) : null}

          <Button asChild variant="secondary" className="mt-3 w-full">
            <a href={GITHUB_APP_INSTALL_URL}>
              <GitHubIcon className="size-5" aria-hidden="true" />
              레포지토리 연동하기
            </a>
          </Button>
        </div>
      </div>
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && deletingRepositoryId === null) setDeleteTarget(null)
        }}
        title="레포지토리 연동을 삭제할까요?"
        description={`${deleteTarget?.name ?? '선택한 레포지토리'}의 저장된 연동 정보가 삭제됩니다.`}
        confirmLabel={
          deletingRepositoryId === deleteTarget?.id ? '삭제 중' : '연동 삭제'
        }
        confirmVariant="destructive"
        confirmDisabled={deletingRepositoryId !== null}
        onConfirm={confirmDelete}
      />
    </>
  )
}
