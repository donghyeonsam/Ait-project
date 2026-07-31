import Image from '@tiptap/extension-image'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { AuthenticatedEditorImageView } from '@/components/editor/AuthenticatedEditorImageView'

// 노드의 영구 src는 유지하고 편집 화면의 실제 img만 인증 Blob URL로 렌더링한다.
export const AuthenticatedEditorImage = Image.extend({
  addNodeView() {
    return ReactNodeViewRenderer(AuthenticatedEditorImageView)
  },
})
