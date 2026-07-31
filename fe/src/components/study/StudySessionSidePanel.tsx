import { useState } from 'react'
import {
  CheckCircle2,
  FilePenLine,
  FileText,
  Search,
  UserRound,
} from 'lucide-react'
import { CountUp } from '@/components/reactbits/CountUp'
import {
  StudyEvaluationRadar,
  type StudyEvaluationScores,
} from '@/components/study/StudyEvaluationRadar'
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

function createDefaultEvaluationScores(): StudyEvaluationScores {
  return studyEvaluationCategories.reduce<StudyEvaluationScores>(
    (result, category) => {
      result[category] = 5
      return result
    },
    {} as StudyEvaluationScores,
  )
}

// 세션 우측 패널: 참가자 이력서·자소서 열람과 참가자 평가 입력을 탭으로 전환한다.
export function StudySessionSidePanel({ participants }: StudySessionSidePanelProps) {
  const otherParticipants = participants.filter((participant) => !participant.isSelf)
  const [activeTab, setActiveTab] = useState<SidePanelTab>('documents')
  const [documentTargetId, setDocumentTargetId] = useState(otherParticipants[0]?.participantId ?? null)
  const [openDocumentType, setOpenDocumentType] = useState<DocumentType | null>(null)
  const [evaluationTargetId, setEvaluationTargetId] = useState(otherParticipants[0]?.participantId ?? null)
  const [scores, setScores] = useState<StudyEvaluationScores>(
    createDefaultEvaluationScores,
  )
  const [comment, setComment] = useState('')

  const documentTarget = participants.find((participant) => participant.participantId === documentTargetId) ?? null

  const isEvaluationComplete = evaluationTargetId !== null
  const averageScore =
    studyEvaluationCategories.reduce(
      (total, category) => total + scores[category],
      0,
    ) / studyEvaluationCategories.length

  const handleScoreChange = (
    category: StudyEvaluationCategory,
    value: number,
  ) => {
    if (!Number.isFinite(value)) return
    const normalizedScore = Math.min(Math.max(Math.round(value), 0), 10)
    setScores((prev) => ({ ...prev, [category]: normalizedScore }))
  }

  const handleSubmitEvaluation = () => {
    if (!isEvaluationComplete) return

    // TODO: 실제 API 연동 필요 — 평가 제출 API로 교체. 지금은 입력값만 확인한다.
    console.log('스터디 세션 평가 제출', { targetId: evaluationTargetId, scores, comment })
    setScores(createDefaultEvaluationScores())
    setComment('')
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
                  setScores(createDefaultEvaluationScores())
                  setComment('')
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

            <StudyEvaluationRadar scores={scores} />

            <section className="rounded-ait-m border border-border-default bg-surface-default p-4 shadow-elevation-1">
              <div className="mb-2 flex items-end justify-between gap-3">
                <h2 className="text-body-2 font-semibold text-text-primary">
                  항목별 점수
                </h2>
                <p
                  id="evaluation-score-help"
                  className="text-[11px] text-text-secondary"
                >
                  휠 또는 ↑↓로 조절
                </p>
              </div>

              <div className="divide-y divide-border-default">
                {studyEvaluationCategories.map((category) => (
                  <div
                    key={category}
                    className="flex min-h-16 items-center justify-between gap-4 py-2.5"
                  >
                    <label
                      htmlFor={`score-${category}`}
                      className="text-body-1 font-medium text-text-primary"
                    >
                      {category}
                    </label>
                    <div className="flex shrink-0 items-center gap-2">
                      <div className="relative h-11 w-20 overflow-hidden rounded-ait-s border-2 border-action-primary bg-surface-default transition-[border-color,box-shadow] focus-within:ring-3 focus-within:ring-action-primary/20">
                        <input
                          id={`score-${category}`}
                          type="number"
                          min={0}
                          max={10}
                          step={1}
                          inputMode="numeric"
                          value={scores[category]}
                          onChange={(event) =>
                            handleScoreChange(
                              category,
                              event.currentTarget.valueAsNumber,
                            )
                          }
                          onWheel={(event) => {
                            event.preventDefault()
                            const delta = event.deltaY < 0 ? 1 : -1
                            handleScoreChange(
                              category,
                              scores[category] + delta,
                            )
                          }}
                          onFocus={(event) => event.currentTarget.select()}
                          aria-describedby="evaluation-score-help"
                          className="absolute inset-0 z-10 size-full bg-transparent px-2 text-center text-transparent caret-transparent focus:outline-none"
                        />
                        <span
                          className="pointer-events-none absolute inset-y-0 left-0 right-5 flex items-center justify-center text-body-1 font-bold tabular-nums text-action-primary"
                          aria-hidden="true"
                        >
                          <CountUp
                            from={5}
                            to={scores[category]}
                            duration={0.28}
                          />
                        </span>
                      </div>
                      <span className="w-7 text-caption tabular-nums text-text-secondary">
                        /10
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <div
              className="flex items-center justify-between rounded-ait-m border border-status-achievement-border bg-status-achievement-surface px-4 py-3"
              aria-label={`5개 항목 평균 ${averageScore.toFixed(1)}점`}
            >
              <div>
                <p className="text-body-2 font-semibold text-action-primary">
                  5개 항목 평균
                </p>
                <p className="mt-0.5 text-caption text-text-secondary">
                  입력한 점수에 따라 실시간으로 계산됩니다.
                </p>
              </div>
              <strong className="flex items-baseline gap-1 text-h2 tabular-nums text-action-primary">
                <CountUp
                  from={5}
                  to={averageScore}
                  duration={0.38}
                  decimals={1}
                />
                <span className="text-caption font-medium text-text-secondary">
                  /10
                </span>
              </strong>
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
                : '평가할 참가자가 없습니다'}
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
