import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TrendingKeywordTicker } from './TrendingKeywordTicker'

describe('TrendingKeywordTicker', () => {
  it('인기 태그가 없을 때도 태그 행의 높이를 유지한다', () => {
    const { container } = render(
      <TrendingKeywordTicker keywords={[]} onSelect={vi.fn()} />,
    )

    expect(container.firstElementChild).toHaveClass('h-9')
  })
})
