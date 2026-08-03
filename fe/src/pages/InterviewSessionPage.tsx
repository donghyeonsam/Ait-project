import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertCircle } from 'lucide-react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import {
  completeInterview,
  generateInterviewQuestions,
  submitInterviewAnswer,
  type GeneratedInterviewQuestion,
  type InterviewQuestionGenerationResponse,
} from '@/api/ai-interviews'
import { toErrorMessage } from '@/api/http'
import { PageLayout } from '@/components/layout/PageLayout'
import { ScreenFadeCurtain } from '@/components/common/ScreenFadeCurtain'
import { QuestionGenerationStage } from '@/components/interview/QuestionGenerationStage'
import { SessionTheater } from '@/components/interview/SessionTheater'
import { useAnswerCountdown } from '@/components/interview/useAnswerCountdown'
import { useAutoRecordingAfterSpeech } from '@/components/interview/useAutoRecordingAfterSpeech'
import { useMediaDevices } from '@/components/interview/useMediaDevices'
import { useNonVerbalCapture } from '@/components/interview/useNonVerbalCapture'
import { useQuestionSpeech } from '@/components/interview/useQuestionSpeech'
import { useVoiceAnswer } from '@/components/interview/useVoiceAnswer'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  clearInterviewQuestionCache,
  getCachedInterviewQuestions,
} from '@/lib/interview-question-cache'
import {
  isInterviewSessionConfiguration,
  type InterviewSessionNavigationState,
} from '@/lib/interview-session'
import type { Difficulty, InterviewGoalType } from '@/mocks/interview'
import type { InterviewRecord, InterviewType, JobType } from '@/types/dashboard'

interface SubmittedVoiceAnswer {
  question: GeneratedInterviewQuestion
  transcript: string
  audioBlob: Blob | null
}

const interviewTypeMap: Record<InterviewGoalType, InterviewType> = {
  '직무 면접': '직무',
  'CS 면접': 'CS',
  '기술 면접': '기술',
  '포폴 면접': '포폴',
  종합: '종합',
}

const difficultyMap: Record<Difficulty, InterviewRecord['difficulty']> = {
  쉬움: '쉬움',
  보통: '보통',
  어려움: '어려움',
}

const ANSWER_DURATION_SECONDS = 90

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }
  return (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT' ||
    target.tagName === 'BUTTON' ||
    target.isContentEditable
  )
}

