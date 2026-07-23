import { Plus, Trash2 } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import {
  getCoverLetter,
  getMyCoverLetters,
  updateCoverLetter,
  type CoverLetterDetail,
  type CoverLetterListItem,
} from '@/api/cover-letters'
import { toErrorMessage } from '@/api/http'
import {
  DocumentModalShell,
  DocumentSection,
  DynamicCard,
  FormField,
} from '@/components/mypage/DocumentModalShell'
import { CoverLetterPicker } from '@/components/mypage/CoverLetterPicker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

interface CoverLetterModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleDateString('ko-KR')
}

export function CoverLetterModal({ open, onOpenChange }: CoverLetterModalProps) {
  const [items, setItems] = useState<CoverLetterListItem[]>([])
  const [document, setDocument] = useState<CoverLetterDetail | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [isListLoading, setIsListLoading] = useState(true)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [listError, setListError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!open) return

    let active = true
    getMyCoverLetters()
      .then((response) => {
        if (!active) return
        setItems(response.coverLetters)
        setListError(null)
      })
      .catch((requestError: unknown) => {
        if (active) setListError(toErrorMessage(requestError))
      })
      .finally(() => {
        if (active) setIsListLoading(false)
      })

    return () => {
      active = false
    }
  }, [open])

  const selectDocument = async (index: number) => {
    const selected = items[index]
    if (!selected || isDetailLoading) return

    setIsDetailLoading(true)
    setListError(null)
    setError(null)
    setSaved(false)
    try {
      const detail = await getCoverLetter(selected.coverLetterId)
      setDocument(detail)
      setIsListLoading(true)
      onOpenChange(false)
      setEditorOpen(true)
    } catch (requestError) {
      setListError(toErrorMessage(requestError))
    } finally {
      setIsDetailLoading(false)
    }
  }

  const updateDocument = (update: Partial<CoverLetterDetail>) => {
    setDocument((current) => current ? { ...current, ...update } : current)
    setSaved(false)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!document) return

    const valid = document.title.trim()
      && document.companyName.trim()
      && document.role.trim()
      && document.coverLetterContents.length > 0
      && document.coverLetterContents.every((content) => content.question.trim() && content.answer.trim())
    if (!valid) {
      setError('필수 항목과 자기소개서 문항을 모두 입력해주세요.')
      return
    }

    setIsSaving(true)
    setError(null)
    try {
      const updated = await updateCoverLetter(document.coverLetterId, {
        title: document.title,
        companyName: document.companyName,
        role: document.role,
        coverLetterContents: document.coverLetterContents.map((content, index) => ({
          contentOrder: index + 1,
          question: content.question,
          answer: content.answer,
        })),
      })
      setDocument(updated)
      setItems((current) => current.map((item) =>
        item.coverLetterId === updated.coverLetterId
          ? {
              ...item,
              title: updated.title,
              companyName: updated.companyName,
              role: updated.role,
              updatedAt: updated.updatedAt,
            }
          : item,
      ))
      setSaved(true)
    } catch (requestError) {
      setError(toErrorMessage(requestError))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <CoverLetterPicker
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && isDetailLoading) return
          if (!nextOpen) {
            setIsListLoading(true)
            setListError(null)
          }
          onOpenChange(nextOpen)
        }}
        items={items.map((item) => item.title)}
        onSelect={(index) => void selectDocument(index)}
        loading={isListLoading}
        selectionLoading={isDetailLoading}
        error={listError}
      />

      {document ? (
        <DocumentModalShell
          open={editorOpen}
          onOpenChange={setEditorOpen}
          title="자기소개서 작성"
          description="DB에 저장된 자기소개서를 확인하고 수정할 수 있습니다."
          lastModified={formatDateTime(document.updatedAt)}
          saved={saved}
          onSubmit={handleSubmit}
        >
          <DocumentSection title="기본 정보">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id="cover-title" label="제목" required className="sm:col-span-2">
                <Input id="cover-title" value={document.title} maxLength={50} onChange={(event) => updateDocument({ title: event.target.value })} />
              </FormField>
              <FormField id="cover-company" label="기업명" required>
                <Input id="cover-company" value={document.companyName} maxLength={100} onChange={(event) => updateDocument({ companyName: event.target.value })} />
              </FormField>
              <FormField id="cover-role" label="지원 직무" required>
                <Input id="cover-role" value={document.role} maxLength={50} onChange={(event) => updateDocument({ role: event.target.value })} />
              </FormField>
            </div>
          </DocumentSection>

          <DocumentSection title="자기소개서 문항">
            {document.coverLetterContents.map((content, index) => (
              <DynamicCard key={content.contentId}>
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-caption font-semibold text-text-secondary">문항 {index + 1}</span>
                  <Button
                    type="button"
                    variant="text"
                    size="icon"
                    aria-label="자기소개서 문항 삭제"
                    disabled={document.coverLetterContents.length === 1}
                    onClick={() => updateDocument({
                      coverLetterContents: document.coverLetterContents.filter((item) => item.contentId !== content.contentId),
                    })}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </div>
                <FormField id={`question-${content.contentId}`} label="문항" required>
                  <Input
                    id={`question-${content.contentId}`}
                    value={content.question}
                    maxLength={255}
                    onChange={(event) => updateDocument({
                      coverLetterContents: document.coverLetterContents.map((item) =>
                        item.contentId === content.contentId ? { ...item, question: event.target.value } : item,
                      ),
                    })}
                  />
                </FormField>
                <FormField id={`answer-${content.contentId}`} label="답변" required className="mt-4">
                  <Textarea
                    id={`answer-${content.contentId}`}
                    value={content.answer}
                    className="min-h-48"
                    onChange={(event) => updateDocument({
                      coverLetterContents: document.coverLetterContents.map((item) =>
                        item.contentId === content.contentId ? { ...item, answer: event.target.value } : item,
                      ),
                    })}
                  />
                </FormField>
              </DynamicCard>
            ))}
            <Button
              type="button"
              variant="secondary"
              className="w-full border-dashed"
              onClick={() => {
                const contentId = Math.min(0, ...document.coverLetterContents.map((item) => item.contentId)) - 1
                updateDocument({
                  coverLetterContents: [...document.coverLetterContents, {
                    contentId,
                    contentOrder: document.coverLetterContents.length + 1,
                    question: '',
                    answer: '',
                  }],
                })
              }}
            >
              <Plus aria-hidden="true" /> 문항 추가
            </Button>
          </DocumentSection>

          {error ? <p className="mt-4 text-body-2 text-status-error" role="alert">{error}</p> : null}
          {isSaving ? <p className="mt-2 text-caption text-text-secondary" role="status">저장 중입니다.</p> : null}
        </DocumentModalShell>
      ) : null}
    </>
  )
}
