import { Plus, Trash2 } from 'lucide-react'
import { useState, type FormEvent, type KeyboardEvent } from 'react'
import { toErrorMessage } from '@/api/http'
import {
  updateResume,
  type Resume,
  type ResumeCareer,
  type ResumeProject,
  type ResumeTraining,
} from '@/api/resume'
import {
  DocumentModalShell,
  DocumentSection,
  DynamicCard,
  FormField,
} from '@/components/mypage/DocumentModalShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

interface ResumeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  resume: Resume
  email: string
  onUpdated: (resume: Resume) => void
}

type ResumeCategory = 'basic' | 'education' | 'career' | 'project'

const resumeCategories: Array<{ id: ResumeCategory; label: string }> = [
  { id: 'basic', label: '기본 정보' },
  { id: 'education', label: '학력 및 교육 이수 내역' },
  { id: 'career', label: '경력' },
  { id: 'project', label: '프로젝트 경험' },
]

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

export function ResumeModal({
  open,
  onOpenChange,
  resume,
  email,
  onUpdated,
}: ResumeModalProps) {
  const [draft, setDraft] = useState(() => cloneResume(resume))
  const [activeCategory, setActiveCategory] = useState<ResumeCategory>('basic')
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const updateTraining = (id: number, update: Partial<ResumeTraining>) => {
    setDraft((current) => ({
      ...current,
      trainings: current.trainings.map((item) =>
        item.trainingId === id ? { ...item, ...update } : item,
      ),
    }))
    setSaved(false)
  }

  const updateProject = (id: number, update: Partial<ResumeProject>) => {
    setDraft((current) => ({
      ...current,
      projects: current.projects.map((item) =>
        item.projectId === id ? { ...item, ...update } : item,
      ),
    }))
    setSaved(false)
  }

  const updateCareer = (id: number, update: Partial<ResumeCareer>) => {
    setDraft((current) => ({
      ...current,
      careers: current.careers.map((item) =>
        item.careerId === id ? { ...item, ...update } : item,
      ),
    }))
    setSaved(false)
  }

  const getFirstInvalidCategory = (): ResumeCategory | null => {
    const trainingsValid = draft.trainings.every((item) =>
      item.startDate && item.endDate && item.organization.trim()
      && item.course.trim() && item.description.trim(),
    )
    if (!trainingsValid) return 'education'

    const careersValid = draft.careers.every((item) =>
      item.startDate && item.companyName.trim() && item.role.trim() && item.description.trim(),
    )
    if (!careersValid) return 'career'

    const projectsValid = draft.projects.every((item) =>
      item.projectName.trim() && item.techStacks.trim()
      && item.role.trim() && item.description.trim(),
    )
    if (!projectsValid) return 'project'

    return null
  }

  const handleCategoryKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    currentIndex: number,
  ) => {
    let nextIndex = currentIndex

    if (event.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % resumeCategories.length
    } else if (event.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + resumeCategories.length) % resumeCategories.length
    } else if (event.key === 'Home') {
      nextIndex = 0
    } else if (event.key === 'End') {
      nextIndex = resumeCategories.length - 1
    } else {
      return
    }

    event.preventDefault()
    setActiveCategory(resumeCategories[nextIndex].id)
    const tabs = event.currentTarget.parentElement
      ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
    tabs?.[nextIndex]?.focus()
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const invalidCategory = getFirstInvalidCategory()
    if (invalidCategory) {
      setActiveCategory(invalidCategory)
      setError('필수 항목을 모두 입력해주세요.')
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
    <DocumentModalShell
      open={open}
      onOpenChange={onOpenChange}
      title="이력서 작성"
      description="DB에 저장된 이력서 내용을 확인하고 수정할 수 있습니다."
      lastModified={formatDateTime(draft.updatedAt)}
      saved={saved}
      onSubmit={handleSubmit}
      topBar={(
        <div className="overflow-x-auto">
          <div
            className="relative grid min-w-160 grid-cols-4 md:min-w-0"
            role="tablist"
            aria-label="이력서 항목"
          >
            {resumeCategories.map((category, index) => {
              const selected = activeCategory === category.id

              return (
                <button
                  key={category.id}
                  id={`resume-tab-${category.id}`}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls="resume-tab-panel"
                  tabIndex={selected ? 0 : -1}
                  className={`px-2 py-4 text-body-2 transition-colors [transition-duration:var(--duration-fast)] [transition-timing-function:var(--easing-standard)] ${
                    selected
                      ? 'font-semibold text-action-primary'
                      : 'text-text-secondary hover:bg-status-neutral-surface hover:text-action-primary'
                  }`}
                  onClick={() => setActiveCategory(category.id)}
                  onKeyDown={(event) => handleCategoryKeyDown(event, index)}
                >
                  {category.label}
                </button>
              )
            })}
            <span
              className="activity-tab-indicator absolute bottom-0 left-0 h-0.5 w-1/4 bg-action-primary"
              style={{
                transform: `translateX(${
                  resumeCategories.findIndex((category) => category.id === activeCategory) * 100
                }%)`,
              }}
              aria-hidden="true"
            />
          </div>
        </div>
      )}
    >
      <div
        key={activeCategory}
        id="resume-tab-panel"
        role="tabpanel"
        aria-labelledby={`resume-tab-${activeCategory}`}
        className="activity-tab-panel"
      >
        {activeCategory === 'basic' ? (
          <DocumentSection title="기본 정보" description="사용자 계정에 저장된 정보입니다.">
            <dl className="grid gap-4 rounded-ait-m bg-status-neutral-surface p-4 sm:grid-cols-2">
              <div>
                <dt className="text-caption text-text-secondary">이름</dt>
                <dd className="mt-1 text-body-2 font-medium">{draft.userName}</dd>
              </div>
              <div>
                <dt className="text-caption text-text-secondary">이메일</dt>
                <dd className="mt-1 text-body-2 font-medium">{email}</dd>
              </div>
            </dl>
          </DocumentSection>
        ) : null}

        {activeCategory === 'education' ? (
          <DocumentSection title="학력 및 교육 이수 내역">
            {draft.trainings.map((training) => (
              <DynamicCard key={training.trainingId}>
                <div className="mb-3 flex justify-end">
                  <Button
                    type="button"
                    variant="text"
                    size="icon"
                    aria-label="교육 이수 내역 삭제"
                    onClick={() => setDraft((current) => ({
                      ...current,
                      trainings: current.trainings.filter((item) => item.trainingId !== training.trainingId),
                    }))}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField id={`training-${training.trainingId}-organization`} label="기관명" required>
                    <Input id={`training-${training.trainingId}-organization`} value={training.organization} maxLength={50} onChange={(event) => updateTraining(training.trainingId, { organization: event.target.value })} />
                  </FormField>
                  <FormField id={`training-${training.trainingId}-course`} label="과정" required>
                    <Input id={`training-${training.trainingId}-course`} value={training.course} maxLength={50} onChange={(event) => updateTraining(training.trainingId, { course: event.target.value })} />
                  </FormField>
                  <FormField id={`training-${training.trainingId}-start`} label="시작일" required>
                    <Input id={`training-${training.trainingId}-start`} type="date" value={training.startDate} onChange={(event) => updateTraining(training.trainingId, { startDate: event.target.value })} />
                  </FormField>
                  <FormField id={`training-${training.trainingId}-end`} label="종료일" required>
                    <Input id={`training-${training.trainingId}-end`} type="date" value={training.endDate} onChange={(event) => updateTraining(training.trainingId, { endDate: event.target.value })} />
                  </FormField>
                </div>
                <FormField id={`training-${training.trainingId}-description`} label="설명" required className="mt-4">
                  <Textarea id={`training-${training.trainingId}-description`} value={training.description} onChange={(event) => updateTraining(training.trainingId, { description: event.target.value })} />
                </FormField>
              </DynamicCard>
            ))}
            <Button
              type="button"
              variant="secondary"
              className="w-full border-dashed"
              onClick={() => setDraft((current) => ({
                ...current,
                trainings: [...current.trainings, {
                  trainingId: nextId(current.trainings.map((item) => ({ id: item.trainingId }))),
                  startDate: '', endDate: '', organization: '', course: '', description: '',
                }],
              }))}
            >
              <Plus aria-hidden="true" /> 교육 이수 내역 추가
            </Button>
          </DocumentSection>
        ) : null}

        {activeCategory === 'career' ? (
          <DocumentSection title="경력">
            {draft.careers.map((career) => (
              <DynamicCard key={career.careerId}>
                <div className="mb-3 flex justify-end">
                  <Button type="button" variant="text" size="icon" aria-label="경력 삭제" onClick={() => setDraft((current) => ({ ...current, careers: current.careers.filter((item) => item.careerId !== career.careerId) }))}>
                    <Trash2 aria-hidden="true" />
                  </Button>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField id={`career-${career.careerId}-company`} label="회사명" required>
                    <Input id={`career-${career.careerId}-company`} value={career.companyName} maxLength={100} onChange={(event) => updateCareer(career.careerId, { companyName: event.target.value })} />
                  </FormField>
                  <FormField id={`career-${career.careerId}-role`} label="직무" required>
                    <Input id={`career-${career.careerId}-role`} value={career.role} maxLength={50} onChange={(event) => updateCareer(career.careerId, { role: event.target.value })} />
                  </FormField>
                  <FormField id={`career-${career.careerId}-start`} label="시작일" required>
                    <Input id={`career-${career.careerId}-start`} type="date" value={career.startDate} onChange={(event) => updateCareer(career.careerId, { startDate: event.target.value })} />
                  </FormField>
                  <FormField id={`career-${career.careerId}-end`} label="종료일">
                    <Input id={`career-${career.careerId}-end`} type="date" value={career.endDate ?? ''} onChange={(event) => updateCareer(career.careerId, { endDate: event.target.value || null })} />
                  </FormField>
                </div>
                <FormField id={`career-${career.careerId}-description`} label="업무 내용" required className="mt-4">
                  <Textarea id={`career-${career.careerId}-description`} value={career.description} onChange={(event) => updateCareer(career.careerId, { description: event.target.value })} />
                </FormField>
              </DynamicCard>
            ))}
            <Button type="button" variant="secondary" className="w-full border-dashed" onClick={() => setDraft((current) => ({ ...current, careers: [...current.careers, { careerId: nextId(current.careers.map((item) => ({ id: item.careerId }))), startDate: '', endDate: null, companyName: '', role: '', description: '' }] }))}>
              <Plus aria-hidden="true" /> 경력 추가
            </Button>
          </DocumentSection>
        ) : null}

        {activeCategory === 'project' ? (
          <DocumentSection title="프로젝트 경험">
            {draft.projects.map((project) => (
              <DynamicCard key={project.projectId}>
                <div className="mb-3 flex justify-end">
                  <Button type="button" variant="text" size="icon" aria-label="프로젝트 삭제" onClick={() => setDraft((current) => ({ ...current, projects: current.projects.filter((item) => item.projectId !== project.projectId) }))}>
                    <Trash2 aria-hidden="true" />
                  </Button>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField id={`project-${project.projectId}-name`} label="프로젝트명" required>
                    <Input id={`project-${project.projectId}-name`} value={project.projectName} maxLength={50} onChange={(event) => updateProject(project.projectId, { projectName: event.target.value })} />
                  </FormField>
                  <FormField id={`project-${project.projectId}-role`} label="역할" required>
                    <Input id={`project-${project.projectId}-role`} value={project.role} maxLength={50} onChange={(event) => updateProject(project.projectId, { role: event.target.value })} />
                  </FormField>
                  <FormField id={`project-${project.projectId}-tech`} label="사용 기술" required className="sm:col-span-2">
                    <Input id={`project-${project.projectId}-tech`} value={project.techStacks} maxLength={255} onChange={(event) => updateProject(project.projectId, { techStacks: event.target.value })} />
                  </FormField>
                </div>
                <FormField id={`project-${project.projectId}-description`} label="설명" required className="mt-4">
                  <Textarea id={`project-${project.projectId}-description`} value={project.description} onChange={(event) => updateProject(project.projectId, { description: event.target.value })} />
                </FormField>
              </DynamicCard>
            ))}
            <Button type="button" variant="secondary" className="w-full border-dashed" onClick={() => setDraft((current) => ({ ...current, projects: [...current.projects, { projectId: nextId(current.projects.map((item) => ({ id: item.projectId }))), projectName: '', techStacks: '', role: '', description: '' }] }))}>
              <Plus aria-hidden="true" /> 프로젝트 추가
            </Button>
          </DocumentSection>
        ) : null}

        {error ? <p className="mt-4 text-body-2 text-status-error" role="alert">{error}</p> : null}
        {isSaving ? <p className="mt-2 text-caption text-text-secondary" role="status">저장 중입니다.</p> : null}
      </div>
    </DocumentModalShell>
  )
}
