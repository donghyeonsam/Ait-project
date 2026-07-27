import { useState } from 'react'
import { FilePenLine, FileText, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { studyEvaluationCategories, type StudyParticipant } from '@/mocks/study'
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

// 세션 우측 패널: 참가자 이력서·자소서 열람과 참가자 평가 입력을 탭으로 전환한다.
export function StudySessionSidePanel({ participants }: StudySessionSidePanelProps) {
  const otherParticipants = participants.filter((participant) => !participant.isSelf)
  const [activeTab, setActiveTab] = useState<SidePanelTab>('documents')
  const [documentTargetId, setDocumentTargetId] = useState(otherParticipants[0]?.participantId ?? null)
  const [openDocumentType, setOpenDocumentType] = useState<DocumentType | null>(null)
  const [evaluationTargetId, setEvaluationTargetId] = useState(otherParticipants[0]?.participantId ?? null)
  const [scores, setScores] = useState<Record<string, string>>({})
  const [comment, setComment] = useState('')

  const documentTarget = participants.find((participant) => participant.participantId === documentTargetId) ?? null

  const handleScoreChange = (category: string, value: string) => {
    if (value !== '' && !/^\d{0,2}$/.test(value)) return
    setScores((prev) => ({ ...prev, [category]: value }))
  }

  const handleSubmitEvaluation = () => {
    // TODO: 실제 API 연동 필요 — 평가 제출 API로 교체. 지금은 입력값만 확인한다.
    console.log('스터디 세션 평가 제출', { targetId: evaluationTargetId, scores, comment })
    setScores({})
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
          <div className="flex flex-col gap-5">
            <div>
              <label htmlFor="evaluation-target-select" className="text-body-2 font-medium text-text-primary">
                평가 대상
              </label>
              <select
                id="evaluation-target-select"
                className="mt-2 w-full rounded-ait-s border border-border-default bg-surface-default px-3 py-2 text-body-2 text-text-primary focus:border-action-primary focus:outline-none focus:ring-3 focus:ring-action-primary/25"
                value={evaluationTargetId ?? ''}
                onChange={(event) => setEvaluationTargetId(Number(event.target.value))}
              >
                {otherParticipants.map((participant) => (
                  <option key={participant.participantId} value={participant.participantId}>
                    {participant.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-3">
              {studyEvaluationCategories.map((category) => (
                <div key={category} className="flex items-center justify-between gap-3">
                  <label htmlFor={`score-${category}`} className="text-body-2 text-text-primary">
                    {category}
                  </label>
                  <div className="flex items-center gap-1.5">
                    <Input
                      id={`score-${category}`}
                      inputMode="numeric"
                      value={scores[category] ?? ''}
                      onChange={(event) => handleScoreChange(category, event.target.value)}
                      className="h-9 w-16 text-center"
                      aria-describedby={`score-${category}-unit`}
                    />
                    <span id={`score-${category}-unit`} className="text-caption text-text-secondary">
                      /10
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div>
              <label htmlFor="evaluation-comment" className="text-body-2 font-medium text-text-primary">
                코멘트
              </label>
              <Textarea
                id="evaluation-comment"
                value={comment}
                maxLength={commentMaxLength}
                onChange={(event) => setComment(event.target.value)}
                placeholder="총평을 남겨주세요."
                className="mt-2 min-h-24 resize-none"
              />
              <p className="mt-1 text-right text-caption text-text-secondary">
                {comment.length}/{commentMaxLength}
              </p>
            </div>

            <Button type="button" className="w-full" onClick={handleSubmitEvaluation}>
              평가 제출
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
