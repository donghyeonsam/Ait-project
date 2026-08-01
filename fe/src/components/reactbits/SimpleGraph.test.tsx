import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { SimpleGraph } from '@/components/reactbits/SimpleGraph'

const data = [
  { label: '07. 01', value: 5 },
  { label: '07. 08', value: 6.5 },
  { label: '07. 15', value: 7.2 },
]

describe('SimpleGraph', () => {
  it('곡선 경로와 접근 가능한 데이터 점을 렌더링한다', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <SimpleGraph
        data={data}
        title="점수 추이"
        minValue={0}
        maxValue={10}
        valueFormatter={(value) => value.toFixed(1)}
      />,
    )

    expect(container.querySelector('.simple-graph__line')).toHaveAttribute(
      'd',
      expect.stringContaining('C'),
    )
    expect(container.querySelectorAll('.simple-graph__point')).toHaveLength(3)
    expect(screen.getByRole('img', { name: '07. 01, 5.0' })).toBeInTheDocument()

    await user.tab()
    expect(screen.getByRole('img', { name: '07. 01, 5.0' })).toHaveFocus()
  })

  it('데이터가 없으면 빈 그래프를 설명한다', () => {
    render(<SimpleGraph data={[]} title="점수 추이" />)

    expect(
      screen.getByRole('img', {
        name: '점수 추이. 표시할 데이터가 없습니다.',
      }),
    ).toBeInTheDocument()
  })
})
