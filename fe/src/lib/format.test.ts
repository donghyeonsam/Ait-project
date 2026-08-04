import { describe, expect, it } from 'vitest'
import { formatDateTime } from '@/lib/format'

describe('formatDateTime', () => {
  it('작성 시각을 초 단위까지 표시한다', () => {
    expect(formatDateTime('2026-07-28T10:04:05')).toBe('2026. 07. 28 10:04:05')
  })
})
