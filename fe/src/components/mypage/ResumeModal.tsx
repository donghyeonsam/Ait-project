import { Camera, ChevronLeft, Plus, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import {
  DocumentModalShell,
  DocumentSection,
  DynamicCard,
  FormField,
  ListRow,
} from '@/components/mypage/DocumentModalShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

interface ResumeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface Education {
  id: number
  institution: string
  program: string
  period: string
}

interface Career {
  id: number
  company: string
  position: string
  period: string
  description: string
}

interface Project {
  id: number
  title: string
  repo: string
  role: string
  tech: string
  description: string
}

type Category = 'basic' | 'education' | 'career' | 'project'

const categories: Category[] = ['basic', 'education', 'career', 'project']

const categoryLabels: Record<Category, string> = {
  basic: '기본 정보',
  education: '학력 및 교육 이수 내역',
  career: '경력',
  project: '프로젝트 경험',
}

const initialEducation: Education[] = [
  { id: 1, institution: '삼성청년 SW·AI 아카데미', program: '비전공 파이썬 과정', period: '2026.01 ~ 진행 중' },
  { id: 2, institution: 'KORAIL', program: '철도면허 이론기능반', period: '2023.05 ~ 2023.09' },
  { id: 3, institution: '00대학교', program: '신소재공학부', period: '2015.03 ~ 2019.02' },
]

const initialCareers: Career[] = [
  { id: 1, company: '○○○', position: '주니어 개발자', period: '2023.10 ~ 2025.12', description: '백엔드 API 설계와 성능 개선을 담당했습니다.' },
]

const initialProjects: Project[] = [
  { id: 1, title: 'Ait', repo: 'github.com/ssafygit12/ait', role: '백엔드 개발', tech: 'Java, Spring Boot, MySQL', description: 'AI 기반 모의면접과 화상 면접 스터디를 지원하는 플랫폼입니다.' },
]

function today() {
  const date = new Date()
  return `${date.getFullYear()}. ${String(date.getMonth() + 1).padStart(2, '0')}. ${String(date.getDate()).padStart(2, '0')}`
}

export function ResumeModal({ open, onOpenChange }: ResumeModalProps) {
  const [basic, setBasic] = useState({
    name: '김싸피',
    email: 'kimssafy@ssafy.com',
    phone: '010-1234-5678',
    github: 'kimssafy@github.com',
  })
  const [education, setEducation] = useState(initialEducation)
  const [careers, setCareers] = useState(initialCareers)
  const [projects, setProjects] = useState(initialProjects)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [pendingRemoval, setPendingRemoval] = useState<string | null>(null)
  const [newItem, setNewItem] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [lastModified, setLastModified] = useState('2026. 07. 09')

  const [activeCategory, setActiveCategory] = useState<Category>('basic')
  const [activeEducationId, setActiveEducationId] = useState<number | null>(null)
  const [activeCareerId, setActiveCareerId] = useState<number | null>(null)
  const [activeProjectId, setActiveProjectId] = useState<number | null>(null)

  const activeEducationItem = education.find((item) => item.id === activeEducationId) ?? null
  const activeCareerItem = careers.find((item) => item.id === activeCareerId) ?? null
  const activeProjectItem = projects.find((item) => item.id === activeProjectId) ?? null

  const clearError = (key: string) => {
    setErrors((current) => {
      const next = { ...current }
      delete next[key]
      return next
    })
    setSaved(false)
  }

  const validate = () => {
    const nextErrors: Record<string, string> = {}
    const requireValue = (key: string, value: string) => {
      if (!value.trim()) nextErrors[key] = '필수 항목을 입력해주세요.'
    }

    Object.entries(basic).forEach(([key, value]) => requireValue(`basic-${key}`, value))
    education.forEach((item) => {
      requireValue(`education-${item.id}-institution`, item.institution)
      requireValue(`education-${item.id}-program`, item.program)
      requireValue(`education-${item.id}-period`, item.period)
    })
    careers.forEach((item) => {
      requireValue(`career-${item.id}-company`, item.company)
      requireValue(`career-${item.id}-period`, item.period)
      requireValue(`career-${item.id}-description`, item.description)
    })
    projects.forEach((item) => {
      requireValue(`project-${item.id}-title`, item.title)
      requireValue(`project-${item.id}-role`, item.role)
      requireValue(`project-${item.id}-tech`, item.tech)
      requireValue(`project-${item.id}-description`, item.description)
    })

    setErrors(nextErrors)
    return nextErrors
  }

  const focusFirstError = (nextErrors: Record<string, string>) => {
    const key = Object.keys(nextErrors)[0]
    if (!key) return
    const [category, id] = key.split('-')
    if (category === 'basic') {
      setActiveCategory('basic')
    } else if (category === 'education') {
      setActiveCategory('education')
      setActiveEducationId(Number(id))
    } else if (category === 'career') {
      setActiveCategory('career')
      setActiveCareerId(Number(id))
    } else if (category === 'project') {
      setActiveCategory('project')
      setActiveProjectId(Number(id))
    }
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors = validate()
    if (Object.keys(nextErrors).length > 0) {
      focusFirstError(nextErrors)
      return
    }
    setLastModified(today())
    setSaved(true)
  }

  const addEducation = () => {
    const id = Math.max(0, ...education.map((item) => item.id)) + 1
    setEducation((items) => [...items, { id, institution: '', program: '', period: '' }])
    setNewItem(`education-${id}`)
    setActiveEducationId(id)
    setSaved(false)
  }

  const addCareer = () => {
    const id = Math.max(0, ...careers.map((item) => item.id)) + 1
    setCareers((items) => [...items, { id, company: '', position: '', period: '', description: '' }])
    setNewItem(`career-${id}`)
    setActiveCareerId(id)
    setSaved(false)
  }

  const addProject = () => {
    const id = Math.max(0, ...projects.map((item) => item.id)) + 1
    setProjects((items) => [...items, { id, title: '', repo: '', role: '', tech: '', description: '' }])
    setNewItem(`project-${id}`)
    setActiveProjectId(id)
    setSaved(false)
  }

  const finishRemoval = (key: 'education' | 'career' | 'project', id: number) => {
    if (pendingRemoval !== `${key}-${id}`) return
    if (key === 'education') {
      setEducation((items) => items.filter((item) => item.id !== id))
      setActiveEducationId((current) => (current === id ? null : current))
    }
    if (key === 'career') {
      setCareers((items) => items.filter((item) => item.id !== id))
      setActiveCareerId((current) => (current === id ? null : current))
    }
    if (key === 'project') {
      setProjects((items) => items.filter((item) => item.id !== id))
      setActiveProjectId((current) => (current === id ? null : current))
    }
    setPendingRemoval(null)
    setSaved(false)
  }

  return (
    <DocumentModalShell
      open={open}
      onOpenChange={onOpenChange}
      title="이력서 작성"
      description="면접에 사용할 경험과 역량을 정리해주세요."
      lastModified={lastModified}
      saved={saved}
      onSubmit={handleSubmit}
    >
      <div className="resume-modal-layout">
        <div className="sticky top-0 z-10 -mx-8 mb-6 border-b border-border-default bg-surface-default px-8">
          <div className="relative">
            <div className="grid grid-cols-4" role="tablist" aria-label="이력서 항목">
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  role="tab"
                  aria-selected={activeCategory === category}
                  aria-controls="resume-tab-panel"
                  onClick={() => setActiveCategory(category)}
                  className={`rounded-t-ait-s px-2 py-3 text-body-2 transition-colors [transition-duration:var(--duration-fast)] [transition-timing-function:var(--easing-standard)] ${
                    activeCategory === category
                      ? 'font-semibold text-action-primary'
                      : 'text-text-secondary hover:bg-status-neutral-surface hover:text-action-primary'
                  }`}
                >
                  {categoryLabels[category]}
                </button>
              ))}
            </div>
            <span
              className="activity-tab-indicator absolute bottom-0 left-0 h-0.5 w-1/4 bg-action-primary"
              style={{ transform: `translateX(${categories.indexOf(activeCategory) * 100}%)` }}
              aria-hidden="true"
            />
          </div>
        </div>

        <div id="resume-tab-panel" role="tabpanel">
          {activeCategory === 'basic' ? (
            <DocumentSection title="기본 정보" description="면접에 사용할 이력서 정보를 입력해주세요.">
              <div className="resume-basic-grid grid gap-6 md:grid-cols-[10rem_1fr]">
                <div>
                  <button type="button" className="flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-ait-m border border-dashed border-border-default bg-background-default text-body-2 font-semibold text-text-secondary transition-colors hover:border-action-primary hover:text-action-primary">
                    <Camera className="size-8" aria-hidden="true" />
                    사진 등록
                  </button>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {([
                    ['name', '이름', 'text'],
                    ['email', '이메일', 'email'],
                    ['phone', '휴대전화', 'tel'],
                    ['github', 'Github', 'text'],
                  ] as const).map(([key, label, type]) => {
                    const fieldKey = `basic-${key}`
                    return (
                      <FormField key={key} id={fieldKey} label={label} required error={errors[fieldKey]}>
                        <Input
                          id={fieldKey}
                          type={type}
                          value={basic[key]}
                          aria-invalid={Boolean(errors[fieldKey])}
                          aria-describedby={errors[fieldKey] ? `${fieldKey}-error` : undefined}
                          onChange={(event) => {
                            setBasic((value) => ({ ...value, [key]: event.target.value }))
                            clearError(fieldKey)
                          }}
                        />
                      </FormField>
                    )
                  })}
                </div>
              </div>
            </DocumentSection>
          ) : null}

          {activeCategory === 'education' ? (
            <DocumentSection
              title="학력 및 교육 이수 내역"
              description={activeEducationItem ? undefined : '항목을 선택하면 해당 내역만 수정할 수 있습니다.'}
            >
              {activeEducationItem ? (
                <DynamicCard
                  isNew={newItem === `education-${activeEducationItem.id}`}
                  isRemoving={pendingRemoval === `education-${activeEducationItem.id}`}
                  onAnimationEnd={() => finishRemoval('education', activeEducationItem.id)}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <Button type="button" variant="text" onClick={() => setActiveEducationId(null)}>
                      <ChevronLeft aria-hidden="true" />
                      목록으로
                    </Button>
                    <Button type="button" variant="text" size="icon" aria-label="학력 및 교육 이수 내역 삭제" onClick={() => setPendingRemoval(`education-${activeEducationItem.id}`)}>
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    {([
                      ['institution', '기관명'],
                      ['program', '전공·과정'],
                      ['period', '재학 기간'],
                    ] as const).map(([key, label]) => {
                      const fieldKey = `education-${activeEducationItem.id}-${key}`
                      return (
                        <FormField key={key} id={fieldKey} label={label} required error={errors[fieldKey]}>
                          <Input id={fieldKey} value={activeEducationItem[key]} aria-invalid={Boolean(errors[fieldKey])} aria-describedby={errors[fieldKey] ? `${fieldKey}-error` : undefined} onChange={(event) => {
                            setEducation((items) => items.map((entry) => entry.id === activeEducationItem.id ? { ...entry, [key]: event.target.value } : entry))
                            clearError(fieldKey)
                          }} />
                        </FormField>
                      )
                    })}
                  </div>
                </DynamicCard>
              ) : (
                <>
                  {education.length ? (
                    education.map((item) => {
                      const itemKey = `education-${item.id}`
                      return (
                        <ListRow
                          key={item.id}
                          title={item.institution || '기관명을 입력해주세요'}
                          subtitle={[item.program, item.period].filter(Boolean).join(' · ') || undefined}
                          deleteLabel="학력 및 교육 이수 내역 삭제"
                          onSelect={() => setActiveEducationId(item.id)}
                          onDelete={() => setPendingRemoval(itemKey)}
                          isRemoving={pendingRemoval === itemKey}
                          onAnimationEnd={() => finishRemoval('education', item.id)}
                        />
                      )
                    })
                  ) : (
                    <p className="rounded-ait-m border border-dashed border-border-default p-6 text-center text-body-2 text-text-secondary">
                      추가된 학력 및 교육 이수 내역이 없습니다.
                    </p>
                  )}
                  <Button type="button" variant="secondary" className="w-full border-dashed" onClick={addEducation}>
                    <Plus aria-hidden="true" />
                    학력 및 교육 이수 내역 추가
                  </Button>
                </>
              )}
            </DocumentSection>
          ) : null}

          {activeCategory === 'career' ? (
            <DocumentSection
              title="경력"
              description={activeCareerItem ? undefined : '항목을 선택하면 해당 내역만 수정할 수 있습니다.'}
            >
              {activeCareerItem ? (
                <DynamicCard
                  isNew={newItem === `career-${activeCareerItem.id}`}
                  isRemoving={pendingRemoval === `career-${activeCareerItem.id}`}
                  onAnimationEnd={() => finishRemoval('career', activeCareerItem.id)}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <Button type="button" variant="text" onClick={() => setActiveCareerId(null)}>
                      <ChevronLeft aria-hidden="true" />
                      목록으로
                    </Button>
                    <Button type="button" variant="text" size="icon" aria-label="경력 삭제" onClick={() => setPendingRemoval(`career-${activeCareerItem.id}`)}>
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    {([
                      ['company', '회사명', true],
                      ['position', '직책', false],
                      ['period', '근무 기간', true],
                    ] as const).map(([key, label, required]) => {
                      const fieldKey = `career-${activeCareerItem.id}-${key}`
                      return (
                        <FormField key={key} id={fieldKey} label={label} required={required} error={errors[fieldKey]}>
                          <Input id={fieldKey} value={activeCareerItem[key]} aria-invalid={Boolean(errors[fieldKey])} aria-describedby={errors[fieldKey] ? `${fieldKey}-error` : undefined} onChange={(event) => {
                            setCareers((items) => items.map((entry) => entry.id === activeCareerItem.id ? { ...entry, [key]: event.target.value } : entry))
                            clearError(fieldKey)
                          }} />
                        </FormField>
                      )
                    })}
                  </div>
                  <FormField id={`career-${activeCareerItem.id}-description`} label="직무 내용" required error={errors[`career-${activeCareerItem.id}-description`]} className="mt-4">
                    <Textarea id={`career-${activeCareerItem.id}-description`} value={activeCareerItem.description} aria-invalid={Boolean(errors[`career-${activeCareerItem.id}-description`])} aria-describedby={errors[`career-${activeCareerItem.id}-description`] ? `career-${activeCareerItem.id}-description-error` : undefined} onChange={(event) => {
                      setCareers((items) => items.map((entry) => entry.id === activeCareerItem.id ? { ...entry, description: event.target.value } : entry))
                      clearError(`career-${activeCareerItem.id}-description`)
                    }} />
                  </FormField>
                </DynamicCard>
              ) : (
                <>
                  {careers.length ? (
                    careers.map((item) => {
                      const itemKey = `career-${item.id}`
                      return (
                        <ListRow
                          key={item.id}
                          title={item.company || '회사명을 입력해주세요'}
                          subtitle={[item.position, item.period].filter(Boolean).join(' · ') || undefined}
                          deleteLabel="경력 삭제"
                          onSelect={() => setActiveCareerId(item.id)}
                          onDelete={() => setPendingRemoval(itemKey)}
                          isRemoving={pendingRemoval === itemKey}
                          onAnimationEnd={() => finishRemoval('career', item.id)}
                        />
                      )
                    })
                  ) : (
                    <p className="rounded-ait-m border border-dashed border-border-default p-6 text-center text-body-2 text-text-secondary">
                      추가된 경력이 없습니다.
                    </p>
                  )}
                  <Button type="button" variant="secondary" className="w-full border-dashed" onClick={addCareer}>
                    <Plus aria-hidden="true" />
                    경력 추가
                  </Button>
                </>
              )}
            </DocumentSection>
          ) : null}

          {activeCategory === 'project' ? (
            <DocumentSection
              title="프로젝트 경험"
              description={activeProjectItem ? undefined : '항목을 선택하면 해당 내역만 수정할 수 있습니다.'}
            >
              {activeProjectItem ? (
                <DynamicCard
                  isNew={newItem === `project-${activeProjectItem.id}`}
                  isRemoving={pendingRemoval === `project-${activeProjectItem.id}`}
                  onAnimationEnd={() => finishRemoval('project', activeProjectItem.id)}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <Button type="button" variant="text" onClick={() => setActiveProjectId(null)}>
                      <ChevronLeft aria-hidden="true" />
                      목록으로
                    </Button>
                    <Button type="button" variant="text" size="icon" aria-label="프로젝트 삭제" onClick={() => setPendingRemoval(`project-${activeProjectItem.id}`)}>
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    {([
                      ['title', '프로젝트 명', true],
                      ['repo', '관련 github repo 링크', false],
                      ['role', '역할', true],
                      ['tech', '사용 기술', true],
                    ] as const).map(([key, label, required]) => {
                      const fieldKey = `project-${activeProjectItem.id}-${key}`
                      return (
                        <FormField key={key} id={fieldKey} label={label} required={required} error={errors[fieldKey]}>
                          <Input id={fieldKey} value={activeProjectItem[key]} aria-invalid={Boolean(errors[fieldKey])} aria-describedby={errors[fieldKey] ? `${fieldKey}-error` : undefined} onChange={(event) => {
                            setProjects((items) => items.map((entry) => entry.id === activeProjectItem.id ? { ...entry, [key]: event.target.value } : entry))
                            clearError(fieldKey)
                          }} />
                        </FormField>
                      )
                    })}
                  </div>
                  <FormField id={`project-${activeProjectItem.id}-description`} label="프로젝트 설명" required error={errors[`project-${activeProjectItem.id}-description`]} className="mt-4">
                    <Textarea className="min-h-32" id={`project-${activeProjectItem.id}-description`} value={activeProjectItem.description} aria-invalid={Boolean(errors[`project-${activeProjectItem.id}-description`])} aria-describedby={errors[`project-${activeProjectItem.id}-description`] ? `project-${activeProjectItem.id}-description-error` : undefined} onChange={(event) => {
                      setProjects((items) => items.map((entry) => entry.id === activeProjectItem.id ? { ...entry, description: event.target.value } : entry))
                      clearError(`project-${activeProjectItem.id}-description`)
                    }} />
                  </FormField>
                </DynamicCard>
              ) : (
                <>
                  {projects.length ? (
                    projects.map((item) => {
                      const itemKey = `project-${item.id}`
                      return (
                        <ListRow
                          key={item.id}
                          title={item.title || '프로젝트 명을 입력해주세요'}
                          subtitle={[item.role, item.tech].filter(Boolean).join(' · ') || undefined}
                          deleteLabel="프로젝트 삭제"
                          onSelect={() => setActiveProjectId(item.id)}
                          onDelete={() => setPendingRemoval(itemKey)}
                          isRemoving={pendingRemoval === itemKey}
                          onAnimationEnd={() => finishRemoval('project', item.id)}
                        />
                      )
                    })
                  ) : (
                    <p className="rounded-ait-m border border-dashed border-border-default p-6 text-center text-body-2 text-text-secondary">
                      추가된 프로젝트 경험이 없습니다.
                    </p>
                  )}
                  <Button type="button" variant="secondary" className="w-full border-dashed" onClick={addProject}>
                    <Plus aria-hidden="true" />
                    프로젝트 추가
                  </Button>
                </>
              )}
            </DocumentSection>
          ) : null}
        </div>
      </div>
    </DocumentModalShell>
  )
}
