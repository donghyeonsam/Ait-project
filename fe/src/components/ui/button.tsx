import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-ait-s text-body-2 font-semibold transition-[color,background-color,border-color,box-shadow] [transition-duration:var(--duration-fast)] [transition-timing-function:var(--easing-standard)] disabled:pointer-events-none disabled:border-status-neutral-border disabled:bg-status-neutral-surface disabled:text-text-secondary disabled:shadow-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:size-6',
  {
    variants: {
      variant: {
        primary:
          'bg-action-primary text-surface-default hover:shadow-elevation-2 active:shadow-none',
        secondary:
          'border border-action-primary bg-surface-default text-action-primary hover:shadow-elevation-1 active:shadow-none',
        accent:
          'border border-status-achievement-border bg-status-achievement text-action-primary hover:shadow-elevation-1 active:shadow-none',
        text: 'bg-transparent text-action-primary hover:bg-status-neutral-surface',
        destructive:
          'bg-status-error text-surface-default hover:shadow-elevation-2 active:shadow-none',
      },
      size: {
        default: 'px-4 py-[var(--button-padding-block)]',
        icon: 'size-10 p-0',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  },
)

interface ButtonProps
  extends ComponentProps<'button'>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Component = asChild ? Slot : 'button'

  return (
    <Component
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}

export { Button }
