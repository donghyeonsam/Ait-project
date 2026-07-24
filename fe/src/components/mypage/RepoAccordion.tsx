import { ChevronDown, ExternalLink, GitFork } from 'lucide-react'
import { useState } from 'react'
import { GitHubIcon } from '@/components/icons/GitHubIcon'
import { Button } from '@/components/ui/button'
import type { ProfileRepository } from '@/types/profile'

const GITHUB_APP_INSTALL_URL = 'https://github.com/apps/Ait-ai-interview/installations/new'

interface RepoAccordionProps {
  repositories: ProfileRepository[]
  error?: string | null
  loading?: boolean
  onRetry?: () => void
}

export function RepoAccordion({
  repositories,
  error,
  loading = false,
  onRetry,
}: RepoAccordionProps) {
  const [isOpen, setIsOpen] = useState(false)

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
                  <a
                    href={repository.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between gap-3 text-body-2 font-medium text-action-primary"
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

          <Button asChild variant="secondary" className="mt-3 w-full">
            <a href={GITHUB_APP_INSTALL_URL}>
              <GitHubIcon className="size-5" aria-hidden="true" />
              레포지토리 연동하기
            </a>
          </Button>
        </div>
      </div>
    </div>
  )
}
