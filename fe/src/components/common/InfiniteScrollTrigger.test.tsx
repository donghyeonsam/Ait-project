import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { InfiniteScrollTrigger } from '@/components/common/InfiniteScrollTrigger'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('InfiniteScrollTrigger', () => {
  it('목록 끝이 화면에 들어오면 다음 묶음을 요청한다', () => {
    let callback: IntersectionObserverCallback | null = null
    const disconnect = vi.fn()

    class IntersectionObserverMock {
      constructor(observerCallback: IntersectionObserverCallback) {
        callback = observerCallback
      }

      observe = vi.fn()
      disconnect = disconnect
      unobserve = vi.fn()
      takeRecords = vi.fn(() => [])
      root = null
      rootMargin = '0px'
      thresholds = [0]
    }

    vi.stubGlobal('IntersectionObserver', IntersectionObserverMock)
    const onLoadMore = vi.fn()

    render(
      <InfiniteScrollTrigger
        hasMore
        isLoading={false}
        itemCount={6}
        onLoadMore={onLoadMore}
      />,
    )

    act(() => {
      callback?.(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      )
    })

    expect(onLoadMore).toHaveBeenCalledTimes(1)
    expect(disconnect).toHaveBeenCalled()
  })

  it('관찰 기능을 지원하지 않으면 수동 더보기 버튼을 제공한다', async () => {
    vi.stubGlobal('IntersectionObserver', undefined)
    const user = userEvent.setup()
    const onLoadMore = vi.fn()

    render(
      <InfiniteScrollTrigger
        hasMore
        isLoading={false}
        itemCount={6}
        onLoadMore={onLoadMore}
        fallbackLabel="더보기"
      />,
    )

    await user.click(screen.getByRole('button', { name: '더보기' }))
    expect(onLoadMore).toHaveBeenCalledTimes(1)
  })

  it('추가 로딩에 실패하면 오류와 재시도 행동을 보여준다', async () => {
    const user = userEvent.setup()
    const onLoadMore = vi.fn()

    render(
      <InfiniteScrollTrigger
        hasMore
        isLoading={false}
        itemCount={6}
        onLoadMore={onLoadMore}
        errorMessage="목록을 더 불러오지 못했어요."
      />,
    )

    expect(screen.getByRole('alert')).toHaveTextContent(
      '목록을 더 불러오지 못했어요.',
    )
    await user.click(screen.getByRole('button', { name: '다시 불러오기' }))
    expect(onLoadMore).toHaveBeenCalledTimes(1)
  })
})
