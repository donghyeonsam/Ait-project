import { Plus, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  createCoverLetter,
  type CoverLetterDetail,
} from '@/api/cover-letters'
import { toErrorMessage } from '@/api/http'
import { DocumentBoxDialog } from '@/components/documents/DocumentBoxDialog'
import { DocumentBoxSideTab } from '@/components/documents/DocumentBoxSideTab'
import { DocumentEditorShell } from '@/components/documents/DocumentEditorShell'
import {
  DocumentSection,
  DynamicCard,
  FormField,
} from '@/components/documents/DocumentFormParts'
import { UnsavedChangesDialog } from '@/components/documents/UnsavedChangesDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useUnsavedChangesGuard } from '@/lib/useUnsavedChangesGuard'

interface DraftContent {
  key: number
  question: string
  answer: string
}

interface CoverLetterCreateEditorProps {
  onCreated: (coverLetter: CoverLetterDetail) => void
}

function createEmptyContent(key: number): DraftContent {
  return { key, question: '', answer: '' }
}

// 새 자기소개서의 기본 정보와 문항을 입력받아 생성한다.
export function CoverLetterCreateEditor({
  onCreated,
}: CoverLetterCreateEditorProps) {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [role, setRole] = useState('')
  const [contents, setContents] = useState<DraftContent[]>([
    createEmptyContent(1),
  ])
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [documentBoxOpen, setDocumentBoxOpen] = useState(false)

  const isDirty = Boolean(
    title.trim()
    || companyName.trim()
    || role.trim()
    || contents.some((content) => content.question.trim() || content.answer.trim()),
  )
  const guard = useUnsavedChangesGuard(isDirty)

  const updateContent = (key: number, update: Partial<DraftContent>) => {
    setContents((current) =>
      current.map((item) => (item.key === key ? { ...item, ...update } : item)),
    )
  }

  const submitCreate = async (): Promise<CoverLetterDetail | null> => {
    const valid = title.trim()
      && companyName.trim()
      && role.trim()
      && contents.length > 0
      && contents.every((content) => content.question.trim() && content.answer.trim())
    if (!valid) {
      setError('필수 항목과 자기소개서 문항을 모두 입력해주세요.')
      return null
    }

    setIsSaving(true)
    setError(null)
    try {
      const created = await createCoverLetter({
        title,
        companyName,
        role,
        coverLetterContents: contents.map((content, index) => ({
          contentOrder: index + 1,
          question: content.question,
          answer: content.answer,
        })),
      })
      return created
    } catch (requestError) {
      setError(toErrorMessage(requestError))
      return null
    } finally {
      setIsSaving(false)
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const created = await submitCreate()
    if (created) onCreated(created)
  }

  return (
    <DocumentEditorShell
      title="자기소개서 작성"
      description="새로운 자기소개서의 기본 정보와 문항을 입력해주세요."
      saved={false}
      isSaving={isSaving}
      onSubmit={handleSubmit}
      onNavigateHome={() => guard.guardNavigation(() => navigate('/mypage'))}
    >
      <DocumentSection title="기본 정보">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="cover-title" label="제목" required className="sm:col-span-2">
            <Input
              id="cover-title"
              value={title}
              maxLength={50}
              onChange={(event) => setTitle(event.target.value)}
            />
          </FormField>
          <FormField id="cover-company" label="기업명" required>
            <Input
              id="cover-company"
              value={companyName}
              maxLength={100}
              onChange={(event) => setCompanyName(event.target.value)}
            />
          </FormField>
          <FormField id="cover-role" label="지원 직무" required>
            <Input
              id="cover-role"
              value={role}
              maxLength={50}
              onChange={(event) => setRole(event.target.value)}
            />
          </FormField>
        </div>
      </DocumentSection>

      <DocumentSection title="자기소개서 문항">
        {contents.map((content, index) => (
          <DynamicCard key={content.key}>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-caption font-semibold text-text-secondary">
                문항 {index + 1}
              </span>
              <Button
                type="button"
                variant="text"
                size="icon"
                aria-label="자기소개서 문항 삭제"
                disabled={contents.length === 1}
                onClick={() => setContents((current) =>
                  current.filter((item) => item.key !== content.key),
                )}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </div>
            <FormField id={`question-${content.key}`} label="문항" required>
              <Input
                id={`question-${content.key}`}
                value={content.question}
                maxLength={255}
                onChange={(event) => updateContent(content.key, { question: event.target.value })}
              />
            </FormField>
            <FormField
              id={`answer-${content.key}`}
              label="답변"
              required
              className="mt-4"
            >
              <Textarea
                id={`answer-${content.key}`}
                value={content.answer}
                className="min-h-48"
                onChange={(event) => updateContent(content.key, { answer: event.target.value })}
              />
            </FormField>
          </DynamicCard>
        ))}
        <Button
          type="button"
          variant="secondary"
          className="w-full border-dashed"
          onClick={() => setContents((current) => [
            ...current,
            createEmptyContent(Math.max(0, ...current.map((item) => item.key)) + 1),
          ])}
        >
          <Plus aria-hidden="true" /> 문항 추가
        </Button>
      </DocumentSection>

      {error ? <p className="mt-4 text-body-2 text-status-error" role="alert">{error}</p> : null}

      <UnsavedChangesDialog
        open={guard.isConfirmOpen}
        onOpenChange={guard.setConfirmOpen}
        onDiscard={guard.runPendingAction}
        onSaveAndContinue={async () => {
          const created = await submitCreate()
          if (created) guard.runPendingAction()
        }}
        isSaving={isSaving}
      />

      <DocumentBoxDialog open={documentBoxOpen} onOpenChange={setDocumentBoxOpen} />

      {documentBoxOpen ? null : (
        <DocumentBoxSideTab
          onClick={() => guard.guardNavigation(() => setDocumentBoxOpen(true))}
        />
      )}
    </DocumentEditorShell>
  )
}
