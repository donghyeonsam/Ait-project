import { motion } from 'framer-motion'
import { useId } from 'react'
import { segmentSpring } from '@/lib/motion'
import { cn } from '@/lib/utils'

interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  ariaLabel: string
}

// 활성 배경 pill이 좌우로 미끄러지는 세그먼티드 컨트롤.
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: SegmentedControlProps<T>) {
  const layoutId = useId()

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="inline-flex rounded-ait-s border border-line bg-surface-muted p-1"
    >
      {options.map((option) => {
        const isActive = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(option.value)}
            className={cn(
              'relative rounded-[6px] px-4 py-1.5 text-body-2 transition-colors [transition-duration:var(--duration-fast)]',
              isActive ? 'font-semibold text-navy-900' : 'text-ink-500 hover:text-ink-700',
            )}
          >
            {isActive ? (
              <motion.span
                layoutId={layoutId}
                transition={segmentSpring}
                className="absolute inset-0 rounded-[6px] bg-surface-default shadow-elevation-1"
                aria-hidden="true"
              />
            ) : null}
            <span className="relative">{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}
