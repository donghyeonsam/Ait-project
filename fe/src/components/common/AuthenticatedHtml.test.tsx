import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchBackendAssetBlob } from '@/api/http'
import { AuthenticatedHtml } from '@/components/common/AuthenticatedHtml'

vi.mock('@/api/http', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/http')>()
  return { ...actual, fetchBackendAssetBlob: vi.fn() }
})

const contentHtml =
  '<p>본문</p><img src="/backend/images/boards/pic.png" alt="사진">'

const createObjectURL = vi.fn(() => 'blob:authenticated-html')
const revokeObjectURL = vi.fn()

// 부모 리렌더가 dangerouslySetInnerHTML을 다시 적용하는 상황을 재현한다.
function RerenderHarness() {
  const [, setCount] = useState(0)
  return (
    <div>
      <button type="button" onClick={() => setCount((count) => count + 1)}>
        리렌더
      </button>
      <AuthenticatedHtml html={contentHtml} />
    </div>
  )
}

describe('AuthenticatedHtml', () => {
  beforeEach(() => {
    createObjectURL.mockClear()
    revokeObjectURL.mockClear()
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })
    vi.mocked(fetchBackendAssetBlob).mockResolvedValue(new Blob(['image']))
  })

  it('보호 이미지를 인증 Blob URL로 표시한다', async () => {
    render(<AuthenticatedHtml html={contentHtml} />)

    await waitFor(() =>
      expect(screen.getByAltText('사진')).toHaveAttribute(
        'src',
        'blob:authenticated-html',
      ),
    )
    expect(fetchBackendAssetBlob).toHaveBeenCalledWith(
      '/backend/images/boards/pic.png',
    )
  })

  it('첨부파일 다운로드 등으로 부모가 리렌더돼도 이미지가 깨지지 않는다', async () => {
    render(<RerenderHarness />)

    await waitFor(() =>
      expect(screen.getByAltText('사진')).toHaveAttribute(
        'src',
        'blob:authenticated-html',
      ),
    )

    fireEvent.click(screen.getByRole('button', { name: '리렌더' }))

    expect(screen.getByAltText('사진')).toHaveAttribute(
      'src',
      'blob:authenticated-html',
    )
  })

  it('이미지 조회에 실패하면 오류 표식을 남기고 본문은 유지한다', async () => {
    vi.mocked(fetchBackendAssetBlob).mockRejectedValue(new Error('실패'))
    render(<AuthenticatedHtml html={contentHtml} />)

    await waitFor(() =>
      expect(screen.getByAltText('사진')).toHaveAttribute(
        'data-image-load-error',
        'true',
      ),
    )
    expect(screen.getByText('본문')).toBeInTheDocument()
  })
})
