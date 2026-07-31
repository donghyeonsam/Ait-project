import Image from '@tiptap/extension-image'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { ResizableImageView } from '@/components/editor/ResizableImageView'

// 크기(width %)와 정렬(data-align)을 HTML 속성으로 저장해 상세 화면에서도 그대로 재현되게 한다.
export const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (element) => element.style.width || element.getAttribute('width'),
        renderHTML: (attributes) =>
          attributes.width ? { style: `width: ${attributes.width}` } : {},
      },
      align: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-align'),
        renderHTML: (attributes) =>
          attributes.align ? { 'data-align': attributes.align } : {},
      },
    }
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView)
  },
})
