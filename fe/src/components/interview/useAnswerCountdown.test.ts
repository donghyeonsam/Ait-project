import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useAnswerCountdown } from '@/components/interview/useAnswerCountdown'

describe('useAnswerCountdown', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('활성화되면 제한 시간을 세고 0초에 한 번만 만료시킨다', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-30T00:00:00Z'))
    const onExpire = vi.fn()
    const { result } = renderHook(() =>
      useAnswerCountdown({
        activeKey: 'question-1',
        durationSeconds: 3,
        onExpire,
      }),
    )

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(result.current).toBe(3)

    act(() => {
      vi.advanceTimersByTime(2_100)
    })
    expect(result.current).toBe(1)

    act(() => {
      vi.advanceTimersByTime(1_000)
    })
    expect(result.current).toBe(0)
    expect(onExpire).toHaveBeenCalledTimes(1)

    act(() => {
      vi.advanceTimersByTime(2_000)
    })
    expect(onExpire).toHaveBeenCalledTimes(1)
  })

  it('새 답변 키가 시작되면 제한 시간으로 초기화한다', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-30T00:00:00Z'))
    const { result, rerender } = renderHook(
      ({ activeKey }) =>
        useAnswerCountdown({
          activeKey,
          durationSeconds: 60,
          onExpire: vi.fn(),
        }),
      { initialProps: { activeKey: 'question-1' as string | null } },
    )

    act(() => {
      vi.advanceTimersByTime(20_100)
    })
    expect(result.current).toBe(40)

    rerender({ activeKey: 'question-2' })
    expect(result.current).toBe(60)
  })
})
