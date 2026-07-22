import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

type SocialProvider = 'google' | 'github'

interface SocialButtonProps extends ComponentProps<'button'> {
  provider: SocialProvider
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
      <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.06H12v3.89h5.38a4.6 4.6 0 0 1-2 3.02v2.52h3.24c1.9-1.75 2.98-4.33 2.98-7.37Z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.98-.9 6.64-2.4l-3.24-2.52c-.9.6-2.05.96-3.4.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.6A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.39 13.91A6.02 6.02 0 0 1 6.08 12c0-.66.11-1.31.31-1.91v-2.6H3.04A10 10 0 0 0 2 12c0 1.61.39 3.14 1.04 4.51l3.35-2.6Z" />
      <path fill="#EA4335" d="M12 5.96c1.47 0 2.78.5 3.82 1.49l2.87-2.87A9.61 9.61 0 0 0 12 2a10 10 0 0 0-8.96 5.49l3.35 2.6C7.18 7.72 9.39 5.96 12 5.96Z" />
    </svg>
  )
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden="true">
      <path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.86c-2.78.6-3.37-1.18-3.37-1.18-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.9 1.53 2.34 1.09 2.91.83.09-.65.35-1.09.64-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02A9.56 9.56 0 0 1 12 6.84c.85 0 1.71.11 2.51.34 1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.86V21c0 .27.18.58.69.48A10 10 0 0 0 12 2Z" />
    </svg>
  )
}

export function SocialButton({
  provider,
  className,
  children,
  type = 'button',
  ...props
}: SocialButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex w-full items-center justify-center gap-2 rounded-ait-s border border-border-default bg-surface-default px-4 py-[var(--button-padding-block)] text-body-2 font-semibold text-text-primary shadow-elevation-1 transition-[border-color,box-shadow,color] hover:border-action-primary hover:text-action-primary hover:shadow-elevation-2 active:shadow-none disabled:pointer-events-none disabled:bg-status-neutral-surface disabled:text-text-secondary [transition-duration:var(--duration-fast)] [transition-timing-function:var(--easing-standard)]',
        className,
      )}
      {...props}
    >
      {provider === 'google' ? <GoogleIcon /> : <GitHubIcon />}
      {children}
    </button>
  )
}
