import { Plus, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  deleteCoverLetter,
  updateCoverLetter,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useUnsavedChangesGuard } from '@/lib/useUnsavedChangesGuard'

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
  const navigate = useNavigate()
  const [draft, setDraft] = useState(coverLetter)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [documentBoxOpen, setDocumentBoxOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const guard = useUnsavedChangesGuard(isDirty)

  const updateDraft = (update: Partial<CoverLetterDetail>) => {
    setDraft((current) => ({ ...current, ...update }))
    setSaved(false)
    setIsDirty(true)
  }

  const save = async (): Promise<boolean> => {
    const valid = draft.title.trim()
      && draft.companyName.trim()
      && draft.role.trim()
      && draft.coverLetterContents.length > 0
      && draft.coverLetterContents.every(
        (content) => content.question.trim() && content.answer.trim(),
      )
    if (!valid) {
      setError('필수 항목과 자기소개서 문항을 모두 입력해주세요.')
      return false
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
      setIsDirty(false)
      return true
    } catch (requestError) {
      setError(toErrorMessage(requestError))
      return false
    } finally {
      setIsSaving(false)
    }
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void save()
  }

  // 삭제 후에는 이 자소서 경로가 404가 되므로 편집 화면에 남기지 않고 마이페이지로 되돌린다.
  const confirmDeletion = async () => {
    setIsDeleting(true)
    setDeleteError(null)
    try {
      await deleteCoverLetter(draft.coverLetterId)
      navigate('/mypage', { replace: true })
    } catch (requestError) {
      setDeleteError(toErrorMessage(requestError))
      setIsDeleting(false)
    }
  }

  return (
    <DocumentEditorShell
      title="자기소개서 작성"
      description="DB에 저장된 자기소개서를 확인하고 수정할 수 있습니다."
      lastModified={formatDateTime(draft.updatedAt)}
      saved={saved}
      isSaving={isSaving || isDeleting}
      onSubmit={handleSubmit}
      onNavigateHome={() => guard.guardNavigation(() => navigate('/mypage'))}
      destructiveAction={(
        <Button
          type="button"
          variant="text"
          className="text-status-error"
          onClick={() => setIsDeleteDialogOpen(true)}
        >
          <Trash2 aria-hidden="true" />
          자기소개서 삭제
        </Button>
      )}
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

      <UnsavedChangesDialog
        open={guard.isConfirmOpen}
        onOpenChange={guard.setConfirmOpen}
        onDiscard={guard.runPendingAction}
        onSaveAndContinue={async () => {
          const success = await save()
          if (success) guard.runPendingAction()
        }}
        isSaving={isSaving}
      />

      <Dialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          // 삭제 요청이 진행되는 동안에는 대화상자를 닫지 않는다.
          if (!open && isDeleting) return
          setIsDeleteDialogOpen(open)
          if (!open) setDeleteError(null)
        }}
      >
        <DialogContent
          className="w-[min(28rem,calc(100vw-2rem))] border border-border-default p-6"
          showCloseButton={false}
        >
          <DialogHeader>
            <DialogTitle>자기소개서를 삭제할까요?</DialogTitle>
            <DialogDescription>
              {draft.title.trim()
                ? `‘${draft.title.trim()}’과 작성한 문항을 다시 볼 수 없습니다.`
                : '작성한 문항을 다시 볼 수 없습니다.'}
            </DialogDescription>
          </DialogHeader>
          {deleteError ? (
            <p className="mt-4 text-body-2 text-status-error" role="alert">
              {deleteError}
            </p>
          ) : null}
          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="secondary"
              disabled={isDeleting}
              onClick={() => {
                setIsDeleteDialogOpen(false)
                setDeleteError(null)
              }}
            >
              취소
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeleting}
              aria-busy={isDeleting}
              onClick={() => void confirmDeletion()}
            >
              {isDeleting ? '삭제하는 중' : '삭제'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DocumentBoxDialog open={documentBoxOpen} onOpenChange={setDocumentBoxOpen} />

      {documentBoxOpen ? null : (
        <DocumentBoxSideTab
          onClick={() => guard.guardNavigation(() => setDocumentBoxOpen(true))}
        />
      )}
    </DocumentEditorShell>
  )
}
