import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

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
        <h2 className="text-h3 text-action-primary">{title}</h2>
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
  className?: string
}

export function DynamicCard({ children, className }: DynamicCardProps) {
  return (
    <div
      className={cn(
        'dynamic-card rounded-ait-m border border-border-default bg-background-default p-4',
        className,
      )}
    >
      {children}
    </div>
  )
}
