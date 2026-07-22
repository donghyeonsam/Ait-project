import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { PageLayout } from '@/components/layout/PageLayout'
import { InterviewStage } from '@/components/interview/InterviewStage'
import { useMediaDevices } from '@/components/interview/useMediaDevices'
import type { Difficulty, InterviewGoalType } from '@/mocks/interview'
import type { InterviewRecord, InterviewType } from '@/mocks/dashboard'

const TOTAL_MOCK_QUESTIONS = 8

interface InterviewSessionNavState {
  interviewType: InterviewGoalType | null
  position: string
  difficulty: Difficulty | null
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

export function InterviewSessionPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const navState = location.state as InterviewSessionNavState | null

  const { stream, requestAccess } = useMediaDevices()
  const [questionIndex, setQuestionIndex] = useState(0)
  const [micMuted, setMicMuted] = useState(false)
  const [micGain, setMicGain] = useState(60)
  const [speakerMuted, setSpeakerMuted] = useState(false)
  const [speakerVolume, setSpeakerVolume] = useState(60)
  const sessionStartRef = useRef(0)

  const isLastQuestion = questionIndex === TOTAL_MOCK_QUESTIONS - 1

  useEffect(() => {
    sessionStartRef.current = Date.now()
  }, [])

  useEffect(() => {
    void requestAccess()
  }, [requestAccess])

  useEffect(() => {
    stream?.getAudioTracks().forEach((track) => {
      track.enabled = !micMuted
    })
  }, [stream, micMuted])

  const handleViewResults = useCallback(() => {
    const interviewType = navState?.interviewType ?? '종합'
    const difficulty = navState?.difficulty ?? '보통'
    const position = navState?.position?.trim()
    const title = position ? `${position} ${interviewType} 면접` : `${interviewType} 면접`

    const newAnalyzingRecord: InterviewRecord = {
      id: Date.now(),
      date: formatDate(new Date()),
      type: interviewTypeMap[interviewType],
      field: 'FE',
      difficulty: difficultyMap[difficulty],
      title,
      score: 0,
      delta: 0,
      duration: formatDuration(Date.now() - sessionStartRef.current),
      status: 'analyzing',
    }

    navigate('/dashboard/interviews', { state: { newAnalyzingRecord } })
  }, [navState, navigate])

  const handleCompleteAnswer = useCallback(() => {
    setQuestionIndex((index) => Math.min(index + 1, TOTAL_MOCK_QUESTIONS - 1))
  }, [])

  const handlePrimaryAction = useCallback(() => {
    if (isLastQuestion) {
      handleViewResults()
      return
    }
    handleCompleteAnswer()
  }, [handleCompleteAnswer, handleViewResults, isLastQuestion])

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
          질문 {questionIndex + 1} / {TOTAL_MOCK_QUESTIONS}
        </p>

        <div className="mt-4">
          <InterviewStage
            stream={stream}
            questionIndex={questionIndex}
            isLastQuestion={isLastQuestion}
            onPrimaryAction={handlePrimaryAction}
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
      </section>
    </PageLayout>
  )
}
