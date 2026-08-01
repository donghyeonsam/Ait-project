import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getInterviewReportDetail } from '@/api/ai-interviews'
import { ReportModal } from '@/components/dashboard/ReportModal'
import type { InterviewRecord } from '@/types/dashboard'

vi.mock('@/api/ai-interviews', () => ({
  getInterviewReportDetail: vi.fn(() => new Promise(() => {})),
}))

const record: InterviewRecord = {
  id: 17,
  date: '2026. 08. 01',
  type: '기술',
  difficulty: '보통',
  title: '프론트엔드 기술 면접',
  score: 8.4,
  delta: 0.6,
  duration: '18분',
  status: 'completed',
}

function renderModal(open: boolean, onClose = vi.fn()) {
  return render(
    <MemoryRouter>
      <ReportModal open={open} record={record} onClose={onClose} />
    </MemoryRouter>,
  )
}

describe('ReportModal', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: true,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
  })

  it('닫힌 상태에서는 대화상자를 DOM에 남기지 않는다', () => {
    renderModal(false)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(getInterviewReportDetail).not.toHaveBeenCalled()
  })

  it('열리면 닫기 버튼으로 포커스를 이동하고 Esc로 닫는다', async () => {
    const onClose = vi.fn()
    renderModal(true, onClose)

    const dialog = screen.getByRole('dialog', {
      name: '프론트엔드 기술 면접',
    })
    const closeButton = screen.getByRole('button', { name: '닫기' })

    expect(dialog).toHaveAttribute('aria-modal', 'true')
    await waitFor(() => expect(closeButton).toHaveFocus())

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(onClose).toHaveBeenCalledOnce()
    expect(getInterviewReportDetail).toHaveBeenCalledWith(record.id)
  })
})
