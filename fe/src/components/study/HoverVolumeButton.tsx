import { useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

const trackClass = cn(
  '[&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-ait-pill [&::-webkit-slider-runnable-track]:bg-transparent',
  '[&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-ait-pill [&::-moz-range-track]:bg-transparent',
)

const thumbClass = cn(
  '[&::-webkit-slider-thumb]:mt-[-5px] [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-ait-pill',
  '[&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-theater-backdrop [&::-webkit-slider-thumb]:bg-white',
  '[&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-ait-pill [&::-moz-range-thumb]:border-2',
  '[&::-moz-range-thumb]:border-theater-backdrop [&::-moz-range-thumb]:bg-white',
)

interface VerticalSliderProps {
  value: number
  onChange: (value: number) => void
  label: string
  disabled?: boolean
}

function VerticalSlider({ value, onChange, label, disabled = false }: VerticalSliderProps) {
  return (
    <div className={cn('relative flex h-24 w-6 items-center justify-center', disabled && 'opacity-40')}>
      <div
        className="pointer-events-none absolute left-1/2 h-full w-1.5 -translate-x-1/2 rounded-ait-pill bg-white/25"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute bottom-0 left-1/2 w-1.5 -translate-x-1/2 rounded-ait-pill bg-white"
        style={{ height: `${value}%` }}
        aria-hidden="true"
      />
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label={label}
        className={cn(
          // 표준 가로 슬라이더를 90도 회전시켜 세로로 쓴다. writing-mode 기반 세로 슬라이더는
          // 브라우저에서 thumb가 트랙 중심을 벗어나 렌더링되는 문제가 있어, 이미 중앙 정렬이 검증된
          // 가로 슬라이더(MasterVolumeSlider)와 동일한 방식을 회전만 시켜 재사용한다.
          'absolute left-1/2 top-1/2 h-4 w-24 -translate-x-1/2 -translate-y-1/2 -rotate-90 cursor-pointer appearance-none bg-transparent disabled:cursor-not-allowed',
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
        // pb-3(투명 여백)로 버튼과 팝업 사이 틈까지 이 요소의 호버 영역에 포함시킨다.
        // margin으로 간격을 두면 그 틈에서 마우스가 wrapper 밖으로 빠져나가 mouseleave가 발생하고,
        // 팝업이 사라지면서 볼륨 조절 자체가 불가능해진다.
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 pb-3">
          <div className="rounded-ait-s bg-theater-backdrop p-3 shadow-elevation-2">
            {/* 꺼짐 상태에서는 0으로 내려가 보이게 하되, gain 값 자체는 그대로 둬서 다시 켜면 원래 값으로 돌아오게 한다. */}
            <VerticalSlider
              value={muted ? 0 : gain}
              onChange={onChangeGain}
              label={`${label} 조절`}
              disabled={muted}
            />
          </div>
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
