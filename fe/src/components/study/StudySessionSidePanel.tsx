import { useState } from 'react'
import {
  CheckCircle2,
  ClipboardCheck,
  FilePenLine,
  FileText,
  Search,
  UserRound,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import {
  studyEvaluationCategories,
  type StudyEvaluationCategory,
  type StudyParticipant,
} from '@/mocks/study'
import { cn } from '@/lib/utils'

type SidePanelTab = 'documents' | 'evaluation'
type DocumentType = 'resume' | 'coverLetter'

interface StudySessionSidePanelProps {
  participants: StudyParticipant[]
}

const tabs: Array<{ id: SidePanelTab; label: string }> = [
  { id: 'documents', label: '이력서/자소서' },
  { id: 'evaluation', label: '평가' },
]

const commentMaxLength = 100
const evaluationScoreValues = Array.from({ length: 11 }, (_, index) => index)
const evaluationCategoryDescriptions: Record<
  StudyEvaluationCategory,
  string
> = {
  논리력: '근거와 결론이 명확하게 이어지는지 평가해 주세요.',
  표현력: '의견을 이해하기 쉽게 전달하는지 평가해 주세요.',
  태도: '경청과 상호 존중의 태도를 평가해 주세요.',
  '직무 전문성': '직무 지식과 답변의 구체성을 평가해 주세요.',
  자신감: '안정감 있고 주도적으로 답변하는지 평가해 주세요.',
}

type EvaluationScores = Partial<Record<StudyEvaluationCategory, number>>

// 세션 우측 패널: 참가자 이력서·자소서 열람과 참가자 평가 입력을 탭으로 전환한다.
export function StudySessionSidePanel({ participants }: StudySessionSidePanelProps) {
  const otherParticipants = participants.filter((participant) => !participant.isSelf)
  const [activeTab, setActiveTab] = useState<SidePanelTab>('documents')
  const [documentTargetId, setDocumentTargetId] = useState(otherParticipants[0]?.participantId ?? null)
  const [openDocumentType, setOpenDocumentType] = useState<DocumentType | null>(null)
  const [evaluationTargetId, setEvaluationTargetId] = useState(otherParticipants[0]?.participantId ?? null)
  const [scores, setScores] = useState<EvaluationScores>({})
  const [comment, setComment] = useState('')
  const [evaluationError, setEvaluationError] = useState<string | null>(null)

  const documentTarget = participants.find((participant) => participant.participantId === documentTargetId) ?? null

  const completedScoreCount = studyEvaluationCategories.filter(
    (category) => scores[category] !== undefined,
  ).length
  const isEvaluationComplete =
    evaluationTargetId !== null &&
    completedScoreCount === studyEvaluationCategories.length

  const handleScoreChange = (
    category: StudyEvaluationCategory,
    value: number,
  ) => {
    if (!Number.isInteger(value) || value < 0 || value > 10) return
    setScores((prev) => ({ ...prev, [category]: value }))
    setEvaluationError(null)
  }

  const handleSubmitEvaluation = () => {
    if (!isEvaluationComplete) {
      setEvaluationError('모든 평가 항목에 0~10점의 정수를 선택해 주세요.')
      return
    }

    // TODO: 실제 API 연동 필요 — 평가 제출 API로 교체. 지금은 입력값만 확인한다.
    console.log('스터디 세션 평가 제출', { targetId: evaluationTargetId, scores, comment })
    setScores({})
    setComment('')
    setEvaluationError(null)
  }

  // TODO: 실제 API 연동 필요 — 서류함의 이력서/자소서 상세 조회로 교체. 지금은 참가자별 mock 요약을 보여준다.
  const openDocumentTitle =
    openDocumentType === 'resume'
      ? (documentTarget ? `${documentTarget.name}님의 이력서` : '이력서')
      : (documentTarget?.coverLetterTitle ?? '자소서')
  const openDocumentContent =
    openDocumentType === 'resume' ? documentTarget?.resumeSummary : documentTarget?.coverLetterSummary

  return (
    <div className="flex h-full flex-col">
      <div className="flex border-b border-border-default" role="tablist" aria-label="세션 패널">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex-1 border-b-2 px-4 py-3 text-body-2 font-medium transition-colors duration-(--duration-fast) ease-standard',
              activeTab === tab.id
                ? 'border-action-primary text-action-primary'
                : 'border-transparent text-text-secondary hover:text-text-primary',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        {activeTab === 'documents' ? (
          <div className="flex flex-col gap-5">
            <div>
              <label htmlFor="document-target-select" className="text-body-2 font-medium text-text-primary">
                열람 대상
              </label>
              <select
                id="document-target-select"
                className="mt-2 w-full rounded-ait-s border border-border-default bg-surface-default px-3 py-2 text-body-2 text-text-primary focus:border-action-primary focus:outline-none focus:ring-3 focus:ring-action-primary/25"
                value={documentTargetId ?? ''}
                onChange={(event) => setDocumentTargetId(Number(event.target.value))}
              >
                {participants.map((participant) => (
                  <option key={participant.participantId} value={participant.participantId}>
                    {participant.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 rounded-ait-s border border-border-default px-3 py-2.5">
              <FileText className="size-4 shrink-0 text-text-secondary" aria-hidden="true" />
              <span className="shrink-0 text-body-2 font-medium text-text-primary">이력서</span>
              <span className="min-w-0 flex-1 truncate text-body-2 text-text-secondary">
                {documentTarget ? `${documentTarget.name}님의 이력서` : '-'}
              </span>
              <Button
                type="button"
                variant="text"
                size="icon"
                className="size-8 shrink-0"
                disabled={!documentTarget}
                aria-label="이력서 크게 보기"
                onClick={() => setOpenDocumentType('resume')}
              >
                <Search className="size-4" aria-hidden="true" />
              </Button>
            </div>

            <div className="flex items-center gap-2 rounded-ait-s border border-border-default px-3 py-2.5">
              <FilePenLine className="size-4 shrink-0 text-text-secondary" aria-hidden="true" />
              <span className="shrink-0 text-body-2 font-medium text-text-primary">자소서</span>
              <span className="min-w-0 flex-1 truncate text-body-2 text-text-secondary">
                {documentTarget?.coverLetterTitle ?? '-'}
              </span>
              <Button
                type="button"
                variant="text"
                size="icon"
                className="size-8 shrink-0"
                disabled={!documentTarget}
                aria-label="자소서 크게 보기"
                onClick={() => setOpenDocumentType('coverLetter')}
              >
                <Search className="size-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="rounded-ait-m border border-status-achievement-border bg-status-achievement-surface p-4">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-ait-s bg-action-primary text-surface-default">
                  <ClipboardCheck className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-body-1 font-semibold text-action-primary">
                    동료 평가
                  </h2>
                  <p className="mt-1 text-caption leading-relaxed text-text-secondary">
                    실제 관찰한 내용을 기준으로 각 항목에 0~10점의 정수를
                    선택해 주세요.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-ait-m border border-border-default bg-surface-default p-4 shadow-elevation-1">
              <label
                htmlFor="evaluation-target-select"
                className="flex items-center gap-2 text-body-2 font-semibold text-text-primary"
              >
                <UserRound className="size-4 text-text-secondary" aria-hidden="true" />
                평가 대상
              </label>
              <select
                id="evaluation-target-select"
                className="mt-2 w-full rounded-ait-s border border-border-default bg-surface-default px-3 py-2 text-body-2 text-text-primary focus:border-action-primary focus:outline-none focus:ring-3 focus:ring-action-primary/25"
                value={evaluationTargetId ?? ''}
                onChange={(event) => {
                  setEvaluationTargetId(Number(event.target.value))
                  setScores({})
                  setComment('')
                  setEvaluationError(null)
                }}
                disabled={otherParticipants.length === 0}
              >
                {otherParticipants.length === 0 ? (
                  <option value="">평가할 참가자가 없습니다</option>
                ) : null}
                {otherParticipants.map((participant) => (
                  <option key={participant.participantId} value={participant.participantId}>
                    {participant.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-body-2 font-semibold text-text-primary">
                  항목별 점수
                </p>
                <span className="text-caption tabular-nums text-text-secondary">
                  {completedScoreCount}/{studyEvaluationCategories.length} 완료
                </span>
              </div>
              <div
                className="h-1.5 overflow-hidden rounded-ait-pill bg-status-neutral-surface"
                aria-hidden="true"
              >
                <span
                  className="block h-full rounded-ait-pill bg-status-success transition-[width] duration-250 ease-standard motion-reduce:transition-none"
                  style={{
                    width: `${(completedScoreCount / studyEvaluationCategories.length) * 100}%`,
                  }}
                />
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {studyEvaluationCategories.map((category, categoryIndex) => {
                const selectedScore = scores[category]

                return (
                  <fieldset
                    key={category}
                    className="rounded-ait-m border border-border-default bg-surface-default p-3 shadow-elevation-1"
                  >
                    <legend className="sr-only">{category} 점수</legend>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-body-2 font-semibold text-text-primary">
                          <span className="mr-1.5 text-caption text-text-secondary">
                            {categoryIndex + 1}.
                          </span>
                          {category}
                        </p>
                        <p className="mt-1 text-caption leading-relaxed text-text-secondary">
                          {evaluationCategoryDescriptions[category]}
                        </p>
                      </div>
                      <output
                        className={cn(
                          'flex h-8 min-w-12 shrink-0 items-center justify-center rounded-ait-s px-2 text-body-2 font-bold tabular-nums',
                          selectedScore === undefined
                            ? 'bg-status-neutral-surface text-text-secondary'
                            : 'bg-action-primary text-surface-default',
                        )}
                        aria-label={
                          selectedScore === undefined
                            ? `${category} 점수 미선택`
                            : `${category} 선택 점수 ${selectedScore}점`
                        }
                      >
                        {selectedScore === undefined ? '—' : `${selectedScore}/10`}
                      </output>
                    </div>

                    <div className="mt-3 grid grid-cols-[repeat(11,minmax(0,1fr))] gap-1">
                      {evaluationScoreValues.map((score) => (
                        <button
                          key={score}
                          type="button"
                          onClick={() => handleScoreChange(category, score)}
                          aria-pressed={selectedScore === score}
                          aria-label={`${category} ${score}점`}
                          className={cn(
                            'flex h-7 min-w-0 items-center justify-center rounded-ait-s text-[11px] font-semibold tabular-nums transition-[background-color,color,transform] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-primary/30 motion-reduce:transform-none',
                            selectedScore === score
                              ? 'bg-action-primary text-surface-default shadow-elevation-1'
                              : 'bg-status-neutral-surface text-text-secondary hover:bg-status-achievement-surface hover:text-action-primary',
                          )}
                        >
                          {score}
                        </button>
                      ))}
                    </div>
                    <div className="mt-1.5 flex justify-between text-[10px] text-text-secondary">
                      <span>보완 필요</span>
                      <span>매우 우수</span>
                    </div>
                  </fieldset>
                )
              })}
            </div>

            <div className="rounded-ait-m border border-border-default bg-surface-default p-4 shadow-elevation-1">
              <div className="flex items-center justify-between gap-3">
                <label
                  htmlFor="evaluation-comment"
                  className="text-body-2 font-semibold text-text-primary"
                >
                  한 줄 피드백
                </label>
                <span className="text-caption tabular-nums text-text-secondary">
                  {comment.length}/{commentMaxLength}
                </span>
              </div>
              <Textarea
                id="evaluation-comment"
                value={comment}
                maxLength={commentMaxLength}
                onChange={(event) => setComment(event.target.value)}
                placeholder="잘한 점과 보완할 점을 구체적으로 남겨주세요."
                className="mt-2 min-h-24 resize-none shadow-none"
              />
            </div>

            {evaluationError ? (
              <p
                className="rounded-ait-s bg-status-error-surface px-3 py-2 text-caption text-status-error"
                role="alert"
              >
                {evaluationError}
              </p>
            ) : null}

            <Button
              type="button"
              className="w-full"
              disabled={!isEvaluationComplete}
              onClick={handleSubmitEvaluation}
            >
              {isEvaluationComplete ? (
                <CheckCircle2 className="size-5" aria-hidden="true" />
              ) : null}
              {isEvaluationComplete
                ? '평가 제출'
                : `${studyEvaluationCategories.length - completedScoreCount}개 항목을 선택해 주세요`}
            </Button>
          </div>
        )}
      </div>

      <Dialog open={openDocumentType !== null} onOpenChange={(open) => setOpenDocumentType(open ? openDocumentType : null)}>
        <DialogContent className="max-h-[85vh] w-[min(42rem,calc(100vw-2rem))] overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle>{openDocumentTitle}</DialogTitle>
          </DialogHeader>

          <p className="mt-4 whitespace-pre-wrap text-body-1 leading-relaxed text-text-primary">
            {openDocumentContent}
          </p>
        </DialogContent>
      </Dialog>
    </div>
  )
}
