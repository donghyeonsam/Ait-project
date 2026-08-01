import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchSearchSuggestions } from '@/api/community'
import { HeroSearch } from '@/components/community/HeroSearch'

vi.mock('@/api/community', () => ({
  fetchSearchSuggestions: vi.fn(),
}))

describe('HeroSearch', () => {
  beforeEach(() => {
    vi.mocked(fetchSearchSuggestions).mockResolvedValue([
      '카카오',
      '카카오엔터프라이즈',
    ])
  })

  it('2자 이상 입력하면 자동완성을 조회하고 키보드로 선택한다', async () => {
    const user = userEvent.setup()
    const onSearch = vi.fn()
    render(<HeroSearch value="" onSearch={onSearch} />)

    const input = screen.getByRole('combobox', { name: '커뮤니티 검색' })
    await user.type(input, '카카')

    expect(
      await screen.findByRole('listbox', { name: '검색어 자동완성' }),
    ).toBeInTheDocument()
    expect(fetchSearchSuggestions).toHaveBeenCalledWith('카카')

    await user.keyboard('{ArrowDown}{Enter}')

    expect(onSearch).toHaveBeenCalledWith('카카오')
    expect(input).toHaveValue('카카오')
    await waitFor(() => {
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    })
  })

  it('자동완성 조회가 실패하면 기존 후보를 닫는다', async () => {
    vi.mocked(fetchSearchSuggestions).mockRejectedValue(
      new Error('suggestion failed'),
    )
    const user = userEvent.setup()
    render(<HeroSearch value="" onSearch={vi.fn()} />)

    await user.type(
      screen.getByRole('combobox', { name: '커뮤니티 검색' }),
      '카카',
    )

    await waitFor(() => {
      expect(fetchSearchSuggestions).toHaveBeenCalledWith('카카')
    })
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })
})
