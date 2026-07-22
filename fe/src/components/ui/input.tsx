import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

function Input({ className, type, ...props }: ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'h-10 w-full rounded-ait-s border border-input bg-surface-default px-3 text-body-2 text-text-primary shadow-elevation-1 transition-[border-color,box-shadow] [transition-duration:var(--duration-fast)] [transition-timing-function:var(--easing-standard)] placeholder:text-text-secondary focus:border-action-primary disabled:bg-status-neutral-surface disabled:text-text-secondary aria-invalid:border-status-error aria-invalid:bg-status-error-surface',
        className,
      )}
      {...props}
    />
  )
}

export { Input }

