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

  it('반응 추가 버튼에서 빠른 반응을 선택한다', async () => {
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

    expect(onToggle).toHaveBeenCalledWith(21, '🎉')
    expect(
      screen.queryByRole('dialog', { name: '메시지 반응 선택' }),
    ).not.toBeInTheDocument()
  })
})
