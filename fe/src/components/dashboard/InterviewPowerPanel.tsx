import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Sprout, ThumbsUp, TrendingUp } from 'lucide-react'
import {
  getInterviewReportDetail,
  getInterviewReports,
} from '@/api/ai-interviews'
import { getPeerFeedbackList } from '@/api/peer-feedback'
import { Skeleton } from '@/components/ui/skeleton'
import { aitEmoticons } from '@/lib/emoticons'

const MASCOT_SLIDE_INTERVAL_MS = 6000
const COMMENT_ROTATE_INTERVAL_MS = 4000

// 100 EXP를 채우면 레벨업하는 단순한 누적 방식. 레벨 환산 없이 그냥 총점을 보여주면
// 숫자가 커지는 느낌이 약해서, 원점수 총합을 그대로 EXP로 쓰고 레벨만 100 단위로 끊는다.
const EXP_PER_LEVEL = 100

const RING_RADIUS = 42
const RING_STROKE_WIDTH = 10
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

// record.date는 'YYYY. MM. DD' 형식 문자열만 남아 있어(원본 ISO 시각은 버려짐),
// 최근 7일 여부를 가리려면 직접 파싱해야 한다. new Date(문자열)은 브라우저마다 다르게 해석될 수 있어 피한다.
function parseRecordDate(value: string): Date | null {
  const match = /^(\d{4})\.\s*(\d{2})\.\s*(\d{2})$/.exec(value.trim())
  if (!match) return null
  const [, year, month, day] = match
  return new Date(Number(year), Number(month) - 1, Number(day))
}

// 응원하는 느낌의 긍정적인 표정만 골라 순서대로 돌아가며 보여준다.
const mascotIds = ['01_인사', '02_웃음', '10_축하', '12_의지']
const mascots = mascotIds
  .map((id) => aitEmoticons.find((emoticon) => emoticon.id === id))
  .filter((emoticon): emoticon is NonNullable<typeof emoticon> => emoticon !== undefined)

type LoadState = 'loading' | 'loaded' | 'error'

type ReportSnapshotState =
  | { status: 'loading' }
  | { status: 'empty' }
  | { status: 'error' }
  | { status: 'loaded'; strengths: string[]; weaknesses: string[] }

// 텍스트 하나를 각기둥이 회전하듯 rotateX로 뒤집으며 다음 텍스트로 넘긴다.
function RotatingComment({
  text,
  rotateKey,
  shouldReduceMotion,
}: {
  text: string
  rotateKey: number
  shouldReduceMotion: boolean | null
}) {
  return (
    <div className="min-w-0 flex-1" style={{ perspective: 800 }}>
      <AnimatePresence mode="wait">
        <motion.p
          key={rotateKey}
          initial={shouldReduceMotion ? false : { rotateX: -90, opacity: 0 }}
          animate={{ rotateX: 0, opacity: 1 }}
          exit={shouldReduceMotion ? { opacity: 0 } : { rotateX: 90, opacity: 0 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.4, ease: 'easeInOut' }}
          className="min-w-0 text-body-2"
        >
          {text}
        </motion.p>
      </AnimatePresence>
    </div>
  )
}

