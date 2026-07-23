import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

const thumbClass = cn(
  '[&::-webkit-slider-thumb]:mt-[-5px] [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none',
  '[&::-webkit-slider-thumb]:rounded-ait-pill [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-surface-default',
  '[&::-webkit-slider-thumb]:bg-action-primary [&::-webkit-slider-thumb]:shadow-elevation-1',
  '[&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-ait-pill [&::-moz-range-thumb]:border-2',
  '[&::-moz-range-thumb]:border-surface-default [&::-moz-range-thumb]:bg-action-primary [&::-moz-range-thumb]:shadow-elevation-1',
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
}

export function MasterVolumeSlider({
  icon,
  gain,
  level,
  onChange,
  label,
  disabled = false,
  showValue = true,
}: MasterVolumeSliderProps) {
  return (
    <div className={cn('flex items-center gap-3', disabled && 'opacity-50')}>
      {icon ? <span className="shrink-0 text-text-secondary" aria-hidden="true">{icon}</span> : null}
      <div className="relative flex h-4 flex-1 items-center">
        <div className="absolute inset-x-0 h-1.5 rounded-ait-pill bg-status-neutral-surface" aria-hidden="true" />
        <div
          className="absolute left-0 h-1.5 rounded-ait-pill bg-action-primary/60 transition-[width] ease-standard duration-(--duration-fast)"
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
          )}
        />
      </div>
      {showValue ? (
        <span className="w-8 shrink-0 text-right text-body-2 tabular-nums text-text-secondary">{gain}</span>
      ) : null}
    </div>
  )
}
