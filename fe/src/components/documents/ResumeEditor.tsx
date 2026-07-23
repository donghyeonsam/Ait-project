import { Check, Plus, Trash2, UserRound } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { toErrorMessage } from '@/api/http'
import {
  updateResume,
  type Resume,
  type ResumeCareer,
  type ResumeProject,
  type ResumeTraining,
} from '@/api/resume'
import {
  DocumentSection,
  DynamicCard,
  FormField,
} from '@/components/documents/DocumentFormParts'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

interface ResumeEditorProps {
  resume: Resume
  email: string
  onUpdated: (resume: Resume) => void
}

interface PeriodFieldProps {
  legend: string
  startId: string
  endId: string
  startDate: string
  endDate: string
  endRequired?: boolean
  onStartChange: (value: string) => void
  onEndChange: (value: string) => void
}

function cloneResume(resume: Resume): Resume {
  return {
    ...resume,
    trainings: resume.trainings.map((training) => ({ ...training })),
    projects: resume.projects.map((project) => ({ ...project })),
    careers: resume.careers.map((career) => ({ ...career })),
  }
}

function formatDateTime(value: string | null) {
  if (!value) return '미등록'
  return new Date(value).toLocaleDateString('ko-KR')
}

function nextId(items: Array<{ id: number }>) {
  return Math.min(0, ...items.map((item) => item.id)) - 1
}

function RequiredMark() {
  return (
    <span className="ml-1 text-status-error" aria-label="필수">
      *
    </span>
  )
}

function PeriodField({
  legend,
  startId,
  endId,
  startDate,
  endDate,
  endRequired = true,
  onStartChange,
  onEndChange,
}: PeriodFieldProps) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-2 text-body-2 font-medium text-text-primary">
        {legend}
        <RequiredMark />
      </legend>
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
        <label className="sr-only" htmlFor={startId}>
          {legend} 시작일
        </label>
        <Input
          id={startId}
          type="date"
          value={startDate}
          required
          onChange={(event) => onStartChange(event.target.value)}
        />
        <span className="text-body-2 text-text-secondary" aria-hidden="true">
          –
        </span>
        <label className="sr-only" htmlFor={endId}>
          {legend} 종료일
        </label>
        <Input
          id={endId}
          type="date"
          value={endDate}
          required={endRequired}
          onChange={(event) => onEndChange(event.target.value)}
        />
      </div>
    </fieldset>
  )
}

function ItemHeader({
  label,
  onDelete,
}: {
  label: string
  onDelete: () => void
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-4">
      <span className="text-caption font-semibold text-text-secondary">
        {label}
      </span>
      <Button
        type="button"
        variant="text"
        size="icon"
        className="-my-2 -mr-2"
        aria-label={`${label} 삭제`}
        onClick={onDelete}
      >
        <Trash2 aria-hidden="true" />
      </Button>
    </div>
  )
}

function EmptyState({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-ait-m bg-status-neutral-surface px-4 py-5 text-center text-body-2 text-text-secondary">
      {children}
    </p>
  )
}

function getFirstInvalidFieldId(draft: Resume) {
  for (const training of draft.trainings) {
    if (!training.organization.trim()) return `training-${training.trainingId}-organization`
    if (!training.course.trim()) return `training-${training.trainingId}-course`
    if (!training.startDate) return `training-${training.trainingId}-start`
    if (!training.endDate) return `training-${training.trainingId}-end`
    if (!training.description.trim()) return `training-${training.trainingId}-description`
  }

  for (const career of draft.careers) {
    if (!career.companyName.trim()) return `career-${career.careerId}-company`
    if (!career.role.trim()) return `career-${career.careerId}-role`
    if (!career.startDate) return `career-${career.careerId}-start`
    if (!career.description.trim()) return `career-${career.careerId}-description`
  }

  for (const project of draft.projects) {
    if (!project.projectName.trim()) return `project-${project.projectId}-name`
    if (!project.role.trim()) return `project-${project.projectId}-role`
    if (!project.techStacks.trim()) return `project-${project.projectId}-tech`
    if (!project.description.trim()) return `project-${project.projectId}-description`
  }

  return null
}

