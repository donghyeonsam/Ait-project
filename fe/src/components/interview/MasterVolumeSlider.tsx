import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

const thumbClass = cn(
  '[&::-webkit-slider-thumb]:mt-[-5px] [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none',
  '[&::-webkit-slider-thumb]:rounded-ait-pill [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-surface-default',
  '[&::-webkit-slider-thumb]:bg-action-primary [&::-webkit-slider-thumb]:shadow-elevation-1',
  '[&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-ait-pill [&::-moz-range-thumb]:border-2',
  '[&::-moz-range-thumb]:border-surface-default [&::-moz-range-thumb]:bg-action-primary [&::-moz-range-thumb]:shadow-elevation-1',
)

const inverseThumbClass = cn(
  '[&::-webkit-slider-thumb]:border-transparent [&::-webkit-slider-thumb]:bg-white',
  '[&::-moz-range-thumb]:border-transparent [&::-moz-range-thumb]:bg-white',
)

const trackClass = cn(
  '[&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-ait-pill [&::-webkit-slider-runnable-track]:bg-transparent',
  '[&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-ait-pill [&::-moz-range-track]:bg-transparent',
)

interface MasterVolumeSliderProps {
  icon?: ReactNode
  gain: number
  level: number
  onChange: (value: number) => void
  label: string
  disabled?: boolean
  showValue?: boolean
  /** inverse는 어두운 영상 배경 위(면접 세션 시어터)에서 쓰는 흰색 계열 스타일이다. */
  tone?: 'default' | 'inverse'
}

export function MasterVolumeSlider({
  icon,
  gain,
  level,
  onChange,
  label,
  disabled = false,
  showValue = true,
  tone = 'default',
}: MasterVolumeSliderProps) {
  const isInverse = tone === 'inverse'

  return (
    <div className={cn('flex items-center gap-3', disabled && 'opacity-50')}>
      {icon ? (
        <span
          className={cn('shrink-0', isInverse ? 'text-white' : 'text-text-secondary')}
          aria-hidden="true"
        >
          {icon}
        </span>
      ) : null}
      <div className="relative flex h-4 flex-1 items-center">
        <div
          className={cn(
            'absolute inset-x-0 rounded-ait-pill',
            isInverse ? 'h-1 bg-white/25' : 'h-1.5 bg-status-neutral-surface',
          )}
          aria-hidden="true"
        />
        <div
          className={cn(
            'absolute left-0 rounded-ait-pill transition-[width] ease-standard duration-(--duration-fast)',
            isInverse ? 'h-1 bg-white/80' : 'h-1.5 bg-action-primary/60',
          )}
          style={{ width: `${level}%` }}
          aria-hidden="true"
        />
        <input
          type="range"
          min={0}
          max={100}
          value={gain}
          disabled={disabled}
          onChange={(event) => onChange(Number(event.target.value))}
          aria-label={label}
          className={cn(
            'relative z-10 h-4 w-full cursor-pointer appearance-none bg-transparent disabled:cursor-not-allowed',
            trackClass,
            thumbClass,
            isInverse && inverseThumbClass,
          )}
        />
      </div>
      {showValue ? (
        <span
          className={cn(
            'w-8 shrink-0 text-right text-body-2 tabular-nums',
            isInverse ? 'text-white/75' : 'text-text-secondary',
          )}
        >
          {gain}
        </span>
      ) : null}
    </div>
  )
}
