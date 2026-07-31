import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TagInput } from '@/components/form/TagInput'

describe('TagInput', () => {
  it('입력값에 맞는 태그를 필터링하고 키보드로 추가한다', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <TagInput
        tags={[]}
        onChange={onChange}
        suggestions={['기술면접', '직무면접', '취업준비']}
      />,
    )

    const input = screen.getByRole('combobox', { name: '태그 입력' })
    await user.type(input, '기술')

    expect(
      screen.getByRole('listbox', { name: '태그 자동완성' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('option', { name: '#기술면접' })).toBeInTheDocument()
    expect(
      screen.queryByRole('option', { name: '#직무면접' }),
    ).not.toBeInTheDocument()

    await user.keyboard('{ArrowDown}{Enter}')

    expect(onChange).toHaveBeenCalledWith(['기술면접'])
    expect(input).toHaveValue('')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('이미 선택한 태그는 자동완성에서 제외한다', async () => {
    const user = userEvent.setup()
    render(
      <TagInput
        tags={['기술면접']}
        onChange={vi.fn()}
        suggestions={['기술면접', '직무면접']}
      />,
    )

    await user.type(
      screen.getByRole('combobox', { name: '태그 입력' }),
      '면접',
    )

    expect(
      screen.queryByRole('option', { name: '#기술면접' }),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('option', { name: '#직무면접' })).toBeInTheDocument()
  })
})
