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

  const searchProps = {
    searchTargets: { titleContent: true, tags: true },
    onSearchTargetsChange: vi.fn(),
  }

  it('2자 이상 입력하면 자동완성을 조회하고 키보드로 선택한다', async () => {
    const user = userEvent.setup()
    const onSearch = vi.fn()
    render(<HeroSearch value="" onSearch={onSearch} {...searchProps} />)

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
    render(<HeroSearch value="" onSearch={vi.fn()} {...searchProps} />)

    await user.type(
      screen.getByRole('combobox', { name: '커뮤니티 검색' }),
      '카카',
    )

    await waitFor(() => {
      expect(fetchSearchSuggestions).toHaveBeenCalledWith('카카')
    })
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('전체와 개별 검색 범위를 체크박스로 변경한다', async () => {
    const user = userEvent.setup()
    const onSearchTargetsChange = vi.fn()
    const { rerender } = render(
      <HeroSearch
        value=""
        onSearch={vi.fn()}
        searchTargets={{ titleContent: true, tags: true }}
        onSearchTargetsChange={onSearchTargetsChange}
      />,
    )

    expect(screen.getByRole('checkbox', { name: '전체' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: '제목+내용' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: '태그' })).toBeChecked()

    await user.click(screen.getByRole('checkbox', { name: '태그' }))
    expect(onSearchTargetsChange).toHaveBeenLastCalledWith({
      titleContent: true,
      tags: false,
    })

    rerender(
      <HeroSearch
        value=""
        onSearch={vi.fn()}
        searchTargets={{ titleContent: true, tags: false }}
        onSearchTargetsChange={onSearchTargetsChange}
      />,
    )
    await user.click(screen.getByRole('checkbox', { name: '전체' }))
    expect(onSearchTargetsChange).toHaveBeenLastCalledWith({
      titleContent: true,
      tags: true,
    })
  })
})
