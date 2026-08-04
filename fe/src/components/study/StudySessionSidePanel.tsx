import { useCallback, useEffect, useRef, useState } from 'react'
import {
  CheckCircle2,
  FilePenLine,
  FileText,
  Search,
  UserRound,
} from 'lucide-react'
import type { CoverLetterDetail } from '@/api/cover-letters'
import { toErrorMessage } from '@/api/http'
import {
  createPeerFeedback,
  getMyPeerFeedbacksInSession,
  updatePeerFeedback,
  type PeerFeedback,
} from '@/api/peer-feedback'
import { getResume, type Resume } from '@/api/resume'
import { getStudySessionCoverLetter } from '@/api/study-sessions'
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
import {
  toEvaluationScores,
  toPeerFeedbackCreateRequest,
  toPeerFeedbackUpdateRequest,
} from '@/lib/peer-evaluation'
import { cn } from '@/lib/utils'

type SidePanelTab = 'documents' | 'evaluation'
type DocumentType = 'resume' | 'coverLetter'

interface StudySessionSidePanelProps {
  sessionId: number
  participants: StudyParticipant[]
}

const tabs: Array<{ id: SidePanelTab; label: string }> = [
  { id: 'documents', label: '이력서/자소서' },
  { id: 'evaluation', label: '평가' },
]

const commentMaxLength = 100

const documentCardClass = 'rounded-ait-s border border-border-default p-3'