function formatDuration(elapsedMs: number) {
  const totalSeconds = Math.max(0, Math.round(elapsedMs / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}분 ${String(seconds).padStart(2, '0')}초`
}

function formatDate(date: Date) {
  return `${date.getFullYear()}. ${String(date.getMonth() + 1).padStart(2, '0')}. ${String(date.getDate()).padStart(2, '0')}`
}

function toJobType(position: string): JobType {
  const normalized = position.toLowerCase()
  if (normalized.includes('백엔드') || normalized.includes('backend')) return 'BE'
  if (normalized.includes('ai') || normalized.includes('인공지능')) return 'AI'
  if (normalized.includes('데이터') || normalized.includes('data')) return 'Data'
  if (normalized.includes('인프라') || normalized.includes('infra')) return 'Infra'
  if (normalized.includes('보안') || normalized.includes('security')) return '보안'
  if (normalized.includes('qa') || normalized.includes('테스트')) return 'QA'
  if (normalized.includes('모바일') || normalized.includes('mobile')) return 'Mobile'
  if (normalized.includes('pm') || normalized.includes('po') || normalized.includes('기획')) return 'PM/PO'
  return 'FE'
}

export function InterviewSessionPage() {
  const location = useLocation()
  const navState = location.state as Partial<InterviewSessionNavigationState> | null
  const config = navState?.interviewConfig

  if (!isInterviewSessionConfiguration(config)) {
    return <Navigate to="/interviews" replace />
  }

  return <InterviewSessionContent config={config} />
}

interface InterviewSessionContentProps {
  config: NonNullable<InterviewSessionNavigationState['interviewConfig']>
}

interface QuestionRequest {
  attempt: number
  promise: ReturnType<typeof generateInterviewQuestions>
}

// 세션 진입 시 실제 AI 질문을 준비하고 로딩·오류 상태를 관리한다.
function InterviewSessionContent({
  config,
}: InterviewSessionContentProps) {
  const navigate = useNavigate()
  const questionRequestRef = useRef<QuestionRequest | null>(null)
  const [generatedSession, setGeneratedSession] =
    useState<InterviewQuestionGenerationResponse | null>(null)
  const [stageExited, setStageExited] = useState(false)
  const [questionError, setQuestionError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true

    if (questionRequestRef.current?.attempt !== attempt) {
      const cachedPromise = attempt === 0 ? getCachedInterviewQuestions(config.input) : null
      questionRequestRef.current = {
        attempt,
        promise: cachedPromise ?? generateInterviewQuestions({
          input: config.input,
        }),
      }
    }

    questionRequestRef.current.promise
      .then((response) => {
        if (!active) return
        const generatedQuestions = response.questions
          .filter((item) => item.question.trim())
          .map((item) => ({ ...item, depth: item.depth ?? 0 }))
          .sort((a, b) => a.order - b.order)

        if (generatedQuestions.length === 0) {
          setQuestionError(
            'AI가 질문을 생성하지 못했습니다. 잠시 후 다시 시도해주세요.',
          )
          return
        }
        setGeneratedSession({
          ...response,
          questions: generatedQuestions,
        })
      })
      .catch((error: unknown) => {
        if (active) setQuestionError(toErrorMessage(error))
      })

    return () => {
      active = false
    }
  }, [attempt, config.input])

  if (generatedSession && stageExited) {
    return (
      <>
        <ActiveInterviewSession
          config={config}
          aiInterviewId={generatedSession.aiInterviewId}
          questions={generatedSession.questions}
        />
        {/* 검게 덮인 상태로 시작해 장막을 걷으며 면접 화면을 드러낸다. */}
        <ScreenFadeCurtain covered={false} initialCovered />
      </>
    )
  }

  const handleRetry = () => {
    clearInterviewQuestionCache()
    questionRequestRef.current = null
    setQuestionError(null)
    setAttempt((value) => value + 1)
  }

  return (
    <PageLayout contentClassName="max-w-none px-0" hideFooter>
      <section
        className="question-generation-backdrop flex flex-col"
        aria-labelledby="question-generation-title"
      >
        {questionError ? (
          <div className="flex flex-1 items-center justify-center px-8 py-12">
            <div className="w-full max-w-2xl rounded-ait-l border border-border-default bg-surface-default p-8 text-center shadow-elevation-3">
              <AlertCircle
                className="mx-auto size-12 text-status-error"
                aria-hidden="true"
              />
              <h1
                id="question-generation-title"
                className="mt-4 text-h2 text-text-primary"
              >
                질문을 준비하지 못했어요
              </h1>
              <p className="mt-2 text-body-2 text-text-secondary" role="alert">
                {questionError}
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Button type="button" onClick={handleRetry}>
                  다시 시도
                </Button>
                <Button
                  type="button"
                  variant="text"
                  onClick={() => navigate('/interviews')}
                >
                  면접 설정으로 돌아가기
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <QuestionGenerationStage
            input={config.input}
            isLeaving={Boolean(generatedSession)}
          />
        )}
      </section>

      {/* 진입 시 검은 화면에서 장막을 걷고, 질문이 준비되면 다시 덮은 뒤 면접 화면으로 전환한다. */}
      <ScreenFadeCurtain
        covered={Boolean(generatedSession)}
        initialCovered
        onCoverComplete={() => setStageExited(true)}
      />
    </PageLayout>
  )
}

interface ActiveInterviewSessionProps {
  config: NonNullable<InterviewSessionNavigationState['interviewConfig']>
  aiInterviewId: number | null
  questions: GeneratedInterviewQuestion[]
}

// 생성된 질문을 순서대로 제시하고 사용자의 음성 답변을 진행한다.
function ActiveInterviewSession({
  config,
  aiInterviewId,
  questions,
}: ActiveInterviewSessionProps) {
  const navigate = useNavigate()
  const { input, devices } = config
  const { permission, stream, requestAccess } = useMediaDevices()
  // 답변 분석 응답으로 꼬리질문이 오면 목록 중간에 끼워 넣어야 해서 질문을 상태로 관리한다.
  const [sessionQuestions, setSessionQuestions] = useState(questions)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false)
  const [endDialogOpen, setEndDialogOpen] = useState(false)
  const [micMuted, setMicMuted] = useState(false)
  const [micGain, setMicGain] = useState(devices.micGain)
  const [speakerMuted, setSpeakerMuted] = useState(false)
  const [speakerVolume, setSpeakerVolume] = useState(devices.speakerVolume)
  const sessionStartRef = useRef(0)
  const submittedAnswersRef = useRef<SubmittedVoiceAnswer[]>([])
  const submitAfterRecordingRef = useRef(false)
  const question = sessionQuestions[questionIndex]
  const voiceAnswer = useVoiceAnswer(stream)
  const nonVerbalCapture = useNonVerbalCapture(stream, aiInterviewId)
  const questionKey = `${questionIndex}:${question.order}:${question.question}`
  const answerSecondsRemaining = useAnswerCountdown({
    activeKey:
      voiceAnswer.status === 'recording' ? questionKey : null,
    durationSeconds: ANSWER_DURATION_SECONDS,
    onExpire: voiceAnswer.stopRecording,
  })
  const questionSpeech = useQuestionSpeech({
    text: question.question,
    speechKey: questionKey,
    volume: speakerVolume,
    muted: speakerMuted,
    enabled: Boolean(stream),
  })
  const resetAutoRecording = useAutoRecordingAfterSpeech({
    questionKey,
    completedSpeechKey: questionSpeech.completedSpeechKey,
    enabled: Boolean(stream) && !micMuted,
    answerStatus: voiceAnswer.status,
    startRecording: voiceAnswer.startRecording,
  })

  const isLastQuestion = questionIndex === sessionQuestions.length - 1

  const voiceAnswerStatusForNonVerbal = voiceAnswer.status
  const nonVerbalCaptureStatus = nonVerbalCapture.status
  const startNonVerbalCapture = nonVerbalCapture.startCapture
  const stopNonVerbalCapture = nonVerbalCapture.stopCapture
  // 답변 녹음 구간과 표정·시선 캡처 구간을 맞춘다: 녹음이 시작되면 캡처를 시작하고,
  // 녹음이 끝나면 곧바로 BE로 전송한다.
  useEffect(() => {
    if (voiceAnswerStatusForNonVerbal === 'recording') {
      startNonVerbalCapture()
    } else if (nonVerbalCaptureStatus === 'capturing') {
      stopNonVerbalCapture()
    }
  }, [
    voiceAnswerStatusForNonVerbal,
    nonVerbalCaptureStatus,
    startNonVerbalCapture,
    stopNonVerbalCapture,
  ])

  useEffect(() => {
    sessionStartRef.current = Date.now()
  }, [])

  useEffect(() => {
    void requestAccess(
      devices.cameraDeviceId ?? undefined,
      devices.micDeviceId ?? undefined,
    )
  }, [devices.cameraDeviceId, devices.micDeviceId, requestAccess])

  useEffect(() => {
    stream?.getAudioTracks().forEach((track) => {
      track.enabled = !micMuted
    })
  }, [stream, micMuted])

  const handleViewResults = useCallback(() => {
    // 종료를 알려야 서버가 리포트 생성을 시작한다. 실패해도 결과 화면 이동은 막지 않는다.
    if (aiInterviewId !== null) {
      void completeInterview(aiInterviewId).catch(() => {})
    }

    const interviewType = input.interviewType
    const difficulty = input.difficulty
    const position = input.position ?? ''
    const title = position ? `${position} ${interviewType} 면접` : `${interviewType} 면접`

    const newAnalyzingRecord: InterviewRecord = {
      id: aiInterviewId ?? Date.now(),
      date: formatDate(new Date()),
      type: interviewTypeMap[interviewType],
      field: toJobType(position),
      difficulty: difficultyMap[difficulty],
      title,
      score: 0,
      delta: 0,
      duration: formatDuration(Date.now() - sessionStartRef.current),
      status: 'analyzing',
    }

    navigate('/dashboard/interviews', { state: { newAnalyzingRecord } })
  }, [aiInterviewId, input, navigate])

  const handleSubmitAnswer = useCallback(async () => {
    const transcript = voiceAnswer.transcript.trim()
    if (!transcript || isSubmittingAnswer) return

    const audioBlob = voiceAnswer.audioBlob
    submittedAnswersRef.current.push({
      question,
      transcript,
      audioBlob,
    })

    // BE snake_case 역직렬화 버그로 aiInterviewId가 null이거나, 녹음 없이 답변만 있으면
    // 저장을 건너뛴다. 저장 실패도 면접 진행을 막지 않도록 꼬리질문 없이 다음으로 넘어간다.
    let followUpQuestion: GeneratedInterviewQuestion | null = null
    if (aiInterviewId !== null && audioBlob) {
      setIsSubmittingAnswer(true)
      try {
        const response = await submitInterviewAnswer({
          aiInterviewId,
          input,
          question,
          answer: transcript,
          audioBlob,
        })
        followUpQuestion = response?.nextQuestion ?? null
      } catch {
        followUpQuestion = null
      } finally {
        setIsSubmittingAnswer(false)
      }
    }

    voiceAnswer.reset()
    nonVerbalCapture.reset()

    // 꼬리질문이 오면 현재 질문 바로 뒤에 끼워 넣고 곧바로 그 질문으로 이동한다.
    if (followUpQuestion) {
      const inserted = followUpQuestion
      const insertAt = questionIndex + 1
      setSessionQuestions((current) => [
        ...current.slice(0, insertAt),
        inserted,
        ...current.slice(insertAt),
      ])
      setQuestionIndex(insertAt)
      return
    }

    if (isLastQuestion) {
      handleViewResults()
      return
    }
    setQuestionIndex((index) =>
      Math.min(index + 1, sessionQuestions.length - 1),
    )
  }, [
    aiInterviewId,
    handleViewResults,
    input,
    isLastQuestion,
    isSubmittingAnswer,
    nonVerbalCapture,
    question,
    questionIndex,
    sessionQuestions.length,
    voiceAnswer,
  ])

  const handleFinishAnswer = useCallback(() => {
    if (voiceAnswer.status !== 'recording') return
    submitAfterRecordingRef.current = true
    voiceAnswer.stopRecording()
  }, [voiceAnswer])

  useEffect(() => {
    if (!submitAfterRecordingRef.current) return

    if (voiceAnswer.status === 'idle' || voiceAnswer.status === 'error') {
      submitAfterRecordingRef.current = false
      return
    }

    // 녹음 파일과 음성 변환 결과가 모두 준비된 뒤 제출해야 오디오 분석이 누락되지 않는다.
    if (voiceAnswer.status !== 'review' || !voiceAnswer.audioBlob) return

    if (!voiceAnswer.transcript.trim()) {
      submitAfterRecordingRef.current = false
      return
    }

    const submitTimer = window.setTimeout(() => {
      submitAfterRecordingRef.current = false
      void handleSubmitAnswer()
    }, 0)
    return () => window.clearTimeout(submitTimer)
  }, [
    handleSubmitAnswer,
    voiceAnswer.audioBlob,
    voiceAnswer.status,
    voiceAnswer.transcript,
  ])

  const primaryActionDisabled =
    isSubmittingAnswer ||
    voiceAnswer.status !== 'review' ||
    !voiceAnswer.transcript.trim()

  const handlePrimaryAction = useCallback(() => {
    if (primaryActionDisabled) return
    if (voiceAnswer.status === 'review') {
      void handleSubmitAnswer()
    }
  }, [handleSubmitAnswer, primaryActionDisabled, voiceAnswer])

  const primaryActionLabel = isSubmittingAnswer
    ? '답변 분석 중'
    : isLastQuestion
      ? '마지막 답변 제출'
      : '답변 제출'

  const replayQuestion = questionSpeech.replay
  const resetVoiceAnswer = voiceAnswer.reset
  const resetNonVerbalCapture = nonVerbalCapture.reset
  const voiceAnswerStatus = voiceAnswer.status
  const handleReplayQuestion = useCallback(() => {
    if (voiceAnswerStatus === 'error') {
      resetAutoRecording()
      resetVoiceAnswer()
      resetNonVerbalCapture()
    }
    replayQuestion()
  }, [
    replayQuestion,
    resetAutoRecording,
    resetNonVerbalCapture,
    resetVoiceAnswer,
    voiceAnswerStatus,
  ])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        endDialogOpen ||
        event.code !== 'Space' ||
        voiceAnswer.status !== 'review' ||
        isTypingTarget(event.target)
      ) {
        return
      }
      event.preventDefault()
      handlePrimaryAction()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [endDialogOpen, handlePrimaryAction, voiceAnswer.status])

  // 답변을 하나라도 제출했으면 분석 대기 기록으로 이동하고, 아니면 면접 설정으로 돌아간다.
  const handleConfirmEnd = () => {
    setEndDialogOpen(false)
    if (submittedAnswersRef.current.length > 0) {
      void handleViewResults()
      return
    }
    navigate('/interviews')
  }

  return (
    <>
      <SessionTheater
        stream={stream}
        questionIndex={questionIndex}
        totalQuestions={sessionQuestions.length}
        question={question.question}
        answerStatus={voiceAnswer.status}
        interviewStyle={input.style}
        isSubmittingAnswer={isSubmittingAnswer}
        isLastQuestion={isLastQuestion}
        answerDurationSeconds={ANSWER_DURATION_SECONDS}
        answerSecondsRemaining={answerSecondsRemaining}
        transcript={voiceAnswer.transcript}
        onChangeTranscript={voiceAnswer.setTranscript}
        voiceError={voiceAnswer.error}
        speechError={questionSpeech.error}
        mediaPermission={permission}
        onRetryMediaAccess={() => {
          void requestAccess(
            devices.cameraDeviceId ?? undefined,
            devices.micDeviceId ?? undefined,
          )
        }}
        primaryActionLabel={primaryActionLabel}
        primaryActionDisabled={primaryActionDisabled}
        onPrimaryAction={handlePrimaryAction}
        onFinishAnswer={handleFinishAnswer}
        isAiSpeaking={questionSpeech.isSpeaking}
        onReplayQuestion={handleReplayQuestion}
        replayDisabled={
          !stream ||
          questionSpeech.isSpeaking ||
          voiceAnswer.status === 'recording' ||
          voiceAnswer.status === 'processing'
        }
        onRequestEnd={() => setEndDialogOpen(true)}
        micMuted={micMuted}
        micGain={micGain}
        onToggleMicMuted={() => setMicMuted((value) => !value)}
        onChangeMicGain={setMicGain}
        speakerMuted={speakerMuted}
        speakerVolume={speakerVolume}
        onToggleSpeakerMuted={() => setSpeakerMuted((value) => !value)}
        onChangeSpeakerVolume={setSpeakerVolume}
      />

      <Dialog open={endDialogOpen} onOpenChange={setEndDialogOpen}>
        <DialogContent
          className="w-[min(26rem,calc(100vw-2rem))] p-6"
          showCloseButton={false}
        >
          <DialogHeader>
            <DialogTitle>면접을 종료할까요?</DialogTitle>
            <DialogDescription>
              지금 종료하면 아직 답변하지 않은 질문은 기록되지 않습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="text"
              onClick={() => setEndDialogOpen(false)}
            >
              계속 진행
            </Button>
            <Button type="button" variant="destructive" onClick={handleConfirmEnd}>
              면접 종료
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
