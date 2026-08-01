import { SimpleGraph } from '@/components/reactbits/SimpleGraph'
import type { ScoreTrendPoint } from '@/types/dashboard'

interface ScoreTrendChartProps {
  data: ScoreTrendPoint[]
  filled?: boolean
  className?: string
}

// 면접 점수 데이터를 범용 SimpleGraph 형식으로 변환해 0~10 점수축에 표시한다.
export function ScoreTrendChart({ data, filled = false, className }: ScoreTrendChartProps) {
  const description = data.length
    ? `${data[0].date} ${data[0].score.toFixed(1)}점부터 ${data.at(-1)?.date} ${data.at(-1)?.score.toFixed(1)}점까지의 추이입니다.`
    : '표시할 면접 점수 데이터가 없습니다.'

  return (
    <SimpleGraph
      data={data.map((item) => ({ value: item.score, label: item.date }))}
      className={className}
      title="종합 점수 추이"
      description={description}
      lineColor="var(--color-action-primary)"
      dotColor="var(--color-action-primary)"
      animationDuration={1.25}
      gridStyle="dashed"
      gridLines="horizontal"
      dotSize={7}
      dotHoverGlow
      curved
      gradientFade={filled}
      graphLineThickness={3}
      animateOnScroll
      minValue={0}
      maxValue={10}
      tickCount={5}
      valueFormatter={(value) => value.toFixed(1)}
    />
  )
}
