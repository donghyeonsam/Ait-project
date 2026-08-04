import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchBackendAssetBlob } from '@/api/http'
import { AuthenticatedHtml } from '@/components/common/AuthenticatedHtml'
import { AuthenticatedImage } from '@/components/common/AuthenticatedImage'

vi.mock('@/api/http', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/http')>()
  return {
    ...actual,
    fetchBackendAssetBlob: vi.fn(),
  }
})

const createObjectURL = vi.fn(() => 'blob:authenticated-image')
const revokeObjectURL = vi.fn()

describe('authenticated community images', () => {
  beforeEach(() => {
    vi.mocked(fetchBackendAssetBlob).mockResolvedValue(
      new Blob(['image'], { type: 'image/png' }),
    )
    createObjectURL.mockClear()
    revokeObjectURL.mockClear()
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('보호된 이미지 URL을 인증 Blob URL로 바꿔 표시한다', async () => {
    const { unmount } = render(
      <AuthenticatedImage
        src="/backend/images/stored-image.png"
        alt="업로드 이미지"
      />,
    )

    const image = screen.getByRole('img', { name: '업로드 이미지' })
    expect(image).not.toHaveAttribute('src')

    await waitFor(() => {
      expect(fetchBackendAssetBlob).toHaveBeenCalledWith(
        '/backend/images/stored-image.png',
      )
      expect(image).toHaveAttribute('src', 'blob:authenticated-image')
    })

    unmount()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:authenticated-image')
  })

  it('본문 HTML의 영구 경로는 보존하고 화면 src만 Blob URL로 교체한다', async () => {
    render(
      <AuthenticatedHtml
        html={'<p>본문</p><img src="/backend/images/stored-image.png" alt="본문 이미지">'}
      />,
    )

    // Blob URL이 반영되면 본문 HTML이 통째로 교체되므로 이미지 요소를 다시 조회한다.
    await waitFor(() => {
      expect(screen.getByRole('img', { name: '본문 이미지' })).toHaveAttribute(
        'src',
        'blob:authenticated-image',
      )
    })
    expect(screen.getByRole('img', { name: '본문 이미지' })).toHaveAttribute(
      'data-authenticated-image-src',
      '/backend/images/stored-image.png',
    )
  })
})
