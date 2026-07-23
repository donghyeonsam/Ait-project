import { Check, Trash2 } from 'lucide-react'
import type { FormEvent, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

interface DocumentModalShellProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  lastModified: string
  saved: boolean
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  topBar?: ReactNode
  children: ReactNode
}

export function DocumentModalShell({
  open,
  onOpenChange,
  title,
  description,
  lastModified,
  saved,
  onSubmit,
  topBar,
  children,
}: DocumentModalShellProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="document-dialog overflow-hidden p-0">
        <form className="flex h-full min-h-0 flex-col" onSubmit={onSubmit} noValidate>
          <DialogHeader className="shrink-0 border-b border-border-default px-8 py-6 pr-16">
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
              <DialogTitle>{title}</DialogTitle>
              <span className="text-caption text-text-secondary">
                마지막 수정 : {lastModified}
              </span>
            </div>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>

          {topBar ? (
            <div className="shrink-0 border-b border-border-default bg-surface-default px-8">
              {topBar}
            </div>
          ) : null}

          <div className="document-dialog-body overflow-y-auto px-8 py-6">
            {children}
          </div>

          <DialogFooter className="shrink-0 border-t border-border-default bg-surface-default px-8 py-4">
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                닫기
              </Button>
            </DialogClose>
            <Button type="submit" className={saved ? 'save-success' : ''}>
              {saved ? <Check aria-hidden="true" /> : null}
              {saved ? '저장 완료' : '저장하기'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface DocumentSectionProps {
  title: string
  description?: string
  children: ReactNode
  className?: string
}

export function DocumentSection({
  title,
  description,
  children,
  className,
}: DocumentSectionProps) {
  return (
    <section className={cn('document-section', className)}>
      <div>
        <h3 className="text-h3 text-action-primary">{title}</h3>
        {description ? (
          <p className="mt-1 text-caption text-text-secondary">{description}</p>
        ) : null}
      </div>
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  )
}

interface FormFieldProps {
  id: string
  label: string
  required?: boolean
  error?: string
  children: ReactNode
  className?: string
}

export function FormField({
  id,
  label,
  required = false,
  error,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-2 block text-body-2 font-medium text-text-primary">
        {label}
        {required ? (
          <span className="ml-1 text-status-error" aria-label="필수">
            *
          </span>
        ) : null}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-caption text-status-error">
          {error}
        </p>
      ) : null}
    </div>
  )
}

interface DynamicCardProps {
  children: ReactNode
  isNew?: boolean
  isRemoving?: boolean
  onAnimationEnd?: () => void
}

export function DynamicCard({
  children,
  isNew,
  isRemoving,
  onAnimationEnd,
}: DynamicCardProps) {
  return (
    <div
      className={cn(
        'dynamic-card rounded-ait-m border border-border-default bg-background-default p-4',
        isNew && 'is-new',
        isRemoving && 'is-removing',
      )}
      onAnimationEnd={onAnimationEnd}
    >
      {children}
    </div>
  )
}

interface ListRowProps {
  title: string
  subtitle?: string
  deleteLabel: string
  onSelect: () => void
  onDelete: () => void
  isRemoving?: boolean
  onAnimationEnd?: () => void
}

export function ListRow({
  title,
  subtitle,
  deleteLabel,
  onSelect,
  onDelete,
  isRemoving,
  onAnimationEnd,
}: ListRowProps) {
  return (
    <div
      className={cn(
        'dynamic-card flex items-center justify-between gap-3 rounded-ait-m border border-border-default bg-background-default p-4 transition-colors duration-150 ease-standard hover:border-action-primary',
        isRemoving && 'is-removing',
      )}
      onAnimationEnd={onAnimationEnd}
    >
      <button type="button" className="min-w-0 flex-1 text-left" onClick={onSelect}>
        <p className="truncate text-body-1 font-medium text-text-primary">{title}</p>
        {subtitle ? (
          <p className="mt-1 truncate text-caption text-text-secondary">{subtitle}</p>
        ) : null}
      </button>
      <Button type="button" variant="text" size="icon" aria-label={deleteLabel} onClick={onDelete}>
        <Trash2 aria-hidden="true" />
      </Button>
    </div>
  )
}
