import { Plus, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import {
  updateCoverLetter,
  type CoverLetterDetail,
} from '@/api/cover-letters'
import { toErrorMessage } from '@/api/http'
import { DocumentEditorShell } from '@/components/documents/DocumentEditorShell'
import {
  DocumentSection,
  DynamicCard,
  FormField,
} from '@/components/documents/DocumentFormParts'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

interface CoverLetterEditorProps {
  coverLetter: CoverLetterDetail
  onUpdated: (coverLetter: CoverLetterDetail) => void
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleDateString('ko-KR')
}

// 선택한 자기소개서의 기본 정보와 문항을 편집하고 저장한다.
export function CoverLetterEditor({
  coverLetter,
  onUpdated,
}: CoverLetterEditorProps) {
  const [draft, setDraft] = useState(coverLetter)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const updateDraft = (update: Partial<CoverLetterDetail>) => {
    setDraft((current) => ({ ...current, ...update }))
    setSaved(false)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const valid = draft.title.trim()
      && draft.companyName.trim()
      && draft.role.trim()
      && draft.coverLetterContents.length > 0
      && draft.coverLetterContents.every(
        (content) => content.question.trim() && content.answer.trim(),
      )
    if (!valid) {
      setError('필수 항목과 자기소개서 문항을 모두 입력해주세요.')
      return
    }

    setIsSaving(true)
    setError(null)
    try {
      const updated = await updateCoverLetter(draft.coverLetterId, {
        title: draft.title,
        companyName: draft.companyName,
        role: draft.role,
        coverLetterContents: draft.coverLetterContents.map((content, index) => ({
          contentOrder: index + 1,
          question: content.question,
          answer: content.answer,
        })),
      })
      setDraft(updated)
      onUpdated(updated)
      setSaved(true)
    } catch (requestError) {
      setError(toErrorMessage(requestError))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <DocumentEditorShell
      title="자기소개서 작성"
      description="DB에 저장된 자기소개서를 확인하고 수정할 수 있습니다."
      lastModified={formatDateTime(draft.updatedAt)}
      saved={saved}
      isSaving={isSaving}
      onSubmit={handleSubmit}
    >
      <DocumentSection title="기본 정보">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="cover-title" label="제목" required className="sm:col-span-2">
            <Input
              id="cover-title"
              value={draft.title}
              maxLength={50}
              onChange={(event) => updateDraft({ title: event.target.value })}
            />
          </FormField>
          <FormField id="cover-company" label="기업명" required>
            <Input
              id="cover-company"
              value={draft.companyName}
              maxLength={100}
              onChange={(event) => updateDraft({ companyName: event.target.value })}
            />
          </FormField>
          <FormField id="cover-role" label="지원 직무" required>
            <Input
              id="cover-role"
              value={draft.role}
              maxLength={50}
              onChange={(event) => updateDraft({ role: event.target.value })}
            />
          </FormField>
        </div>
      </DocumentSection>

      <DocumentSection title="자기소개서 문항">
        {draft.coverLetterContents.map((content, index) => (
          <DynamicCard key={content.contentId}>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-caption font-semibold text-text-secondary">
                문항 {index + 1}
              </span>
              <Button
                type="button"
                variant="text"
                size="icon"
                aria-label="자기소개서 문항 삭제"
                disabled={draft.coverLetterContents.length === 1}
                onClick={() => updateDraft({
                  coverLetterContents: draft.coverLetterContents.filter(
                    (item) => item.contentId !== content.contentId,
                  ),
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
                onChange={(event) => updateDraft({
                  coverLetterContents: draft.coverLetterContents.map((item) =>
                    item.contentId === content.contentId
                      ? { ...item, question: event.target.value }
                      : item,
                  ),
                })}
              />
            </FormField>
            <FormField
              id={`answer-${content.contentId}`}
              label="답변"
              required
              className="mt-4"
            >
              <Textarea
                id={`answer-${content.contentId}`}
                value={content.answer}
                className="min-h-48"
                onChange={(event) => updateDraft({
                  coverLetterContents: draft.coverLetterContents.map((item) =>
                    item.contentId === content.contentId
                      ? { ...item, answer: event.target.value }
                      : item,
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
            const contentId = Math.min(
              0,
              ...draft.coverLetterContents.map((item) => item.contentId),
            ) - 1
            updateDraft({
              coverLetterContents: [...draft.coverLetterContents, {
                contentId,
                contentOrder: draft.coverLetterContents.length + 1,
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
    </DocumentEditorShell>
  )
}
