import { useCallback, useEffect, useRef, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { PageLayout } from '@/components/layout/PageLayout'
import { InterviewStage } from '@/components/interview/InterviewStage'
import { VoiceAnswerPanel } from '@/components/interview/VoiceAnswerPanel'
import { useMediaDevices } from '@/components/interview/useMediaDevices'
import { useQuestionSpeech } from '@/components/interview/useQuestionSpeech'
import { useVoiceAnswer } from '@/components/interview/useVoiceAnswer'
import {
  isInterviewSessionConfiguration,
  type InterviewSessionNavigationState,
} from '@/lib/interview-session'
import type { Difficulty, InterviewGoalType } from '@/mocks/interview'
import {
  mockInterviewQuestions,
  type MockInterviewQuestion,
} from '@/mocks/interview-session'
import type { InterviewRecord, InterviewType, JobType } from '@/types/dashboard'

interface SubmittedVoiceAnswer {
  question: MockInterviewQuestion
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

function InterviewSessionContent({ config }: InterviewSessionContentProps) {
  const navigate = useNavigate()
  const { input, devices } = config
  // TODO: 실제 면접 생성 API 계약이 확정되면 input을 질문 생성 요청에 전달한다.

  const { permission, stream, requestAccess } = useMediaDevices()
  const [questionIndex, setQuestionIndex] = useState(0)
  const [micMuted, setMicMuted] = useState(false)
  const [micGain, setMicGain] = useState(devices.micGain)
  const [speakerMuted, setSpeakerMuted] = useState(false)
  const [speakerVolume, setSpeakerVolume] = useState(devices.speakerVolume)
  const sessionStartRef = useRef(0)
  const submittedAnswersRef = useRef<SubmittedVoiceAnswer[]>([])
  const question = mockInterviewQuestions[questionIndex]
  const voiceAnswer = useVoiceAnswer(stream)
  const questionSpeech = useQuestionSpeech({
    text: question.question,
    volume: speakerVolume,
    muted: speakerMuted,
    enabled: Boolean(stream),
  })

  const isLastQuestion = questionIndex === mockInterviewQuestions.length - 1

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
      id: Date.now(),
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
  }, [input, navigate])

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
      Math.min(index + 1, mockInterviewQuestions.length - 1),
    )
  }, [handleViewResults, isLastQuestion, question, voiceAnswer])

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
          질문 {questionIndex + 1} / {mockInterviewQuestions.length}
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
          interimTranscript={voiceAnswer.interimTranscript}
          audioBlob={voiceAnswer.audioBlob}
          error={voiceAnswer.error}
          speechError={questionSpeech.error}
          recognitionSupported={voiceAnswer.recognitionSupported}
          mediaPermission={permission}
          onChangeTranscript={voiceAnswer.setTranscript}
          onReplayQuestion={questionSpeech.replay}
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
