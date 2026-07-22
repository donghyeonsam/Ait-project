import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'min-h-24 w-full resize-y rounded-ait-s border border-input bg-surface-default px-3 py-3 text-body-2 text-text-primary shadow-elevation-1 transition-[border-color,box-shadow] [transition-duration:var(--duration-fast)] [transition-timing-function:var(--easing-standard)] placeholder:text-text-secondary focus:border-action-primary disabled:bg-status-neutral-surface disabled:text-text-secondary aria-invalid:border-status-error aria-invalid:bg-status-error-surface',
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }

