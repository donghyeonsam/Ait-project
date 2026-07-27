import { ArrowLeft, Check } from 'lucide-react'
import type { FormEvent, ReactNode } from 'react'
import { Button } from '@/components/ui/button'

interface DocumentEditorShellProps {
  title: string
  description: string
  lastModified?: string
  saved: boolean
  isSaving: boolean
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onNavigateHome: () => void
  topBar?: ReactNode
  children: ReactNode
}

// 이력서와 자기소개서 편집 페이지의 공통 헤더, 본문, 저장 영역을 구성한다.
export function DocumentEditorShell({
  title,
  description,
  lastModified,
  saved,
  isSaving,
  onSubmit,
  onNavigateHome,
  topBar,
  children,
}: DocumentEditorShellProps) {
  return (
    <form
      className="overflow-hidden rounded-ait-m border border-border-default bg-surface-default shadow-elevation-1"
      onSubmit={onSubmit}
      noValidate
    >
      <header className="border-b border-border-default px-8 py-6">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
          <h1 className="text-h2 text-action-primary">{title}</h1>
          {lastModified ? (
            <span className="text-caption text-text-secondary">
              마지막 수정 : {lastModified}
            </span>
          ) : null}
        </div>
        <p className="mt-2 text-body-2 text-text-secondary">{description}</p>
      </header>

      {topBar ? (
        <div className="border-b border-border-default bg-surface-default px-8">
          {topBar}
        </div>
      ) : null}

      <div className="px-8 py-6">{children}</div>

      <footer className="flex flex-wrap items-center justify-end gap-3 border-t border-border-default bg-surface-default px-8 py-4">
        <Button type="button" variant="secondary" onClick={onNavigateHome}>
          <ArrowLeft aria-hidden="true" />
          마이페이지로
        </Button>
        <Button
          type="submit"
          className={saved ? 'save-success' : ''}
          disabled={isSaving}
          aria-busy={isSaving}
        >
          {saved ? <Check aria-hidden="true" /> : null}
          {isSaving ? '저장 중' : saved ? '저장 완료' : '저장하기'}
        </Button>
      </footer>
    </form>
  )
}
