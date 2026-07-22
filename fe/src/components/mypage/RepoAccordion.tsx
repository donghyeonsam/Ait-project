import { ChevronDown, ExternalLink, GitFork } from 'lucide-react'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import type { Repository } from '@/mocks/mypage'

interface RepoAccordionProps {
  repositories: Repository[]
  isEditing: boolean
  onNameChange: (id: number, name: string) => void
}

export function RepoAccordion({
  repositories,
  isEditing,
  onNameChange,
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
          <span className="text-caption font-normal text-text-secondary">
            {repositories.length}
          </span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className={`size-5 transition-transform [transition-duration:var(--duration-base)] [transition-timing-function:var(--easing-standard)] ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      <div
        id="registered-repositories"
        className={`repo-accordion-content ${isOpen ? 'is-open' : ''}`}
      >
        <div className="overflow-hidden">
          <ul className="space-y-2 pt-3">
            {repositories.map((repository, index) => (
              <li
                key={repository.id}
                className="repo-list-item rounded-ait-s bg-status-neutral-surface p-3"
                style={{ '--repo-order': index } as React.CSSProperties}
              >
                {isEditing ? (
                  <label className="block text-caption font-medium text-text-secondary">
                    표시 이름
                    <Input
                      value={repository.name}
                      onChange={(event) =>
                        onNameChange(repository.id, event.target.value)
                      }
                      className="mt-1"
                    />
                    <span className="mt-1 block truncate font-normal">
                      {repository.url}
                    </span>
                  </label>
                ) : (
                  <a
                    href={`https://${repository.url}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between gap-3 text-body-2 font-medium text-action-primary"
                  >
                    <span className="truncate">{repository.name}</span>
                    <ExternalLink className="size-4 shrink-0" aria-hidden="true" />
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

