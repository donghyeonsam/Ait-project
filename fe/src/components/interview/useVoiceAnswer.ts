import { useCallback, useEffect, useRef, useState } from 'react'

const AUDIO_MIME_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
] as const

const RECOGNITION_RESTART_DELAY_MS = 150
const RECOGNITION_STOP_FALLBACK_MS = 800

interface BrowserSpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

interface BrowserSpeechRecognitionResult {
  readonly isFinal: boolean
  readonly length: number
  readonly [index: number]: BrowserSpeechRecognitionAlternative
}

interface BrowserSpeechRecognitionResultList {
  readonly length: number
  readonly [index: number]: BrowserSpeechRecognitionResult
}

interface BrowserSpeechRecognitionEvent extends Event {
  readonly resultIndex: number
  readonly results: BrowserSpeechRecognitionResultList
}

interface BrowserSpeechRecognitionErrorEvent extends Event {
  readonly error: string
}

interface BrowserSpeechRecognition {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null
  onerror: ((event: BrowserSpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
  abort(): void
}

interface BrowserSpeechRecognitionConstructor {
  new (): BrowserSpeechRecognition
}

type SpeechRecognitionGlobal = typeof globalThis & {
  SpeechRecognition?: BrowserSpeechRecognitionConstructor
  webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor
}

export type VoiceAnswerStatus =
  | 'idle'
  | 'recording'
  | 'processing'
  | 'review'
  | 'error'

export function getSupportedAudioMimeType() {
  if (typeof MediaRecorder === 'undefined') return ''
  return (
    AUDIO_MIME_TYPES.find((mimeType) =>
      MediaRecorder.isTypeSupported(mimeType),
    ) ?? ''
  )
}

export function getSpeechRecognitionConstructor() {
  const browser = globalThis as SpeechRecognitionGlobal
  return browser.SpeechRecognition ?? browser.webkitSpeechRecognition ?? null
}

function joinTranscript(...parts: string[]) {
  return parts
    .map((part) => part.trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.!?])/g, '$1')
}

