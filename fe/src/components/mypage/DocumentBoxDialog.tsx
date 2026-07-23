import { FilePenLine, FileText } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getMyCoverLetters,
  type CoverLetterListItem,
} from '@/api/cover-letters'
import { toErrorMessage } from '@/api/http'
import type { Resume } from '@/api/resume'
import { LineSidebar } from '@/components/reactbits/LineSidebar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface DocumentBoxDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  resume: Resume
}

const lineSidebarProps = {
  accentColor: 'var(--color-action-primary)',
  textColor: 'var(--color-text-secondary)',
  markerColor: 'var(--color-border-default)',
  showIndex: true,
  showMarker: true,
  proximityRadius: 100,
  maxShift: 30,
  falloff: 'smooth' as const,
  markerLength: 60,
  markerGap: 0,
  tickScale: 0.5,
  scaleTick: true,
  itemGap: 20,
  fontSize: 1.1,
  smoothing: 100,
  defaultActive: null,
}

// 마이페이지를 벗어나지 않고 이력서와 자기소개서 편집 대상을 선택하게 한다.
export function DocumentBoxDialog({
  open,
  onOpenChange,
  resume,
}: DocumentBoxDialogProps) {
  const navigate = useNavigate()
  const [coverLetters, setCoverLetters] = useState<CoverLetterListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return

    let active = true

    getMyCoverLetters()
      .then((response) => {
        if (!active) return
        setCoverLetters(response.coverLetters)
        setError(null)
      })
      .catch((requestError: unknown) => {
        if (active) setError(toErrorMessage(requestError))
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [open])

  const openDocument = (path: string) => {
    onOpenChange(false)
    navigate(path)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="document-box-dialog rounded-none p-0"
        overlayClassName="document-box-overlay"
      >
        <div className="flex h-full min-h-0 flex-col">
          <DialogHeader className="shrink-0 border-b border-border-default px-7 py-7 pr-16">
            <span className="mb-2 inline-flex size-10 items-center justify-center rounded-ait-s bg-action-primary text-surface-default">
              <FilePenLine aria-hidden="true" />
            </span>
            <DialogTitle>서류함</DialogTitle>
            <DialogDescription>
              작성하거나 수정할 서류를 선택하세요.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-7 py-6">
            <section aria-labelledby="document-resume-title">
              <div className="mb-2 flex items-center gap-2">
                <FileText className="size-5 text-action-primary" aria-hidden="true" />
                <h2
                  id="document-resume-title"
                  className="text-body-2 font-semibold text-action-primary"
                >
                  이력서
                </h2>
              </div>
              <LineSidebar
                {...lineSidebarProps}
                items={[`${resume.userName}님의 이력서`]}
                showIndex={false}
                ariaLabel="이력서"
                onItemClick={() => openDocument('/mypage/documents/resume')}
              />
            </section>

            <section
              className="mt-8 border-t border-border-default pt-6"
              aria-labelledby="document-cover-letter-title"
            >
              <div className="mb-2 flex items-center gap-2">
                <FilePenLine className="size-5 text-action-primary" aria-hidden="true" />
                <h2
                  id="document-cover-letter-title"
                  className="text-body-2 font-semibold text-action-primary"
                >
                  자기소개서
                </h2>
                {!isLoading && !error ? (
                  <span className="text-caption text-text-secondary">
                    {coverLetters.length}개
                  </span>
                ) : null}
              </div>

              {isLoading ? (
                <p className="py-8 text-center text-body-2 text-text-secondary" role="status">
                  자기소개서를 불러오는 중입니다.
                </p>
              ) : error ? (
                <p className="py-8 text-center text-body-2 text-status-error" role="alert">
                  {error}
                </p>
              ) : coverLetters.length ? (
                <LineSidebar
                  {...lineSidebarProps}
                  items={coverLetters.map((coverLetter) => coverLetter.title)}
                  ariaLabel="저장된 자기소개서"
                  onItemClick={(index) => {
                    const selected = coverLetters[index]
                    if (selected) {
                      openDocument(
                        `/mypage/documents/cover-letters/${selected.coverLetterId}`,
                      )
                    }
                  }}
                />
              ) : (
                <p className="py-8 text-center text-body-2 text-text-secondary">
                  저장된 자기소개서가 없습니다.
                </p>
              )}
            </section>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
