import { Eye, EyeOff, LockKeyhole } from 'lucide-react'
import { forwardRef, useState, type ComponentProps, type ReactNode } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface PasswordInputProps extends Omit<ComponentProps<'input'>, 'type'> {
  label: string
  error?: string
  helperText?: string
  labelAction?: ReactNode
  /** 라벨을 렌더링하지 않는다. 외부에서 별도로 <label htmlFor={id}>를 제공할 때 사용한다. */
  hideLabel?: boolean
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput(
    { id, label, error, helperText, labelAction, hideLabel = false, className, ...props },
    ref,
  ) {
    const [isVisible, setIsVisible] = useState(false)
    const descriptionId = error || helperText ? `${id}-description` : undefined

    return (
      <div>
        {hideLabel ? null : (
          <div className="mb-2 flex items-center justify-between gap-4">
            <label htmlFor={id} className="text-body-2 font-semibold text-text-primary">
              {label}
            </label>
            {labelAction}
          </div>
        )}
        <div className="relative">
          <LockKeyhole
            className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-text-secondary"
            aria-hidden="true"
          />
          <Input
            {...props}
            ref={ref}
            id={id}
            type={isVisible ? 'text' : 'password'}
            aria-invalid={Boolean(error)}
            aria-describedby={descriptionId}
            className={cn('px-10', className)}
          />
          <button
            type="button"
            onClick={() => setIsVisible((current) => !current)}
            className="absolute right-1 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-ait-s text-text-secondary transition-colors hover:bg-status-neutral-surface hover:text-action-primary [transition-duration:var(--duration-fast)] [transition-timing-function:var(--easing-standard)]"
            aria-label={isVisible ? '비밀번호 숨김' : '비밀번호 표시'}
          >
            {isVisible ? <EyeOff className="size-5" aria-hidden="true" /> : <Eye className="size-5" aria-hidden="true" />}
          </button>
        </div>
        {error || helperText ? (
          <p
            id={descriptionId}
            className={cn(
              'mt-2 text-caption',
              error ? 'text-status-error' : 'text-text-secondary',
            )}
          >
            {error ?? helperText}
          </p>
        ) : null}
      </div>
    )
  },
)
