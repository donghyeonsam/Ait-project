import Image from '@tiptap/extension-image'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { ResizableImageView } from '@/components/editor/ResizableImageView'

const toFiniteNumber = (value: unknown) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

const renderImageLayout = (attributes: Record<string, unknown>) => {
  const width =
    typeof attributes.width === 'string' ? attributes.width : null
  const offsetX = Math.round(toFiniteNumber(attributes.offsetX))
  const offsetY = Math.round(toFiniteNumber(attributes.offsetY))
  const styles: string[] = []

  if (width) styles.push(`width: ${width}`)
  if (offsetX !== 0 || offsetY !== 0) {
    styles.push(`transform: translate3d(${offsetX}px, ${offsetY}px, 0)`)
  }

  return {
    ...(styles.length > 0 ? { style: styles.join('; ') } : {}),
    ...(offsetX !== 0 || offsetY !== 0
      ? {
          'data-offset-x': String(offsetX),
          'data-offset-y': String(offsetY),
        }
      : {}),
  }
}

// 크기·정렬·드래그 위치를 HTML 속성으로 저장해 상세 화면에서도 그대로 재현되게 한다.
export const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (element) => element.style.width || element.getAttribute('width'),
        renderHTML: renderImageLayout,
      },
      align: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-align'),
        renderHTML: (attributes) =>
          attributes.align ? { 'data-align': attributes.align } : {},
      },
      offsetX: {
        default: 0,
        parseHTML: (element) =>
          toFiniteNumber(element.getAttribute('data-offset-x')),
        renderHTML: () => ({}),
      },
      offsetY: {
        default: 0,
        parseHTML: (element) =>
          toFiniteNumber(element.getAttribute('data-offset-y')),
        renderHTML: () => ({}),
      },
    }
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView)
  },
})
