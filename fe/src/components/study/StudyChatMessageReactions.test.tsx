import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { StudyChatMessageReactions } from '@/components/study/StudyChatMessageReactions'

describe('StudyChatMessageReactions', () => {
  it('내 반응 상태를 표시하고 같은 이모지를 다시 토글할 수 있다', async () => {
    const user = userEvent.setup()
    const onToggle = vi.fn()

    render(
      <StudyChatMessageReactions
        messageId={17}
        currentUserId={3}
        reactions={[{ emoji: '👍', count: 2, userIds: [3, 8] }]}
        onToggle={onToggle}
      />,
    )

    const reaction = screen.getByRole('button', {
      name: '👍 반응 2개, 내가 반응함',
    })
    expect(reaction).toHaveAttribute('aria-pressed', 'true')

    await user.click(reaction)
    expect(onToggle).toHaveBeenCalledWith(17, '👍')
  })

  it('선택창을 유지하며 여러 이모지 반응을 연속으로 선택한다', async () => {
    const user = userEvent.setup()
    const onToggle = vi.fn()

    render(
      <StudyChatMessageReactions
        messageId={21}
        currentUserId={3}
        reactions={[]}
        onToggle={onToggle}
      />,
    )

    await user.click(
      screen.getByRole('button', { name: '이모지 반응 추가' }),
    )
    await user.click(screen.getByRole('button', { name: '🎉 반응' }))
    await user.click(screen.getByRole('button', { name: '👏 반응' }))

    expect(onToggle).toHaveBeenNthCalledWith(1, 21, '🎉')
    expect(onToggle).toHaveBeenNthCalledWith(2, 21, '👏')
    expect(
      screen.getByRole('dialog', { name: '메시지 반응 선택' }),
    ).toBeInTheDocument()
  })

  it('선택창 밖을 누르거나 Escape를 누르면 선택창을 닫는다', async () => {
    const user = userEvent.setup()

    render(
      <StudyChatMessageReactions
        messageId={21}
        currentUserId={3}
        reactions={[]}
        onToggle={vi.fn()}
      />,
    )

    const openPicker = () =>
      user.click(screen.getByRole('button', { name: '이모지 반응 추가' }))

    await openPicker()
    await user.click(document.body)
    expect(
      screen.queryByRole('dialog', { name: '메시지 반응 선택' }),
    ).not.toBeInTheDocument()

    await openPicker()
    await user.keyboard('{Escape}')
    expect(
      screen.queryByRole('dialog', { name: '메시지 반응 선택' }),
    ).not.toBeInTheDocument()
  })
})
