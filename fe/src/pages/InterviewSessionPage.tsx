import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertCircle, LoaderCircle } from 'lucide-react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import {
  generateInterviewQuestions,
  type GeneratedInterviewQuestion,
  type InterviewQuestionGenerationResponse,
} from '@/api/ai-interviews'
import { toErrorMessage } from '@/api/http'
import { PageLayout } from '@/components/layout/PageLayout'
import { InterviewStage } from '@/components/interview/InterviewStage'
import { VoiceAnswerPanel } from '@/components/interview/VoiceAnswerPanel'
import { useMediaDevices } from '@/components/interview/useMediaDevices'
import { useQuestionSpeech } from '@/components/interview/useQuestionSpeech'
import { useVoiceAnswer } from '@/components/interview/useVoiceAnswer'
import { Button } from '@/components/ui/button'
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

  if (generatedSession) {
    return (
      <ActiveInterviewSession
        config={config}
        aiInterviewId={generatedSession.aiInterviewId}
        questions={generatedSession.questions}
      />
    )
  }

  const handleRetry = () => {
    clearInterviewQuestionCache()
    questionRequestRef.current = null
    setQuestionError(null)
    setAttempt((value) => value + 1)
  }

  return (
    <PageLayout contentClassName="max-w-content">
      <section
        className="flex min-h-[60vh] items-center justify-center py-12"
        aria-labelledby="question-generation-title"
      >
        <div className="w-full max-w-2xl rounded-ait-l border border-border-default bg-surface-default p-8 text-center shadow-elevation-1">
          {questionError ? (
            <>
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
            </>
          ) : (
            <>
              <LoaderCircle
                className="mx-auto size-12 animate-spin text-action-primary"
                aria-hidden="true"
              />
              <h1
                id="question-generation-title"
                className="mt-4 text-h2 text-text-primary"
              >
                AI가 맞춤 질문을 만들고 있어요
              </h1>
              <p
                className="mt-2 text-body-2 text-text-secondary"
                role="status"
                aria-live="polite"
              >
                선택한 면접 조건과 문서를 바탕으로 질문을 구성하고 있습니다.
              </p>
            </>
          )}
        </div>
      </section>
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
  const [questionIndex, setQuestionIndex] = useState(0)
  const [micMuted, setMicMuted] = useState(false)
  const [micGain, setMicGain] = useState(devices.micGain)
  const [speakerMuted, setSpeakerMuted] = useState(false)
  const [speakerVolume, setSpeakerVolume] = useState(devices.speakerVolume)
  const sessionStartRef = useRef(0)
  const submittedAnswersRef = useRef<SubmittedVoiceAnswer[]>([])
  const question = questions[questionIndex]
  const voiceAnswer = useVoiceAnswer(stream)
  const questionSpeech = useQuestionSpeech({
    text: question.question,
    volume: speakerVolume,
    muted: speakerMuted,
    enabled: Boolean(stream),
  })

  const isLastQuestion = questionIndex === questions.length - 1

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

  const handleSubmitAnswer = useCallback(() => {
    const transcript = voiceAnswer.transcript.trim()
    if (!transcript) return

    submittedAnswersRef.current.push({
      question,
      transcript,
      audioBlob: voiceAnswer.audioBlob,
    })
    // TODO: BE 답변 저장 API가 제공되면 녹음 파일 업로드와 /followup 호출을 이 지점에 연결한다.
    voiceAnswer.reset()

    if (isLastQuestion) {
      handleViewResults()
      return
    }
    setQuestionIndex((index) =>
      Math.min(index + 1, questions.length - 1),
    )
  }, [handleViewResults, isLastQuestion, question, questions.length, voiceAnswer])

  const primaryActionDisabled =
    questionSpeech.isSpeaking ||
    !stream ||
    micMuted ||
    voiceAnswer.status === 'processing' ||
    (voiceAnswer.status === 'review' && !voiceAnswer.transcript.trim())

  const handlePrimaryAction = useCallback(() => {
    if (primaryActionDisabled) return

    if (voiceAnswer.status === 'recording') {
      voiceAnswer.stopRecording()
      return
    }
    if (voiceAnswer.status === 'review') {
      handleSubmitAnswer()
      return
    }
    if (
      voiceAnswer.status === 'idle' ||
      voiceAnswer.status === 'error'
    ) {
      voiceAnswer.startRecording()
    }
  }, [handleSubmitAnswer, primaryActionDisabled, voiceAnswer])

  const primaryActionLabel = voiceAnswer.status === 'recording'
    ? '녹음 완료'
    : voiceAnswer.status === 'processing'
      ? '음성 처리 중'
      : voiceAnswer.status === 'review'
        ? isLastQuestion
          ? '마지막 답변 제출'
          : '답변 제출'
        : '답변 녹음 시작'

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || isTypingTarget(event.target)) {
        return
      }
      event.preventDefault()
      handlePrimaryAction()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handlePrimaryAction])

  return (
    <PageLayout contentClassName="max-w-content">
      <section className="py-10" aria-labelledby="interview-session-title">
        <h1 id="interview-session-title" className="sr-only">AI 모의면접 진행</h1>
        <p className="text-body-2 font-medium text-text-secondary">
          질문 {questionIndex + 1} / {questions.length}
        </p>

        <div className="mt-4">
          <InterviewStage
            stream={stream}
            questionIndex={questionIndex}
            question={question.question}
            answerStatus={voiceAnswer.status}
            primaryActionLabel={primaryActionLabel}
            primaryActionDisabled={primaryActionDisabled}
            onPrimaryAction={handlePrimaryAction}
            isAiSpeaking={questionSpeech.isSpeaking}
            micMuted={micMuted}
            micGain={micGain}
            onToggleMicMuted={() => setMicMuted((value) => !value)}
            onChangeMicGain={setMicGain}
            speakerMuted={speakerMuted}
            speakerVolume={speakerVolume}
            onToggleSpeakerMuted={() => setSpeakerMuted((value) => !value)}
            onChangeSpeakerVolume={setSpeakerVolume}
          />
        </div>

        <VoiceAnswerPanel
          status={voiceAnswer.status}
          transcript={voiceAnswer.transcript}
          audioBlob={voiceAnswer.audioBlob}
          error={voiceAnswer.error}
          speechError={questionSpeech.error}
          mediaPermission={permission}
          onChangeTranscript={voiceAnswer.setTranscript}
          onReplayQuestion={questionSpeech.replay}
          onRetryTranscription={voiceAnswer.retryTranscription}
          onRetryMediaAccess={() => {
            void requestAccess(
              devices.cameraDeviceId ?? undefined,
              devices.micDeviceId ?? undefined,
            )
          }}
          replayDisabled={
            !stream ||
            questionSpeech.isSpeaking ||
            voiceAnswer.status === 'recording' ||
            voiceAnswer.status === 'processing'
          }
        />
      </section>
    </PageLayout>
  )
}