// 녹음 파일은 답변 제출용으로 유지하고, 음성 인식은 브라우저의 기본 Web Speech API로 처리한다.
export function useVoiceAnswer(stream: MediaStream | null) {
  const [status, setStatus] = useState<VoiceAnswerStatus>('idle')
  const [transcript, setTranscript] = useState('')
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [error, setError] = useState<string | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const generationRef = useRef(0)
  const finalTranscriptRef = useRef('')
  const interimTranscriptRef = useRef('')
  const keepRecognizingRef = useRef(false)
  const stopRequestedRef = useRef(false)
  const recognitionFailedRef = useRef(false)
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reviewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimers = useCallback(() => {
    if (restartTimerRef.current !== null) {
      clearTimeout(restartTimerRef.current)
      restartTimerRef.current = null
    }
    if (reviewTimerRef.current !== null) {
      clearTimeout(reviewTimerRef.current)
      reviewTimerRef.current = null
    }
  }, [])

  const finishReview = useCallback((generation: number) => {
    if (generationRef.current !== generation) return
    if (reviewTimerRef.current !== null) {
      clearTimeout(reviewTimerRef.current)
      reviewTimerRef.current = null
    }
    setTranscript(
      joinTranscript(finalTranscriptRef.current, interimTranscriptRef.current),
    )
    setStatus('review')
  }, [])

  const reset = useCallback(() => {
    generationRef.current += 1
    keepRecognizingRef.current = false
    stopRequestedRef.current = false
    recognitionFailedRef.current = false
    clearTimers()

    const recognition = recognitionRef.current
    recognitionRef.current = null
    if (recognition) {
      recognition.onresult = null
      recognition.onerror = null
      recognition.onend = null
      try {
        recognition.abort()
      } catch {
        // 이미 종료된 인식기는 별도 정리가 필요 없다.
      }
    }

    const recorder = recorderRef.current
    recorderRef.current = null
    if (recorder?.state === 'recording') recorder.stop()

    chunksRef.current = []
    finalTranscriptRef.current = ''
    interimTranscriptRef.current = ''
    setStatus('idle')
    setTranscript('')
    setAudioBlob(null)
    setError(null)
  }, [clearTimers])

  const startRecording = useCallback(() => {
    if (status === 'recording' || status === 'processing') return
    if (typeof MediaRecorder === 'undefined') {
      setStatus('review')
      setError(
        '이 브라우저는 음성 녹음을 지원하지 않습니다. 답변을 직접 입력해 주세요.',
      )
      return
    }

    const audioTracks = stream?.getAudioTracks() ?? []
    if (audioTracks.length === 0) {
      setStatus('error')
      setError(
        '사용할 수 있는 마이크가 없습니다. 마이크 권한과 장치 연결을 확인해 주세요.',
      )
      return
    }

    const generation = generationRef.current + 1
    generationRef.current = generation
    keepRecognizingRef.current = true
    stopRequestedRef.current = false
    recognitionFailedRef.current = false
    chunksRef.current = []
    finalTranscriptRef.current = ''
    interimTranscriptRef.current = ''
    clearTimers()
    setTranscript('')
    setAudioBlob(null)
    setError(null)

    try {
      const mimeType = getSupportedAudioMimeType()
      const audioStream = new MediaStream(audioTracks)
      const recorder = new MediaRecorder(
        audioStream,
        mimeType ? { mimeType } : undefined,
      )
      recorderRef.current = recorder

      recorder.ondataavailable = (event) => {
        if (generationRef.current === generation && event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }
      recorder.onerror = () => {
        if (generationRef.current !== generation) return
        keepRecognizingRef.current = false
        stopRequestedRef.current = true
        recognitionFailedRef.current = true
        recognitionRef.current?.abort()
        if (recorder.state === 'recording') recorder.stop()
        setStatus('review')
        setError(
          '녹음 중 오류가 발생했습니다. 인식된 내용을 확인하거나 직접 입력해 주세요.',
        )
      }
      recorder.onstop = () => {
        if (generationRef.current !== generation) return
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || mimeType || 'audio/webm',
        })
        recorderRef.current = null
        setAudioBlob(blob)
        if (!recognitionRef.current || recognitionFailedRef.current) {
          finishReview(generation)
        }
      }

      recorder.start(250)
      setStatus('recording')

      const Recognition = getSpeechRecognitionConstructor()
      if (!Recognition) {
        recognitionFailedRef.current = true
        setError(
          '이 브라우저는 음성 인식을 지원하지 않습니다. 녹음 후 답변을 직접 입력해 주세요.',
        )
        return
      }

      const recognition = new Recognition()
      recognition.lang = 'ko-KR'
      recognition.continuous = true
      recognition.interimResults = true
      recognition.maxAlternatives = 1
      recognitionRef.current = recognition

      recognition.onresult = (event) => {
        if (generationRef.current !== generation) return
        let interim = ''
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const result = event.results[index]
          const text = result?.[0]?.transcript?.trim() ?? ''
          if (!text) continue
          if (result.isFinal) {
            finalTranscriptRef.current = joinTranscript(
              finalTranscriptRef.current,
              text,
            )
          } else {
            interim = joinTranscript(interim, text)
          }
        }
        interimTranscriptRef.current = interim
        setTranscript(joinTranscript(finalTranscriptRef.current, interim))
      }

      recognition.onerror = (event) => {
        if (generationRef.current !== generation) return
        if (event.error === 'aborted' || event.error === 'no-speech') return

        recognitionFailedRef.current = true
        keepRecognizingRef.current = false
        setError(
          event.error === 'not-allowed' || event.error === 'service-not-allowed'
            ? '브라우저의 음성 인식 권한이 차단되었습니다. 녹음 후 답변을 직접 입력해 주세요.'
            : '브라우저 음성 인식이 중단되었습니다. 인식된 내용을 확인하거나 직접 입력해 주세요.',
        )
      }

      recognition.onend = () => {
        if (generationRef.current !== generation) return
        if (
          keepRecognizingRef.current &&
          !recognitionFailedRef.current &&
          !stopRequestedRef.current
        ) {
          restartTimerRef.current = setTimeout(() => {
            restartTimerRef.current = null
            if (
              generationRef.current !== generation ||
              !keepRecognizingRef.current ||
              stopRequestedRef.current
            ) {
              return
            }
            try {
              recognition.start()
            } catch {
              recognitionFailedRef.current = true
              keepRecognizingRef.current = false
              setError(
                '브라우저 음성 인식을 다시 시작하지 못했습니다. 인식된 내용을 확인하거나 직접 입력해 주세요.',
              )
            }
          }, RECOGNITION_RESTART_DELAY_MS)
          return
        }
        if (stopRequestedRef.current) finishReview(generation)
      }

      try {
        recognition.start()
      } catch {
        recognitionFailedRef.current = true
        keepRecognizingRef.current = false
        recognitionRef.current = null
        setError(
          '브라우저 음성 인식을 시작하지 못했습니다. 녹음 후 답변을 직접 입력해 주세요.',
        )
      }
    } catch {
      keepRecognizingRef.current = false
      stopRequestedRef.current = true
      recognitionFailedRef.current = true
      const recognition = recognitionRef.current
      recognitionRef.current = null
      try {
        recognition?.abort()
      } catch {
        // 시작되지 않은 인식기는 중단 호출이 실패할 수 있다.
      }
      const recorder = recorderRef.current
      recorderRef.current = null
      if (recorder?.state === 'recording') recorder.stop()
      setStatus('review')
      setError(
        '음성 녹음을 시작하지 못했습니다. 마이크 권한을 확인하거나 답변을 직접 입력해 주세요.',
      )
    }
  }, [clearTimers, finishReview, status, stream])

  const stopRecording = useCallback(() => {
    if (status !== 'recording') return
    keepRecognizingRef.current = false
    stopRequestedRef.current = true
    setStatus('processing')

    const generation = generationRef.current
    reviewTimerRef.current = setTimeout(() => {
      finishReview(generation)
    }, RECOGNITION_STOP_FALLBACK_MS)

    const recorder = recorderRef.current
    if (recorder?.state === 'recording') recorder.stop()

    const recognition = recognitionRef.current
    if (recognition && !recognitionFailedRef.current) {
      try {
        recognition.stop()
      } catch {
        finishReview(generation)
      }
    } else {
      finishReview(generation)
    }
  }, [finishReview, status])

  useEffect(() => reset, [reset])

  return {
    status,
    transcript,
    audioBlob,
    error,
    setTranscript,
    startRecording,
    stopRecording,
    reset,
  }
}
