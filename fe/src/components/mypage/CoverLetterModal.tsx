import { Plus, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
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

interface CoverQuestion {
  id: number
  prompt: string
  answer: string
}

interface CoverDocument {
  id: number
  basic: {
    title: string
    company: string
    role: string
  }
  questions: CoverQuestion[]
  lastModified: string
}

const initialDocuments: CoverDocument[] = [
  {
    id: 1,
    basic: {
      title: '백엔드 개발자로 성장해 온 과정',
      company: '삼성전자',
      role: 'SW 개발',
    },
    questions: [
      {
        id: 1,
        prompt: '지원 동기와 입사 후 포부를 작성해주세요.',
        answer:
          '문제를 작게 나누고 끝까지 해결하는 개발자입니다. 팀과 함께 안정적인 서비스를 만들고, 사용자의 면접 준비 과정을 더 나은 경험으로 바꾸고 싶습니다.',
      },
    ],
    lastModified: '2026. 07. 09',
  },
  {
    id: 2,
    basic: {
      title: '문제를 끝까지 해결하는 개발자',
      company: '네이버',
      role: '백엔드 개발',
    },
    questions: [
      {
        id: 1,
        prompt: '가장 도전적이었던 문제와 해결 과정을 설명해주세요.',
        answer:
          '복잡한 문제를 현상과 원인으로 나누고, 로그와 지표를 기준으로 가설을 검증했습니다. 팀원과 검증 결과를 공유하며 안정적인 해결책을 적용했습니다.',
      },
    ],
    lastModified: '2026. 06. 28',
  },
  {
    id: 3,
    basic: {
      title: '사용자 경험을 개선한 프로젝트',
      company: '카카오',
      role: '서버 개발',
    },
    questions: [
      {
        id: 1,
        prompt: '협업을 통해 사용자 경험을 개선한 사례를 작성해주세요.',
        answer:
          '사용자 피드백을 기능 단위로 분류하고 기획·디자인·개발 팀과 우선순위를 조율했습니다. 작은 단위로 반영하고 반응을 확인하며 이탈 구간을 개선했습니다.',
      },
    ],
    lastModified: '2026. 06. 14',
  },
]

function today() {
  const date = new Date()
  return `${date.getFullYear()}. ${String(date.getMonth() + 1).padStart(2, '0')}. ${String(date.getDate()).padStart(2, '0')}`
}

export function CoverLetterModal({ open, onOpenChange }: CoverLetterModalProps) {
  const [documents, setDocuments] = useState(initialDocuments)
  const [activeDocumentIndex, setActiveDocumentIndex] = useState(0)
  const [editorOpen, setEditorOpen] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [pendingRemoval, setPendingRemoval] = useState<number | null>(null)
  const [newItem, setNewItem] = useState<number | null>(null)
  const [saved, setSaved] = useState(false)
  const activeDocument = documents[activeDocumentIndex]

  const updateActiveDocument = (
    update: (document: CoverDocument) => CoverDocument,
  ) => {
    setDocuments((current) =>
      current.map((document, index) =>
        index === activeDocumentIndex ? update(document) : document,
      ),
    )
  }

  const selectDocument = (index: number) => {
    setActiveDocumentIndex(index)
    setErrors({})
    setPendingRemoval(null)
    setNewItem(null)
    setSaved(false)
    setEditorOpen(true)
  }

  const clearError = (key: string) => {
    setErrors((current) => {
      const next = { ...current }
      delete next[key]
      return next
    })
    setSaved(false)
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors: Record<string, string> = {}
    Object.entries(activeDocument.basic).forEach(([key, value]) => {
      if (!value.trim()) {
        nextErrors[`cover-${key}`] = '필수 항목을 입력해주세요.'
      }
    })
    activeDocument.questions.forEach((question) => {
      if (!question.prompt.trim()) {
        nextErrors[`question-${question.id}-prompt`] =
          '자기소개서 문항을 입력해주세요.'
      }
      if (!question.answer.trim()) {
        nextErrors[`question-${question.id}-answer`] =
          '문항에 대한 답변을 입력해주세요.'
      }
    })
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    updateActiveDocument((document) => ({
      ...document,
      lastModified: today(),
    }))
    setSaved(true)
  }

  const addQuestion = () => {
    const id =
      Math.max(0, ...activeDocument.questions.map((question) => question.id)) +
      1
    updateActiveDocument((document) => ({
      ...document,
      questions: [...document.questions, { id, prompt: '', answer: '' }],
    }))
    setNewItem(id)
    setSaved(false)
  }

  const finishRemoval = (id: number) => {
    if (pendingRemoval !== id) return
    updateActiveDocument((document) => ({
      ...document,
      questions: document.questions.filter((question) => question.id !== id),
    }))
    setPendingRemoval(null)
    setSaved(false)
  }

  return (
    <>
      <CoverLetterPicker
        open={open}
        onOpenChange={onOpenChange}
        items={documents.map((document) => document.basic.title)}
        onSelect={selectDocument}
      />

      <DocumentModalShell
        open={editorOpen}
        onOpenChange={setEditorOpen}
        title="자기소개서 작성"
        description="지원하는 기업과 직무에 맞게 자신의 경험을 정리해주세요."
        lastModified={activeDocument.lastModified}
        saved={saved}
        onSubmit={handleSubmit}
      >
        <div className="min-w-0">
          <DocumentSection
            title="기본 정보"
            description="자기소개서 제목과 지원할 기업·직무를 입력하세요."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              {(
                [
                  ['title', '제목', 'sm:col-span-2'],
                  ['company', '기업명', ''],
                  ['role', '지원 직무', ''],
                ] as const
              ).map(([key, label, className]) => {
                const fieldKey = `cover-${key}`
                return (
                  <FormField
                    key={key}
                    id={fieldKey}
                    label={label}
                    required
                    error={errors[fieldKey]}
                    className={className}
                  >
                    <Input
                      id={fieldKey}
                      value={activeDocument.basic[key]}
                      aria-invalid={Boolean(errors[fieldKey])}
                      aria-describedby={
                        errors[fieldKey] ? `${fieldKey}-error` : undefined
                      }
                      onChange={(event) => {
                        updateActiveDocument((document) => ({
                          ...document,
                          basic: {
                            ...document.basic,
                            [key]: event.target.value,
                          },
                        }))
                        clearError(fieldKey)
                      }}
                    />
                  </FormField>
                )
              })}
            </div>
          </DocumentSection>

          <DocumentSection
            title="자기소개서 문항"
            description="문항과 답변을 입력하면 자동으로 글자 수를 계산합니다."
          >
            {activeDocument.questions.map((question) => (
              <DynamicCard
                key={question.id}
                isNew={newItem === question.id}
                isRemoving={pendingRemoval === question.id}
                onAnimationEnd={() => finishRemoval(question.id)}
              >
                <div className="mb-3 flex justify-end">
                  <Button
                    type="button"
                    variant="text"
                    size="icon"
                    aria-label="자기소개서 문항 삭제"
                    onClick={() => setPendingRemoval(question.id)}
                    disabled={activeDocument.questions.length === 1}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </div>
                <FormField
                  id={`question-${question.id}-prompt`}
                  label="문항"
                  required
                  error={errors[`question-${question.id}-prompt`]}
                >
                  <Input
                    id={`question-${question.id}-prompt`}
                    value={question.prompt}
                    aria-invalid={Boolean(
                      errors[`question-${question.id}-prompt`],
                    )}
                    aria-describedby={
                      errors[`question-${question.id}-prompt`]
                        ? `question-${question.id}-prompt-error`
                        : undefined
                    }
                    onChange={(event) => {
                      updateActiveDocument((document) => ({
                        ...document,
                        questions: document.questions.map((item) =>
                          item.id === question.id
                            ? { ...item, prompt: event.target.value }
                            : item,
                        ),
                      }))
                      clearError(`question-${question.id}-prompt`)
                    }}
                  />
                </FormField>
                <FormField
                  id={`question-${question.id}-answer`}
                  label="답변"
                  required
                  error={errors[`question-${question.id}-answer`]}
                  className="mt-4"
                >
                  <div className="relative">
                    <Textarea
                      id={`question-${question.id}-answer`}
                      value={question.answer}
                      maxLength={1000}
                      className="min-h-48 pb-10"
                      aria-invalid={Boolean(
                        errors[`question-${question.id}-answer`],
                      )}
                      aria-describedby={
                        errors[`question-${question.id}-answer`]
                          ? `question-${question.id}-answer-error question-${question.id}-count`
                          : `question-${question.id}-count`
                      }
                      onChange={(event) => {
                        updateActiveDocument((document) => ({
                          ...document,
                          questions: document.questions.map((item) =>
                            item.id === question.id
                              ? { ...item, answer: event.target.value }
                              : item,
                          ),
                        }))
                        clearError(`question-${question.id}-answer`)
                      }}
                    />
                    <span
                      id={`question-${question.id}-count`}
                      className="absolute bottom-3 right-3 text-caption text-text-secondary"
                      aria-live="polite"
                    >
                      {question.answer.length} / 1000자
                    </span>
                  </div>
                </FormField>
              </DynamicCard>
            ))}
            <Button
              type="button"
              variant="secondary"
              className="w-full border-dashed"
              onClick={addQuestion}
            >
              <Plus aria-hidden="true" />
              문항 추가
            </Button>
          </DocumentSection>
        </div>
      </DocumentModalShell>
    </>
  )
}

