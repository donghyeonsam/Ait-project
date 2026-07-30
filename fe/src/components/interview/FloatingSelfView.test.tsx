import type { RefObject } from 'react'
import { act, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FloatingSelfView } from '@/components/interview/FloatingSelfView'

describe('FloatingSelfView', () => {
  it('화면 크기가 바뀌면 내 카메라를 보이는 영역 안으로 이동한다', async () => {
    const bounds = document.createElement('div')
    const boundsRef = {
      current: bounds,
    } as RefObject<HTMLDivElement | null>
    Object.defineProperties(bounds, {
      clientWidth: { configurable: true, value: 400 },
      clientHeight: { configurable: true, value: 400 },
    })

    render(
      <FloatingSelfView
        stream={null}
        boundsRef={boundsRef}
        initialBottomOffset={200}
      />,
    )

    const selfView = await screen.findByLabelText(
      '내 카메라 화면 (드래그로 이동 가능)',
    )
    await waitFor(() => {
      expect(selfView).toHaveStyle({ left: '16px', top: '52px' })
    })

    Object.defineProperties(bounds, {
      clientWidth: { configurable: true, value: 120 },
      clientHeight: { configurable: true, value: 100 },
    })
    act(() => window.dispatchEvent(new Event('resize')))

    await waitFor(() => {
      expect(selfView).toHaveStyle({ left: '0px', top: '0px' })
    })
  })
})
