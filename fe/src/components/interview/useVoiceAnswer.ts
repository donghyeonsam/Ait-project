import { useCallback, useEffect, useRef, useState } from 'react'

const AUDIO_MIME_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
] as const

export type VoiceAnswerStatus =
  | 'idle'
  | 'recording'
  | 'processing'
  | 'review'
  | 'error'

function appendTranscript(current: string, addition: string) {
  return `${current} ${addition}`.replace(/\s+/g, ' ').trim()
}

export function getSupportedAudioMimeType() {
  if (typeof MediaRecorder === 'undefined') return ''
  return (
    AUDIO_MIME_TYPES.find((mimeType) =>
      MediaRecorder.isTypeSupported(mimeType),
    ) ?? ''
  )
}

export function useVoiceAnswer(stream: MediaStream | null) {
  const [status, setStatus] = useState<VoiceAnswerStatus>('idle')
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [error, setError] = useState<string | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const recognitionRef = useRef<AitSpeechRecognition | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const generationRef = useRef(0)

  const recognitionSupported = Boolean(
    typeof window !== 'undefined' &&
      (window.SpeechRecognition || window.webkitSpeechRecognition),
  )

  const reset = useCallback(() => {
    generationRef.current += 1
    const recorder = recorderRef.current
    if (recorder?.state === 'recording') recorder.stop()
    recognitionRef.current?.abort()
    recorderRef.current = null
    recognitionRef.current = null
    chunksRef.current = []
    setStatus('idle')
    setTranscript('')
    setInterimTranscript('')
    setAudioBlob(null)
    setError(null)
  }, [])

  const startRecording = useCallback(() => {
    if (status === 'recording' || status === 'processing') return
    if (typeof MediaRecorder === 'undefined') {
      setStatus('error')
      setError('이 브라우저는 음성 녹음을 지원하지 않습니다. 최신 Chrome 또는 Edge에서 다시 시도해주세요.')
      return
    }

    const audioTracks = stream?.getAudioTracks() ?? []
    if (audioTracks.length === 0) {
      setStatus('error')
      setError('사용할 수 있는 마이크가 없습니다. 마이크 권한과 장치 연결을 확인해주세요.')
      return
    }

    const generation = generationRef.current + 1
    generationRef.current = generation
    chunksRef.current = []
    setTranscript('')
    setInterimTranscript('')
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
        setStatus('error')
        setError('녹음 중 오류가 발생했습니다. 마이크 상태를 확인하고 다시 시도해주세요.')
      }
      recorder.onstop = () => {
        if (generationRef.current !== generation) return
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || mimeType || 'audio/webm',
        })
        recorderRef.current = null
        setAudioBlob(blob)
        setStatus('review')
      }

      const Recognition =
        window.SpeechRecognition ?? window.webkitSpeechRecognition
      if (Recognition) {
        const recognition = new Recognition()
        recognition.continuous = true
        recognition.interimResults = true
        recognition.lang = 'ko-KR'
        recognition.onresult = (event) => {
          if (generationRef.current !== generation) return
          let finalText = ''
          let interimText = ''

          for (let index = event.resultIndex; index < event.results.length; index += 1) {
            const result = event.results[index]
            const text = result?.[0]?.transcript ?? ''
            if (result?.isFinal) finalText = appendTranscript(finalText, text)
            else interimText = appendTranscript(interimText, text)
          }

          if (finalText) {
            setTranscript((current) => appendTranscript(current, finalText))
          }
          setInterimTranscript(interimText)
        }
        recognition.onerror = () => {
          if (generationRef.current !== generation) return
          setError('자동 음성 인식이 원활하지 않습니다. 녹음 후 답변 내용을 직접 수정할 수 있습니다.')
        }
        recognition.onend = () => {
          if (generationRef.current === generation) {
            setInterimTranscript('')
          }
        }
        recognitionRef.current = recognition
        recognition.start()
      } else {
        setError('이 브라우저는 자동 음성 인식을 지원하지 않습니다. 녹음 후 답변 내용을 직접 입력해주세요.')
      }

      recorder.start(250)
      setStatus('recording')
    } catch {
      recorderRef.current = null
      recognitionRef.current = null
      setStatus('error')
      setError('음성 녹음을 시작하지 못했습니다. 마이크 권한을 다시 확인해주세요.')
    }
  }, [status, stream])

  const stopRecording = useCallback(() => {
    if (status !== 'recording') return
    setStatus('processing')
    recognitionRef.current?.stop()
    recognitionRef.current = null

    const recorder = recorderRef.current
    if (recorder?.state === 'recording') recorder.stop()
    else setStatus('review')
  }, [status])

  useEffect(() => reset, [reset])

  return {
    status,
    transcript,
    interimTranscript,
    audioBlob,
    error,
    recognitionSupported,
    setTranscript,
    startRecording,
    stopRecording,
    reset,
  }
}
