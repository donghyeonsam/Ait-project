import { Camera, Plus, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
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
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!validate()) return
    setLastModified(today())
    setSaved(true)
  }

  const addEducation = () => {
    const id = Math.max(0, ...education.map((item) => item.id)) + 1
    setEducation((items) => [...items, { id, institution: '', program: '', period: '' }])
    setNewItem(`education-${id}`)
    setSaved(false)
  }

  const addCareer = () => {
    const id = Math.max(0, ...careers.map((item) => item.id)) + 1
    setCareers((items) => [...items, { id, company: '', position: '', period: '', description: '' }])
    setNewItem(`career-${id}`)
    setSaved(false)
  }

  const addProject = () => {
    const id = Math.max(0, ...projects.map((item) => item.id)) + 1
    setProjects((items) => [...items, { id, title: '', repo: '', role: '', tech: '', description: '' }])
    setNewItem(`project-${id}`)
    setSaved(false)
  }

  const finishRemoval = (key: string, id: number) => {
    if (pendingRemoval !== `${key}-${id}`) return
    if (key === 'education') setEducation((items) => items.filter((item) => item.id !== id))
    if (key === 'career') setCareers((items) => items.filter((item) => item.id !== id))
    if (key === 'project') setProjects((items) => items.filter((item) => item.id !== id))
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

      <DocumentSection title="학력 및 교육 이수 내역">
        {education.map((item) => {
          const itemKey = `education-${item.id}`
          return (
            <DynamicCard key={item.id} isNew={newItem === itemKey} isRemoving={pendingRemoval === itemKey} onAnimationEnd={() => finishRemoval('education', item.id)}>
              <div className="mb-3 flex justify-end">
                <Button type="button" variant="text" size="icon" aria-label="학력 및 교육 이수 내역 삭제" onClick={() => setPendingRemoval(itemKey)}>
                  <Trash2 aria-hidden="true" />
                </Button>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {([
                  ['institution', '기관명'],
                  ['program', '전공·과정'],
                  ['period', '재학 기간'],
                ] as const).map(([key, label]) => {
                  const fieldKey = `${itemKey}-${key}`
                  return (
                    <FormField key={key} id={fieldKey} label={label} required error={errors[fieldKey]}>
                      <Input id={fieldKey} value={item[key]} aria-invalid={Boolean(errors[fieldKey])} aria-describedby={errors[fieldKey] ? `${fieldKey}-error` : undefined} onChange={(event) => {
                        setEducation((items) => items.map((entry) => entry.id === item.id ? { ...entry, [key]: event.target.value } : entry))
                        clearError(fieldKey)
                      }} />
                    </FormField>
                  )
                })}
              </div>
            </DynamicCard>
          )
        })}
        <Button type="button" variant="secondary" className="w-full border-dashed" onClick={addEducation}>
          <Plus aria-hidden="true" />
          학력 및 교육 이수 내역 추가
        </Button>
      </DocumentSection>

      <DocumentSection title="경력">
        {careers.map((item) => {
          const itemKey = `career-${item.id}`
          return (
            <DynamicCard key={item.id} isNew={newItem === itemKey} isRemoving={pendingRemoval === itemKey} onAnimationEnd={() => finishRemoval('career', item.id)}>
              <div className="mb-3 flex justify-end">
                <Button type="button" variant="text" size="icon" aria-label="경력 삭제" onClick={() => setPendingRemoval(itemKey)}>
                  <Trash2 aria-hidden="true" />
                </Button>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {([
                  ['company', '회사명', true],
                  ['position', '직책', false],
                  ['period', '근무 기간', true],
                ] as const).map(([key, label, required]) => {
                  const fieldKey = `${itemKey}-${key}`
                  return (
                    <FormField key={key} id={fieldKey} label={label} required={required} error={errors[fieldKey]}>
                      <Input id={fieldKey} value={item[key]} aria-invalid={Boolean(errors[fieldKey])} aria-describedby={errors[fieldKey] ? `${fieldKey}-error` : undefined} onChange={(event) => {
                        setCareers((items) => items.map((entry) => entry.id === item.id ? { ...entry, [key]: event.target.value } : entry))
                        clearError(fieldKey)
                      }} />
                    </FormField>
                  )
                })}
              </div>
              <FormField id={`${itemKey}-description`} label="직무 내용" required error={errors[`${itemKey}-description`]} className="mt-4">
                <Textarea id={`${itemKey}-description`} value={item.description} aria-invalid={Boolean(errors[`${itemKey}-description`])} aria-describedby={errors[`${itemKey}-description`] ? `${itemKey}-description-error` : undefined} onChange={(event) => {
                  setCareers((items) => items.map((entry) => entry.id === item.id ? { ...entry, description: event.target.value } : entry))
                  clearError(`${itemKey}-description`)
                }} />
              </FormField>
            </DynamicCard>
          )
        })}
        <Button type="button" variant="secondary" className="w-full border-dashed" onClick={addCareer}>
          <Plus aria-hidden="true" />
          경력 추가
        </Button>
      </DocumentSection>

      <DocumentSection title="프로젝트 경험">
        {projects.map((item) => {
          const itemKey = `project-${item.id}`
          return (
            <DynamicCard key={item.id} isNew={newItem === itemKey} isRemoving={pendingRemoval === itemKey} onAnimationEnd={() => finishRemoval('project', item.id)}>
              <div className="mb-3 flex justify-end">
                <Button type="button" variant="text" size="icon" aria-label="프로젝트 삭제" onClick={() => setPendingRemoval(itemKey)}>
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
                  const fieldKey = `${itemKey}-${key}`
                  return (
                    <FormField key={key} id={fieldKey} label={label} required={required} error={errors[fieldKey]}>
                      <Input id={fieldKey} value={item[key]} aria-invalid={Boolean(errors[fieldKey])} aria-describedby={errors[fieldKey] ? `${fieldKey}-error` : undefined} onChange={(event) => {
                        setProjects((items) => items.map((entry) => entry.id === item.id ? { ...entry, [key]: event.target.value } : entry))
                        clearError(fieldKey)
                      }} />
                    </FormField>
                  )
                })}
              </div>
              <FormField id={`${itemKey}-description`} label="프로젝트 설명" required error={errors[`${itemKey}-description`]} className="mt-4">
                <Textarea id={`${itemKey}-description`} className="min-h-32" value={item.description} aria-invalid={Boolean(errors[`${itemKey}-description`])} aria-describedby={errors[`${itemKey}-description`] ? `${itemKey}-description-error` : undefined} onChange={(event) => {
                  setProjects((items) => items.map((entry) => entry.id === item.id ? { ...entry, description: event.target.value } : entry))
                  clearError(`${itemKey}-description`)
                }} />
              </FormField>
            </DynamicCard>
          )
        })}
        <Button type="button" variant="secondary" className="w-full border-dashed" onClick={addProject}>
          <Plus aria-hidden="true" />
          프로젝트 추가
        </Button>
      </DocumentSection>
    </DocumentModalShell>
  )
}

