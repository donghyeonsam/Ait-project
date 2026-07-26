import { useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

const trackClass = cn(
  '[&::-webkit-slider-runnable-track]:w-1.5 [&::-webkit-slider-runnable-track]:rounded-ait-pill [&::-webkit-slider-runnable-track]:bg-transparent',
  '[&::-moz-range-track]:w-1.5 [&::-moz-range-track]:rounded-ait-pill [&::-moz-range-track]:bg-transparent',
)

const thumbClass = cn(
  '[&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-ait-pill',
  '[&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-theater-backdrop [&::-webkit-slider-thumb]:bg-white',
  '[&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-ait-pill [&::-moz-range-thumb]:border-2',
  '[&::-moz-range-thumb]:border-theater-backdrop [&::-moz-range-thumb]:bg-white',
)

interface VerticalSliderProps {
  value: number
  onChange: (value: number) => void
  label: string
}

function VerticalSlider({ value, onChange, label }: VerticalSliderProps) {
  return (
    <div className="relative flex h-24 w-6 items-center justify-center">
      <div className="pointer-events-none absolute h-full w-1.5 rounded-ait-pill bg-white/25" aria-hidden="true" />
      <div
        className="pointer-events-none absolute bottom-0 w-1.5 rounded-ait-pill bg-white"
        style={{ height: `${value}%` }}
        aria-hidden="true"
      />
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label={label}
        className={cn(
          'h-24 w-6 cursor-pointer appearance-none bg-transparent [direction:rtl] [writing-mode:vertical-lr]',
          trackClass,
          thumbClass,
        )}
      />
    </div>
  )
}

interface HoverVolumeButtonProps {
  icon: ReactNode
  mutedIcon: ReactNode
  muted: boolean
  onToggleMuted: () => void
  gain: number
  onChangeGain: (value: number) => void
  label: string
}

// 컨트롤 바 아이콘: 클릭하면 on/off, 마우스를 올리면 세로 볼륨 슬라이더가 뜬다.
export function HoverVolumeButton({
  icon,
  mutedIcon,
  muted,
  onToggleMuted,
  gain,
  onChangeGain,
  label,
}: HoverVolumeButtonProps) {
  const [hovering, setHovering] = useState(false)

  return (
    <div
      className="relative flex items-center justify-center"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {hovering ? (
        <div className="absolute bottom-full left-1/2 mb-3 -translate-x-1/2 rounded-ait-s bg-theater-backdrop p-3 shadow-elevation-2">
          <VerticalSlider value={gain} onChange={onChangeGain} label={`${label} 조절`} />
        </div>
      ) : null}

      <button
        type="button"
        aria-pressed={muted}
        aria-label={muted ? `${label} 켜기` : `${label} 끄기`}
        onClick={onToggleMuted}
        className={cn(
          'flex size-10 items-center justify-center rounded-ait-s text-white transition-colors hover:bg-white/15',
          muted && 'text-theater-live',
        )}
      >
        {muted ? mutedIcon : icon}
      </button>
    </div>
  )
}
