import { FilePenLine, FileText, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getMyCoverLetters,
  type CoverLetterListItem,
} from '@/api/cover-letters'
import { ApiError, toErrorMessage } from '@/api/http'
import { getMyResume } from '@/api/resume'
import { LineSidebar } from '@/components/reactbits/LineSidebar'
import { Button } from '@/components/ui/button'
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
}: DocumentBoxDialogProps) {
  const navigate = useNavigate()
  const [resumeUserName, setResumeUserName] = useState<string | null>(null)
  const [isResumeLoading, setIsResumeLoading] = useState(true)
  const [resumeError, setResumeError] = useState<string | null>(null)
  const [coverLetters, setCoverLetters] = useState<CoverLetterListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return

    let active = true

    getMyResume()
      .then((response) => {
        if (!active) return
        setResumeUserName(response.userName)
        setResumeError(null)
      })
      .catch((requestError: unknown) => {
        if (!active) return
        // 이력서를 아직 작성하지 않은 사용자는 정상 상태(404)이므로 오류로 취급하지 않는다.
        if (requestError instanceof ApiError && requestError.status === 404) {
          setResumeUserName(null)
          setResumeError(null)
          return
        }
        setResumeError(toErrorMessage(requestError))
      })
      .finally(() => {
        if (active) setIsResumeLoading(false)
      })

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
                {!isResumeLoading && !resumeError && !resumeUserName ? (
                  <Button
                    type="button"
                    variant="text"
                    size="icon"
                    className="ml-auto -my-2 -mr-2"
                    aria-label="이력서 추가"
                    // TODO: 실제 이력서 생성 API 연동 필요 — 지금은 이력서 작성 화면으로 이동만 한다.
                    onClick={() => openDocument('/mypage/documents/resume')}
                  >
                    <Plus aria-hidden="true" />
                  </Button>
                ) : null}
              </div>
              {isResumeLoading ? (
                <p className="py-8 text-center text-body-2 text-text-secondary" role="status">
                  이력서를 불러오는 중입니다.
                </p>
              ) : resumeError ? (
                <p className="py-8 text-center text-body-2 text-status-error" role="alert">
                  {resumeError}
                </p>
              ) : resumeUserName ? (
                <LineSidebar
                  {...lineSidebarProps}
                  items={[`${resumeUserName}님의 이력서`]}
                  showIndex={false}
                  ariaLabel="이력서"
                  onItemClick={() => openDocument('/mypage/documents/resume')}
                />
              ) : (
                <p className="py-8 text-center text-body-2 text-text-secondary">
                  등록된 이력서가 없습니다.
                </p>
              )}
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
                <Button
                  type="button"
                  variant="text"
                  size="icon"
                  className="ml-auto -my-2 -mr-2"
                  aria-label="자기소개서 추가"
                  onClick={() => openDocument('/mypage/documents/cover-letters/new')}
                >
                  <Plus aria-hidden="true" />
                </Button>
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