// 예시 시안처럼 모든 이력서 항목을 한 페이지에서 연속으로 편집한다.
export function ResumeEditor({ resume, email, onUpdated }: ResumeEditorProps) {
  const [draft, setDraft] = useState(() => cloneResume(resume))
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const changeDraft = (update: (current: Resume) => Resume) => {
    setDraft(update)
    setSaved(false)
    setError(null)
  }

  const updateTraining = (id: number, update: Partial<ResumeTraining>) => {
    changeDraft((current) => ({
      ...current,
      trainings: current.trainings.map((item) =>
        item.trainingId === id ? { ...item, ...update } : item,
      ),
    }))
  }

  const updateProject = (id: number, update: Partial<ResumeProject>) => {
    changeDraft((current) => ({
      ...current,
      projects: current.projects.map((item) =>
        item.projectId === id ? { ...item, ...update } : item,
      ),
    }))
  }

  const updateCareer = (id: number, update: Partial<ResumeCareer>) => {
    changeDraft((current) => ({
      ...current,
      careers: current.careers.map((item) =>
        item.careerId === id ? { ...item, ...update } : item,
      ),
    }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const invalidFieldId = getFirstInvalidFieldId(draft)
    if (invalidFieldId) {
      setError('필수 항목을 모두 입력해주세요.')
      requestAnimationFrame(() => {
        const invalidField = document.getElementById(invalidFieldId)
        invalidField?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        invalidField?.focus({ preventScroll: true })
      })
      return
    }

    setIsSaving(true)
    setError(null)
    try {
      const updated = await updateResume(draft.resumeId, {
        trainings: draft.trainings.map((training) => ({
          startDate: training.startDate,
          endDate: training.endDate,
          organization: training.organization,
          course: training.course,
          description: training.description,
        })),
        projects: draft.projects.map((project) => ({
          projectName: project.projectName,
          techStacks: project.techStacks,
          role: project.role,
          description: project.description,
        })),
        careers: draft.careers.map((career) => ({
          startDate: career.startDate,
          endDate: career.endDate,
          companyName: career.companyName,
          role: career.role,
          description: career.description,
        })),
      })
      setDraft(cloneResume(updated))
      onUpdated(updated)
      setSaved(true)
    } catch (requestError) {
      setError(toErrorMessage(requestError))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form className="resume-editor bg-surface-default" onSubmit={handleSubmit} noValidate>
      <header className="flex flex-wrap items-baseline gap-x-5 gap-y-2 pb-8">
        <h1 id="page-title" className="text-h1 text-text-primary">
          이력서 작성
        </h1>
        <span className="text-caption text-text-secondary">
          마지막 수정 : {formatDateTime(draft.updatedAt)}
        </span>
      </header>

      <DocumentSection
        title="기본 정보"
        description="면접에 사용할 계정 정보를 확인해주세요."
      >
        <div className="grid gap-6 md:grid-cols-[9rem_minmax(0,1fr)] md:items-start">
          <div className="mx-auto w-36 md:mx-0">
            <div
              className="flex aspect-[3/4] items-center justify-center rounded-ait-m border border-border-default bg-status-neutral-surface text-text-secondary"
              aria-label="프로필 사진 미등록"
            >
              <UserRound className="size-10" aria-hidden="true" />
            </div>
            <p className="mt-2 text-center text-body-2 font-medium">프로필 사진</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="resume-name" label="이름">
              <Input id="resume-name" value={draft.userName} readOnly aria-readonly="true" />
            </FormField>
            <FormField id="resume-email" label="이메일">
              <Input
                id="resume-email"
                type="email"
                value={email}
                readOnly
                aria-readonly="true"
              />
            </FormField>
            <p className="text-caption text-text-secondary sm:col-span-2">
              이름과 이메일은 가입한 계정 정보를 사용합니다.
            </p>
          </div>
        </div>
      </DocumentSection>

      <DocumentSection title="학력 및 교육 이수 내역">
        {draft.trainings.length === 0 ? (
          <EmptyState>등록된 학력 및 교육 이수 내역이 없습니다.</EmptyState>
        ) : null}
        {draft.trainings.map((training, index) => (
          <DynamicCard
            key={training.trainingId}
            className="bg-surface-default p-5 sm:p-6"
          >
            <ItemHeader
              label={`학력 및 교육 ${index + 1}`}
              onDelete={() => changeDraft((current) => ({
                ...current,
                trainings: current.trainings.filter(
                  (item) => item.trainingId !== training.trainingId,
                ),
              }))}
            />
            <div className="grid gap-4 lg:grid-cols-3">
              <FormField
                id={`training-${training.trainingId}-organization`}
                label="기관명"
                required
              >
                <Input
                  id={`training-${training.trainingId}-organization`}
                  value={training.organization}
                  maxLength={50}
                  placeholder="학교 또는 교육 기관"
                  onChange={(event) => updateTraining(
                    training.trainingId,
                    { organization: event.target.value },
                  )}
                />
              </FormField>
              <FormField
                id={`training-${training.trainingId}-course`}
                label="전공 · 과정"
                required
              >
                <Input
                  id={`training-${training.trainingId}-course`}
                  value={training.course}
                  maxLength={50}
                  placeholder="전공 또는 이수 과정"
                  onChange={(event) => updateTraining(
                    training.trainingId,
                    { course: event.target.value },
                  )}
                />
              </FormField>
              <PeriodField
                legend="재학 · 이수 기간"
                startId={`training-${training.trainingId}-start`}
                endId={`training-${training.trainingId}-end`}
                startDate={training.startDate}
                endDate={training.endDate}
                onStartChange={(value) => updateTraining(
                  training.trainingId,
                  { startDate: value },
                )}
                onEndChange={(value) => updateTraining(
                  training.trainingId,
                  { endDate: value },
                )}
              />
              <FormField
                id={`training-${training.trainingId}-description`}
                label="교육 내용"
                required
                className="lg:col-span-3"
              >
                <Textarea
                  id={`training-${training.trainingId}-description`}
                  value={training.description}
                  className="min-h-24"
                  placeholder="주요 학습 내용과 성과를 입력해주세요."
                  onChange={(event) => updateTraining(
                    training.trainingId,
                    { description: event.target.value },
                  )}
                />
              </FormField>
            </div>
          </DynamicCard>
        ))}
        <Button
          type="button"
          variant="secondary"
          className="w-full border-dashed shadow-none"
          onClick={() => changeDraft((current) => ({
            ...current,
            trainings: [...current.trainings, {
              trainingId: nextId(current.trainings.map((item) => ({ id: item.trainingId }))),
              startDate: '',
              endDate: '',
              organization: '',
              course: '',
              description: '',
            }],
          }))}
        >
          <Plus aria-hidden="true" /> 학력 및 교육 이수 내역 추가
        </Button>
      </DocumentSection>

      <DocumentSection title="경력">
        {draft.careers.length === 0 ? (
          <EmptyState>등록된 경력이 없습니다.</EmptyState>
        ) : null}
        {draft.careers.map((career, index) => (
          <DynamicCard
            key={career.careerId}
            className="bg-surface-default p-5 sm:p-6"
          >
            <ItemHeader
              label={`경력 ${index + 1}`}
              onDelete={() => changeDraft((current) => ({
                ...current,
                careers: current.careers.filter(
                  (item) => item.careerId !== career.careerId,
                ),
              }))}
            />
            <div className="grid gap-4 lg:grid-cols-3">
              <FormField
                id={`career-${career.careerId}-company`}
                label="회사명"
                required
              >
                <Input
                  id={`career-${career.careerId}-company`}
                  value={career.companyName}
                  maxLength={100}
                  placeholder="회사명"
                  onChange={(event) => updateCareer(
                    career.careerId,
                    { companyName: event.target.value },
                  )}
                />
              </FormField>
              <FormField id={`career-${career.careerId}-role`} label="직책 · 직무" required>
                <Input
                  id={`career-${career.careerId}-role`}
                  value={career.role}
                  maxLength={50}
                  placeholder="담당 직무"
                  onChange={(event) => updateCareer(
                    career.careerId,
                    { role: event.target.value },
                  )}
                />
              </FormField>
              <PeriodField
                legend="근무 기간"
                startId={`career-${career.careerId}-start`}
                endId={`career-${career.careerId}-end`}
                startDate={career.startDate}
                endDate={career.endDate ?? ''}
                endRequired={false}
                onStartChange={(value) => updateCareer(
                  career.careerId,
                  { startDate: value },
                )}
                onEndChange={(value) => updateCareer(
                  career.careerId,
                  { endDate: value || null },
                )}
              />
              <FormField
                id={`career-${career.careerId}-description`}
                label="직무 내용"
                required
                className="lg:col-span-3"
              >
                <Textarea
                  id={`career-${career.careerId}-description`}
                  value={career.description}
                  className="min-h-32"
                  placeholder="담당 업무와 주요 성과를 입력해주세요."
                  onChange={(event) => updateCareer(
                    career.careerId,
                    { description: event.target.value },
                  )}
                />
              </FormField>
            </div>
          </DynamicCard>
        ))}
        <Button
          type="button"
          variant="secondary"
          className="w-full border-dashed shadow-none"
          onClick={() => changeDraft((current) => ({
            ...current,
            careers: [...current.careers, {
              careerId: nextId(current.careers.map((item) => ({ id: item.careerId }))),
              startDate: '',
              endDate: null,
              companyName: '',
              role: '',
              description: '',
            }],
          }))}
        >
          <Plus aria-hidden="true" /> 경력 추가
        </Button>
      </DocumentSection>

      <DocumentSection title="프로젝트 경험">
        {draft.projects.length === 0 ? (
          <EmptyState>등록된 프로젝트 경험이 없습니다.</EmptyState>
        ) : null}
        {draft.projects.map((project, index) => (
          <DynamicCard
            key={project.projectId}
            className="bg-surface-default p-5 sm:p-6"
          >
            <ItemHeader
              label={`프로젝트 ${index + 1}`}
              onDelete={() => changeDraft((current) => ({
                ...current,
                projects: current.projects.filter(
                  (item) => item.projectId !== project.projectId,
                ),
              }))}
            />
            <div className="grid gap-4 lg:grid-cols-3">
              <FormField id={`project-${project.projectId}-name`} label="프로젝트명" required>
                <Input
                  id={`project-${project.projectId}-name`}
                  value={project.projectName}
                  maxLength={50}
                  placeholder="프로젝트명"
                  onChange={(event) => updateProject(
                    project.projectId,
                    { projectName: event.target.value },
                  )}
                />
              </FormField>
              <FormField id={`project-${project.projectId}-role`} label="역할" required>
                <Input
                  id={`project-${project.projectId}-role`}
                  value={project.role}
                  maxLength={50}
                  placeholder="담당 역할"
                  onChange={(event) => updateProject(
                    project.projectId,
                    { role: event.target.value },
                  )}
                />
              </FormField>
              <FormField id={`project-${project.projectId}-tech`} label="사용 기술" required>
                <Input
                  id={`project-${project.projectId}-tech`}
                  value={project.techStacks}
                  maxLength={255}
                  placeholder="React, TypeScript"
                  onChange={(event) => updateProject(
                    project.projectId,
                    { techStacks: event.target.value },
                  )}
                />
              </FormField>
              <FormField
                id={`project-${project.projectId}-description`}
                label="프로젝트 설명"
                required
                className="lg:col-span-3"
              >
                <Textarea
                  id={`project-${project.projectId}-description`}
                  value={project.description}
                  className="min-h-32"
                  placeholder="프로젝트 목표, 기여한 내용과 결과를 입력해주세요."
                  onChange={(event) => updateProject(
                    project.projectId,
                    { description: event.target.value },
                  )}
                />
              </FormField>
            </div>
          </DynamicCard>
        ))}
        <Button
          type="button"
          variant="secondary"
          className="w-full border-dashed shadow-none"
          onClick={() => changeDraft((current) => ({
            ...current,
            projects: [...current.projects, {
              projectId: nextId(current.projects.map((item) => ({ id: item.projectId }))),
              projectName: '',
              techStacks: '',
              role: '',
              description: '',
            }],
          }))}
        >
          <Plus aria-hidden="true" /> 프로젝트 추가
        </Button>
      </DocumentSection>

      {error ? (
        <p
          className="mt-8 rounded-ait-s border border-status-error-border bg-status-error-surface px-4 py-3 text-body-2 text-status-error"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <footer className="mt-8 flex flex-wrap items-center justify-end gap-3 border-t border-border-default pt-8">
        <Button asChild type="button" variant="secondary" className="min-w-28">
          <Link to="/mypage">닫기</Link>
        </Button>
        <Button
          type="submit"
          className={`min-w-36 ${saved ? 'save-success' : ''}`}
          disabled={isSaving}
          aria-busy={isSaving}
        >
          {saved ? <Check aria-hidden="true" /> : null}
          {isSaving ? '저장 중' : saved ? '저장 완료' : '저장하기'}
        </Button>
      </footer>
    </form>
  )
}
