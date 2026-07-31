import type { HTMLAttributes } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { NodeViewProps } from '@tiptap/react'
import { ResizableImageView } from '@/components/editor/ResizableImageView'

vi.mock('@tiptap/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tiptap/react')>()
  const { forwardRef } = await import('react')
  return {
    ...actual,
    NodeViewWrapper: forwardRef<
      HTMLDivElement,
      HTMLAttributes<HTMLDivElement> & { as?: string }
    >((props, ref) => <div ref={ref} {...props} />),
  }
})

const rect = (
  left: number,
  top: number,
  width: number,
  height: number,
): DOMRect =>
  ({
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    x: left,
    y: top,
    toJSON: () => ({}),
  }) as DOMRect

const renderImageView = (updateAttributes = vi.fn()) => {
  render(
    <ResizableImageView
      {...({
        node: {
          attrs: {
            src: 'data:image/png;base64,aW1hZ2U=',
            alt: '테스트 이미지',
            width: '50%',
            align: 'left',
            offsetX: 0,
            offsetY: 0,
          },
        },
        updateAttributes,
        selected: true,
        editor: { isEditable: true },
      } as unknown as NodeViewProps)}
    />,
  )

  const figure = screen.getByRole('group', {
    name: '이미지 위치 및 크기 조절',
  })
  const wrapper = figure.parentElement as HTMLDivElement
  Object.defineProperties(figure, {
    offsetWidth: { configurable: true, value: 300 },
    offsetHeight: { configurable: true, value: 200 },
  })
  Object.defineProperty(wrapper, 'offsetWidth', {
    configurable: true,
    value: 600,
  })
  figure.getBoundingClientRect = () => rect(100, 100, 300, 200)
  wrapper.getBoundingClientRect = () => rect(0, 0, 600, 500)

  return { figure, updateAttributes }
}

describe('ResizableImageView', () => {
  it('네 꼭짓점 핸들을 노출하고 오른쪽 아래 드래그로 비율을 유지해 확대한다', () => {
    const { updateAttributes } = renderImageView()
    const handle = screen.getByRole('slider', {
      name: '오른쪽 아래 이미지 크기 조절',
    })

    expect(screen.getAllByRole('slider')).toHaveLength(4)

    fireEvent.pointerDown(handle, {
      button: 0,
      clientX: 300,
      clientY: 200,
    })
    fireEvent.pointerMove(window, { clientX: 360, clientY: 240 })

    expect(updateAttributes).toHaveBeenLastCalledWith({
      width: '60%',
      offsetX: 0,
      offsetY: 0,
    })

    fireEvent.pointerUp(window)
  })

  it('이미지 본체를 드래그하면 에디터 경계 안에서 위치를 이동한다', () => {
    const { figure, updateAttributes } = renderImageView()

    fireEvent.pointerDown(figure, {
      button: 0,
      clientX: 150,
      clientY: 150,
    })
    fireEvent.pointerMove(window, { clientX: 250, clientY: 230 })

    expect(updateAttributes).toHaveBeenLastCalledWith({
      offsetX: 100,
      offsetY: 80,
    })
    expect(figure).toHaveStyle({
      transform: 'translate3d(100px, 80px, 0)',
    })

    fireEvent.pointerUp(window)
  })
})