// 이력서 상세: 경력·프로젝트·학력을 최신 항목이 먼저 오도록 그대로(서버 정렬 순서) 나열한다.
// AI 분석(analysisContent)은 소유자 본인을 위한 내용이라, 다른 참가자를 열람하는 이 화면에는 보여주지 않는다.
function ResumeDocumentView({ resume }: { resume: Resume }) {
  return (
    <div className="flex flex-col gap-5">
      <section>
        <h3 className="text-body-2 font-semibold text-text-primary">경력</h3>
        {resume.careers.length === 0 ? (
          <p className="mt-2 text-body-2 text-text-secondary">등록된 경력이 없습니다.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-3">
            {resume.careers.map((career) => (
              <li key={career.careerId} className={documentCardClass}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-body-1 font-medium text-text-primary">
                    {career.companyName} · {career.role}
                  </p>
                  <p className="text-caption tabular-nums text-text-secondary">
                    {career.startDate} ~ {career.endDate ?? '재직 중'}
                  </p>
                </div>
                {career.description ? (
                  <p className="mt-1 whitespace-pre-wrap text-body-2 text-text-secondary">
                    {career.description}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="text-body-2 font-semibold text-text-primary">프로젝트</h3>
        {resume.projects.length === 0 ? (
          <p className="mt-2 text-body-2 text-text-secondary">등록된 프로젝트가 없습니다.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-3">
            {resume.projects.map((project) => (
              <li key={project.projectId} className={documentCardClass}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-body-1 font-medium text-text-primary">{project.projectName}</p>
                  <p className="text-caption text-text-secondary">{project.role}</p>
                </div>
                <p className="mt-1 text-caption text-text-secondary">{project.techStacks}</p>
                {project.description ? (
                  <p className="mt-1 whitespace-pre-wrap text-body-2 text-text-secondary">
                    {project.description}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="text-body-2 font-semibold text-text-primary">학력/교육</h3>
        {resume.trainings.length === 0 ? (
          <p className="mt-2 text-body-2 text-text-secondary">등록된 학력/교육이 없습니다.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-3">
            {resume.trainings.map((training) => (
              <li key={training.trainingId} className={documentCardClass}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-body-1 font-medium text-text-primary">
                    {training.organization} · {training.course}
                  </p>
                  <p className="text-caption tabular-nums text-text-secondary">
                    {training.startDate} ~ {training.endDate}
                  </p>
                </div>
                {training.description ? (
                  <p className="mt-1 whitespace-pre-wrap text-body-2 text-text-secondary">
                    {training.description}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

// 자소서 상세: 문항 순서(contentOrder)대로 질문·답변을 나열한다.
// AI 분석(analysisContent)은 소유자 본인을 위한 내용이라, 다른 참가자를 열람하는 이 화면에는 보여주지 않는다.
function CoverLetterDocumentView({ coverLetter }: { coverLetter: CoverLetterDetail }) {
  const sortedContents = [...coverLetter.coverLetterContents].sort(
    (a, b) => a.contentOrder - b.contentOrder,
  )

  return (
    <div className="flex flex-col gap-5">
      <p className="text-body-2 text-text-secondary">
        {coverLetter.companyName} · {coverLetter.role}
      </p>

      <section className="divide-y divide-border-default">
        {sortedContents.map((content) => (
          <div key={content.contentId} className="py-4 first:pt-0 last:pb-0">
            <h3 className="text-body-2 font-semibold text-text-primary">{content.question}</h3>
            <p className="mt-2 whitespace-pre-wrap text-body-1 leading-relaxed text-text-primary">
              {content.answer}
            </p>
          </div>
        ))}
      </section>
    </div>
  )
}

interface ScoreFieldProps {
  category: StudyEvaluationCategory
  score: number
  onChange: (category: StudyEvaluationCategory, value: number) => void
}

// 점수 입력칸: 휠로 점수를 조절한다. React의 onWheel은 passive 리스너로 등록돼 preventDefault가
// 무시되고 뒤에 있는 목록까지 같이 스크롤되므로, 네이티브 리스너를 직접 걸어 그 버블링을 막는다.
function ScoreField({ category, score, onChange }: ScoreFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const node = inputRef.current
    if (!node) return
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault()
      const delta = event.deltaY < 0 ? 1 : -1
      onChange(category, score + delta)
    }
    node.addEventListener('wheel', handleWheel, { passive: false })
    return () => node.removeEventListener('wheel', handleWheel)
  }, [category, score, onChange])

  return (
    <div className="relative h-11 w-20 overflow-hidden rounded-ait-s bg-surface-default transition-shadow focus-within:ring-3 focus-within:ring-action-primary/20">
      <input
        ref={inputRef}
        id={`score-${category}`}
        type="number"
        min={0}
        max={10}
        step={1}
        inputMode="numeric"
        value={score}
        onChange={(event) => onChange(category, event.currentTarget.valueAsNumber)}
        onFocus={(event) => event.currentTarget.select()}
        aria-describedby="evaluation-score-help"
        className="absolute inset-0 z-10 size-full bg-transparent px-2 text-center text-transparent caret-transparent focus:outline-none"
      />
      <span
        className="pointer-events-none absolute inset-y-0 left-0 right-5 flex items-center justify-center text-body-1 font-bold tabular-nums text-action-primary"
        aria-hidden="true"
      >
        <CountUp from={5} to={score} duration={0.28} />
      </span>
    </div>
  )
}

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
export function StudySessionSidePanel({ sessionId, participants }: StudySessionSidePanelProps) {
  const otherParticipants = participants.filter((participant) => !participant.isSelf)
  const [activeTab, setActiveTab] = useState<SidePanelTab>('documents')
  // 사이드 패널은 상대방이 아직 입장하기 전(나만 접속한 시점)에 먼저 마운트되는 경우가 대부분이라,
  // useState 초기값으로 otherParticipants[0]을 한 번만 넣으면 그 뒤 상대가 들어와도 계속 null로 남는다.
  // 그래서 "사용자가 직접 고른 값"만 상태로 두고, 없으면 매 렌더 최신 otherParticipants에서 기본값을 뽑는다.
  const [selectedDocumentTargetId, setSelectedDocumentTargetId] = useState<number | null>(null)
  const documentTargetId = selectedDocumentTargetId ?? otherParticipants[0]?.participantId ?? null
  const [openDocumentType, setOpenDocumentType] = useState<DocumentType | null>(null)
  const [resumeData, setResumeData] = useState<Resume | null>(null)
  const [coverLetterData, setCoverLetterData] = useState<CoverLetterDetail | null>(null)
  const [documentLoading, setDocumentLoading] = useState(false)
  const [documentError, setDocumentError] = useState<string | null>(null)
  // 이 세션에서 이미 제출한 평가. evaluateeId로 찾아 수정 시 기존 점수·코멘트를 채우는 데 쓴다.
  const [submittedFeedbacks, setSubmittedFeedbacks] = useState<Map<number, PeerFeedback>>(
    new Map(),
  )
  const [selectedEvaluationTargetId, setSelectedEvaluationTargetId] = useState<number | null>(null)
  const [scores, setScores] = useState<StudyEvaluationScores>(
    createDefaultEvaluationScores,
  )
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // 이미 제출한 사람도 수정할 수 있어야 하므로 평가 대상 목록에서 빼지 않는다.
  const evaluationParticipants = otherParticipants
  const evaluationTargetId = selectedEvaluationTargetId ?? evaluationParticipants[0]?.participantId ?? null

  const documentTarget = participants.find((participant) => participant.participantId === documentTargetId) ?? null
  const evaluationTarget =
    participants.find((participant) => participant.participantId === evaluationTargetId) ?? null
  const existingFeedback =
    evaluationTarget?.userId != null ? (submittedFeedbacks.get(evaluationTarget.userId) ?? null) : null
  const isEditingEvaluation = existingFeedback !== null

  const isEvaluationComplete = evaluationTarget !== null
  const averageScore =
    studyEvaluationCategories.reduce(
      (total, category) => total + scores[category],
      0,
    ) / studyEvaluationCategories.length

  // 선택된 평가 대상에게 이미 제출한 평가가 있으면 그 값을, 없으면 기본값을 폼에 채운다.
  const applyEvaluationTarget = (targetId: number | null, feedbackMap: Map<number, PeerFeedback>) => {
    const target = participants.find((participant) => participant.participantId === targetId)
    const existing = target?.userId != null ? feedbackMap.get(target.userId) : undefined
    if (existing) {
      setScores(toEvaluationScores(existing))
      setComment(existing.feedback ?? '')
    } else {
      setScores(createDefaultEvaluationScores())
      setComment('')
    }
  }

  useEffect(() => {
    let isActive = true

    getMyPeerFeedbacksInSession(sessionId)
      .then((feedbacks) => {
        if (!isActive) return
        const feedbackMap = new Map(feedbacks.map((feedback) => [feedback.evaluateeId, feedback]))
        setSubmittedFeedbacks(feedbackMap)
        // 아직 대상을 직접 고르지 않았다면, 기본으로 선택된 대상이 이미 제출한 사람인지 확인해 값을 채운다.
        if (selectedEvaluationTargetId == null) {
          applyEvaluationTarget(otherParticipants[0]?.participantId ?? null, feedbackMap)
        }
      })
      // 이미 제출한 평가 표시는 보조 정보라, 실패해도 평가 자체는 계속 진행할 수 있게 둔다.
      .catch(() => {})

    return () => {
      isActive = false
    }
    // 최초 마운트·세션 변경 시 한 번만 조회한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])

  const handleScoreChange = useCallback(
    (category: StudyEvaluationCategory, value: number) => {
      if (!Number.isFinite(value)) return
      const normalizedScore = Math.min(Math.max(Math.round(value), 0), 10)
      setScores((prev) => ({ ...prev, [category]: normalizedScore }))
    },
    [],
  )

  const handleSubmitEvaluation = async () => {
    const evaluateeId = evaluationTarget?.userId
    if (evaluateeId == null) return

    setSubmitting(true)
    setSubmitError(null)
    try {
      if (existingFeedback) {
        const updated = await updatePeerFeedback(
          existingFeedback.id,
          toPeerFeedbackUpdateRequest(scores, comment),
        )
        setSubmittedFeedbacks((prev) => new Map(prev).set(evaluateeId, updated))
      } else {
        const created = await createPeerFeedback(
          sessionId,
          toPeerFeedbackCreateRequest(evaluateeId, scores, comment),
        )
        const nextSubmitted = new Map(submittedFeedbacks).set(evaluateeId, created)
        setSubmittedFeedbacks(nextSubmitted)
        // 새로 제출했을 때만 아직 평가하지 않은 다음 사람으로 자연스럽게 넘어간다.
        const nextTarget = evaluationParticipants.find(
          (participant) => participant.userId != null && !nextSubmitted.has(participant.userId),
        )
        if (nextTarget) {
          setSelectedEvaluationTargetId(nextTarget.participantId)
          applyEvaluationTarget(nextTarget.participantId, nextSubmitted)
        }
      }
    } catch (error) {
      setSubmitError(toErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  const openDocumentTitle =
    openDocumentType === 'resume'
      ? (documentTarget ? `${documentTarget.name}님의 이력서` : '이력서')
      : (documentTarget?.coverLetterTitle ?? '자소서')

  // 다이얼로그를 열 때(버튼 클릭)만 조회한다. 이력서는 소유자 제한이 없는 /api/resumes/{resumeId}로 바로 되지만,
  // 자소서는 세션 소속 여부로 검증하는 /api/study-sessions/{coverLetterId}가 아직 백엔드에 없어 배포 전까지는 404가 난다.
  // 로딩/이전 데이터 초기화는 이 이펙트가 아니라 버튼 클릭 핸들러(handleOpenDocument)에서 한다 —
  // 이펙트 본문에서 곧장 setState를 부르면 렌더링이 연쇄로 발생해 react-hooks/set-state-in-effect가 걸린다.
  useEffect(() => {
    if (!openDocumentType) return
    const targetId = openDocumentType === 'resume' ? documentTarget?.resumeId : documentTarget?.coverLetterId
    if (targetId == null) return

    let isActive = true

    const request =
      openDocumentType === 'resume'
        ? getResume(targetId).then((data) => {
            if (isActive) setResumeData(data)
          })
        : getStudySessionCoverLetter(targetId).then((data) => {
            if (isActive) setCoverLetterData(data)
          })

    request
      .catch((error: unknown) => {
        if (isActive) setDocumentError(toErrorMessage(error))
      })
      .finally(() => {
        if (isActive) setDocumentLoading(false)
      })

    return () => {
      isActive = false
    }
  }, [openDocumentType, documentTarget?.resumeId, documentTarget?.coverLetterId])

  const handleOpenDocument = (type: DocumentType) => {
    setOpenDocumentType(type)
    setDocumentLoading(true)
    setDocumentError(null)
    setResumeData(null)
    setCoverLetterData(null)
  }

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
                onChange={(event) => setSelectedDocumentTargetId(Number(event.target.value))}
                disabled={otherParticipants.length === 0}
              >
                {otherParticipants.length === 0 ? (
                  <option value="">조회할 참가자가 없습니다</option>
                ) : null}
                {otherParticipants.map((participant) => (
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
                {documentTarget
                  ? documentTarget.resumeId != null
                    ? `${documentTarget.name}님의 이력서`
                    : '제출한 이력서가 없습니다'
                  : '-'}
              </span>
              <Button
                type="button"
                variant="text"
                size="icon"
                className="size-8 shrink-0 disabled:bg-transparent disabled:shadow-none"
                disabled={documentTarget?.resumeId == null}
                aria-label="이력서 크게 보기"
                onClick={() => handleOpenDocument('resume')}
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
                className="size-8 shrink-0 disabled:bg-transparent disabled:shadow-none"
                disabled={documentTarget?.coverLetterId == null}
                aria-label="자소서 크게 보기"
                onClick={() => handleOpenDocument('coverLetter')}
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
                  const targetId = Number(event.target.value)
                  setSelectedEvaluationTargetId(targetId)
                  applyEvaluationTarget(targetId, submittedFeedbacks)
                }}
                disabled={evaluationParticipants.length === 0}
              >
                {evaluationParticipants.length === 0 ? (
                  <option value="">평가할 참가자가 없습니다</option>
                ) : null}
                {evaluationParticipants.map((participant) => (
                  <option key={participant.participantId} value={participant.participantId}>
                    {participant.name}
                    {participant.userId != null && submittedFeedbacks.has(participant.userId)
                      ? ' (제출완료)'
                      : ''}
                  </option>
                ))}
              </select>
            </div>

            <StudyEvaluationRadar scores={scores} averageScore={averageScore} />

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
                      <ScoreField
                        category={category}
                        score={scores[category]}
                        onChange={handleScoreChange}
                      />
                      <span className="w-7 text-caption tabular-nums text-text-secondary">
                        /10
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

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

            {submitError ? (
              <p className="text-body-2 text-status-error" role="alert">{submitError}</p>
            ) : null}

            <Button
              type="button"
              className="w-full"
              disabled={!isEvaluationComplete || submitting}
              onClick={() => void handleSubmitEvaluation()}
            >
              {isEvaluationComplete ? (
                <CheckCircle2 className="size-5" aria-hidden="true" />
              ) : null}
              {submitting
                ? isEditingEvaluation
                  ? '수정 중…'
                  : '제출 중…'
                : isEvaluationComplete
                  ? isEditingEvaluation
                    ? '평가 수정'
                    : '평가 제출'
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

          <div className="mt-4">
            {documentLoading ? (
              <p className="text-body-2 text-text-secondary">불러오는 중...</p>
            ) : documentError ? (
              <p className="text-body-2 text-status-error" role="alert">
                {documentError}
              </p>
            ) : openDocumentType === 'resume' ? (
              resumeData ? <ResumeDocumentView resume={resumeData} /> : null
            ) : coverLetterData ? (
              <CoverLetterDocumentView coverLetter={coverLetterData} />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
