import type { NodeViewProps } from '@tiptap/react'
import { NodeViewWrapper } from '@tiptap/react'
import { AuthenticatedImage } from '@/components/common/AuthenticatedImage'

export function AuthenticatedEditorImageView({ node }: NodeViewProps) {
  return (
    <NodeViewWrapper>
      <AuthenticatedImage
        src={node.attrs.src as string}
        alt={(node.attrs.alt as string | null) ?? ''}
        draggable={false}
      />
    </NodeViewWrapper>
  )
}
