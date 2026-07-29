import { motion } from 'framer-motion'
import { toggleSpring } from '@/lib/motion'
import { cn } from '@/lib/utils'

interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  id?: string
  'aria-label'?: string
  'aria-labelledby'?: string
}

// knob이 스프링으로 이동하는 스위치. role="switch"와 Space 조작을 지원한다.
export function Toggle({ checked, onChange, disabled = false, ...aria }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      {...aria}
      className={cn(
        'flex h-6 w-11 shrink-0 items-center rounded-ait-pill p-0.5 transition-colors [transition-duration:var(--duration-fast)]',
        checked ? 'justify-end bg-brand-blue' : 'justify-start bg-line',
        disabled && 'cursor-not-allowed opacity-45',
      )}
    >
      <motion.span
        layout
        transition={toggleSpring}
        className="size-5 rounded-ait-pill bg-surface-default shadow-elevation-1"
      />
    </button>
  )
}
