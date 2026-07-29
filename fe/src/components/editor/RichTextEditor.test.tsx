import type { Editor } from '@tiptap/react'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { RichTextEditor } from '@/components/editor/RichTextEditor'

describe('RichTextEditor', () => {
  it('글꼴 오른쪽에서 글자 크기를 선택하고 작성 HTML에 반영한다', async () => {
    const user = userEvent.setup()
    const onUpdate = vi.fn()
    let editor: Editor | null = null

    render(
      <RichTextEditor
        placeholderKey="default"
        placeholderLines={['내용을 입력해주세요.']}
        onReady={(instance) => {
          editor = instance
        }}
        onUpdate={onUpdate}
      />,
    )

    const fontDropdown = await screen.findByRole('button', { name: '글꼴' })
    const fontSizeDropdown = screen.getByRole('button', { name: '글자 크기' })

    expect(
      fontDropdown.compareDocumentPosition(fontSizeDropdown) &
      Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()

    await waitFor(() => expect(editor).not.toBeNull())
    act(() => {
      editor?.commands.setContent('크기 테스트')
      editor?.commands.selectAll()
    })
    await user.click(fontSizeDropdown)
    await user.click(screen.getByRole('option', { name: '18px' }))

    await waitFor(() => {
      const latestPayload = onUpdate.mock.calls.at(-1)?.[0] as
        | { html: string }
        | undefined
      expect(latestPayload?.html).toContain('font-size: 18px')
    })
  })
})