// 대시보드 왼쪽 상단. 지금까지 받은 모든 AI 면접 점수와 스터디 상호평가 점수를 EXP로 함께
// 누적해 100마다 레벨업하는 도넛형 게이지로 보여주고, 옆에는 가장 최근 리포트의 잘한 점·개선점을
// 한 줄씩 보여준다. 마스코트 표정은 순서대로 자동 전환된다(모션 최소화 선호 시 정지).
export function InterviewPowerPanel() {
  const shouldReduceMotion = useReducedMotion()
  const [mascotIndex, setMascotIndex] = useState(0)
  const [totalExp, setTotalExp] = useState(0)
  const [weeklyGain, setWeeklyGain] = useState(0)
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [reportSnapshot, setReportSnapshot] = useState<ReportSnapshotState>({
    status: 'loading',
  })
  const [commentIndex, setCommentIndex] = useState(0)
  const [isCommentPaused, setCommentPaused] = useState(false)
  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    // 스터디 상호평가 조회가 실패해도 AI 면접 EXP만으로는 패널을 계속 보여줄 수 있어 별도로 감싸 무시한다.
    Promise.all([getInterviewReports(), getPeerFeedbackList().catch(() => [])])
      .then(([records, peerFeedbacks]) => {
        if (!mountedRef.current) return
        const completed = records.filter((record) => record.status !== 'analyzing')

        const interviewSum = completed.reduce((total, record) => total + record.score, 0)
        const studySum = peerFeedbacks.reduce((total, item) => total + item.scoreAvg, 0)
        setTotalExp(interviewSum + studySum)

        // "이번 주 모의면접" 지표와 같은 기준(최근 7일, 오늘 포함)으로 이번 주에 얻은 EXP만 따로 더한다.
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setHours(0, 0, 0, 0)
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
        const interviewGain = completed
          .filter((record) => {
            const date = parseRecordDate(record.date)
            return date !== null && date.getTime() >= sevenDaysAgo.getTime()
          })
          .reduce((total, record) => total + record.score, 0)
        const studyGain = peerFeedbacks
          .filter((item) => new Date(item.createdAt).getTime() >= sevenDaysAgo.getTime())
          .reduce((total, item) => total + item.scoreAvg, 0)
        setWeeklyGain(interviewGain + studyGain)

        setLoadState('loaded')

        const latest = completed[0]
        if (!latest) {
          setReportSnapshot({ status: 'empty' })
          return
        }
        getInterviewReportDetail(latest.id)
          .then((detail) => {
            if (!mountedRef.current) return
            setReportSnapshot({
              status: 'loaded',
              strengths: detail.content.strengths,
              weaknesses: detail.content.weaknesses,
            })
          })
          .catch(() => {
            if (!mountedRef.current) return
            setReportSnapshot({ status: 'error' })
          })
      })
      .catch(() => {
        if (!mountedRef.current) return
        setLoadState('error')
        setReportSnapshot({ status: 'error' })
      })
  }, [])

  useEffect(() => {
    if (shouldReduceMotion || mascots.length <= 1) return
    const timer = window.setInterval(() => {
      setMascotIndex((current) => (current + 1) % mascots.length)
    }, MASCOT_SLIDE_INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [shouldReduceMotion])

  // 마우스를 올리거나 포커스가 들어오면(코멘트를 읽는 중이면) 회전을 멈춘다.
  useEffect(() => {
    if (shouldReduceMotion || isCommentPaused || reportSnapshot.status !== 'loaded') return
    const maxLength = Math.max(
      reportSnapshot.strengths.length,
      reportSnapshot.weaknesses.length,
      1,
    )
    if (maxLength <= 1) return
    const timer = window.setInterval(() => {
      setCommentIndex((current) => (current + 1) % maxLength)
    }, COMMENT_ROTATE_INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [shouldReduceMotion, isCommentPaused, reportSnapshot])

  const mascot = mascots[mascotIndex]
  const level = Math.floor(totalExp / EXP_PER_LEVEL) + 1
  const expInLevel = totalExp % EXP_PER_LEVEL
  const ringOffset = RING_CIRCUMFERENCE * (1 - expInLevel / EXP_PER_LEVEL)

  return (
    <div className="flex flex-col gap-6 rounded-ait-m bg-status-neutral-surface px-6 py-6 lg:h-full lg:flex-row lg:items-center lg:gap-8 lg:px-8 lg:py-0">
      {/* 마스코트 + 경험치 도넛을 왼쪽으로 묶어, 가운데 남는 공간에 최근 리포트 요약이 들어간다.
          너비가 좁아지면(태블릿 이하) 고정폭 요소들이 오른쪽 코멘트 영역을 끝없이 밀어내
          한 글자씩 세로로 줄바꿈되므로, lg 미만에서는 세로로 쌓는다. */}
      <div className="flex flex-wrap items-center justify-center gap-6 lg:shrink-0 lg:flex-nowrap lg:justify-start">
        {/* 스택된 카드 컬럼 높이에 맞춘 고정 크기. flex-stretch 높이에 상대적으로 맞추면
            (h-3/5 등) 리렌더링 시점에 따라 조상 높이 계산이 흔들려 구조가 깨질 수 있어
            고정값으로 둔다. */}
        <div className="relative size-64 shrink-0 overflow-hidden">
          {mascot ? (
            // mode="wait"를 쓰면 이전 이미지가 완전히 사라진 뒤에야 다음 이미지가 마운트돼
            // 그 사이 빈 화면이 보인다. absolute로 겹쳐 두고 동시에 교차 페이드시켜 빈 구간을 없앤다.
            <AnimatePresence>
              <motion.img
                key={mascot.id}
                src={mascot.src}
                alt={`${mascot.label} 표정의 Ait 마스코트`}
                initial={shouldReduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: shouldReduceMotion ? 0 : 0.5 }}
                className="absolute inset-0 size-full object-contain"
              />
            </AnimatePresence>
          ) : null}
        </div>

        <div className="w-56 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-body-2 font-semibold text-text-secondary">
              <Sprout className="size-4 text-status-achievement" aria-hidden="true" />
              나의 면접레벨
            </span>
            <span className="rounded-ait-pill bg-status-achievement-surface px-2.5 py-1 text-caption font-bold text-status-achievement">
              Lv. {level}
            </span>
          </div>

          {loadState === 'loading' ? (
            <div className="mx-auto mt-4 flex size-44 items-center justify-center">
              <Skeleton className="size-full rounded-ait-pill" />
            </div>
          ) : loadState === 'error' ? (
            <p className="mt-4 text-center text-body-2 text-text-secondary">
              불러오지 못했습니다.
            </p>
          ) : (
            <div
              className="relative mx-auto mt-4 size-44"
              role="img"
              aria-label={`레벨 ${level}, 경험치 ${expInLevel.toFixed(1)} / ${EXP_PER_LEVEL}`}
            >
              <svg viewBox="0 0 100 100" className="size-full -rotate-90">
                <circle
                  cx="50"
                  cy="50"
                  r={RING_RADIUS}
                  fill="none"
                  stroke="var(--color-border-default)"
                  strokeWidth={RING_STROKE_WIDTH}
                />
                <motion.circle
                  cx="50"
                  cy="50"
                  r={RING_RADIUS}
                  fill="none"
                  stroke="var(--color-status-achievement)"
                  strokeWidth={RING_STROKE_WIDTH}
                  strokeLinecap="round"
                  strokeDasharray={RING_CIRCUMFERENCE}
                  initial={shouldReduceMotion ? false : { strokeDashoffset: RING_CIRCUMFERENCE }}
                  animate={{ strokeDashoffset: ringOffset }}
                  transition={{ duration: shouldReduceMotion ? 0 : 1, ease: 'easeOut' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="flex items-baseline gap-1">
                  <strong className="tabular-nums text-h1 text-status-achievement">
                    {expInLevel.toFixed(1)}
                  </strong>
                  <span className="text-caption text-text-secondary">/{EXP_PER_LEVEL}</span>
                </p>
                {weeklyGain > 0 ? (
                  <p className="mt-1 tabular-nums text-caption text-stat-up">
                    <span aria-hidden="true">▲</span> 이번 주 +{weeklyGain.toFixed(1)}
                  </p>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>

      <div
        className="flex min-w-0 flex-1 flex-col justify-center gap-3"
        onMouseEnter={() => setCommentPaused(true)}
        onMouseLeave={() => setCommentPaused(false)}
        onFocus={() => setCommentPaused(true)}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setCommentPaused(false)
          }
        }}
      >
        <p className="text-body-2 font-semibold text-text-secondary">최근 코멘트</p>
        {reportSnapshot.status === 'loading' ? (
          <>
            <Skeleton className="h-20 w-full rounded-ait-s" />
            <Skeleton className="h-20 w-full rounded-ait-s" />
          </>
        ) : reportSnapshot.status === 'empty' ? (
          <p className="text-body-2 text-text-secondary">
            AI 모의면접을 완료하면 최근 리포트 요약이 여기 표시돼요.
          </p>
        ) : reportSnapshot.status === 'error' ? (
          <p className="text-body-2 text-text-secondary">최근 리포트를 불러오지 못했습니다.</p>
        ) : (
          <>
            <div className="flex min-w-0 items-start gap-3 rounded-ait-s border border-status-success bg-feedback-success px-4 py-6">
              <ThumbsUp className="mt-0.5 size-5 shrink-0 text-status-success" aria-hidden="true" />
              <RotatingComment
                text={
                  reportSnapshot.strengths[commentIndex % reportSnapshot.strengths.length] ??
                  '표시할 내용이 없습니다.'
                }
                rotateKey={commentIndex % Math.max(reportSnapshot.strengths.length, 1)}
                shouldReduceMotion={shouldReduceMotion}
              />
            </div>
            <div className="flex min-w-0 items-start gap-3 rounded-ait-s border border-feedback-improve-border bg-feedback-improve px-4 py-6">
              <TrendingUp className="mt-0.5 size-5 shrink-0 text-feedback-improve-text" aria-hidden="true" />
              <RotatingComment
                text={
                  reportSnapshot.weaknesses[commentIndex % reportSnapshot.weaknesses.length] ??
                  '표시할 내용이 없습니다.'
                }
                rotateKey={commentIndex % Math.max(reportSnapshot.weaknesses.length, 1)}
                shouldReduceMotion={shouldReduceMotion}
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
