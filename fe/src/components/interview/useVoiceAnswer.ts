import { useCallback, useEffect, useRef, useState } from 'react'
import { transcribeAnswer } from '@/api/speech'

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

export function getSupportedAudioMimeType() {
  if (typeof MediaRecorder === 'undefined') return ''
  return (
    AUDIO_MIME_TYPES.find((mimeType) =>
      MediaRecorder.isTypeSupported(mimeType),
    ) ?? ''
  )
}

// 답변 음성을 녹음하고 서버 STT로 전사해 검토 가능한 텍스트로 만든다.
export function useVoiceAnswer(stream: MediaStream | null) {
  const [status, setStatus] = useState<VoiceAnswerStatus>('idle')
  const [transcript, setTranscript] = useState('')
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [error, setError] = useState<string | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const generationRef = useRef(0)
  const abortRef = useRef<AbortController | null>(null)

  const runTranscription = useCallback(
    async (blob: Blob, generation: number) => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      setStatus('processing')
      setError(null)

      try {
        const { text } = await transcribeAnswer(blob, {
          signal: controller.signal,
        })
        if (generationRef.current !== generation) return
        setTranscript(text)
        setStatus('review')
      } catch (transcriptionError) {
        if (generationRef.current !== generation) return
        if (
          transcriptionError instanceof DOMException &&
          transcriptionError.name === 'AbortError'
        ) {
          return
        }
        // 전사 실패가 면접을 막지 않도록 review로 진입시켜 수동 입력 경로를 보존한다.
        setStatus('review')
        setError(
          '음성을 텍스트로 변환하지 못했습니다. 다시 시도하거나 답변을 직접 입력해주세요.',
        )
      }
    },
    [],
  )

  const reset = useCallback(() => {
    generationRef.current += 1
    const recorder = recorderRef.current
    if (recorder?.state === 'recording') recorder.stop()
    abortRef.current?.abort()
    abortRef.current = null
    recorderRef.current = null
    chunksRef.current = []
    setStatus('idle')
    setTranscript('')
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
    abortRef.current?.abort()
    abortRef.current = null
    chunksRef.current = []
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
        void runTranscription(blob, generation)
      }

      recorder.start(250)
      setStatus('recording')
    } catch {
      recorderRef.current = null
      setStatus('error')
      setError('음성 녹음을 시작하지 못했습니다. 마이크 권한을 다시 확인해주세요.')
    }
  }, [runTranscription, status, stream])

  const stopRecording = useCallback(() => {
    if (status !== 'recording') return
    setStatus('processing')

    const recorder = recorderRef.current
    if (recorder?.state === 'recording') recorder.stop()
    else setStatus('review')
  }, [status])

  const retryTranscription = useCallback(() => {
    if (status !== 'review' || !audioBlob) return
    void runTranscription(audioBlob, generationRef.current)
  }, [audioBlob, runTranscription, status])

  useEffect(() => reset, [reset])

  return {
    status,
    transcript,
    audioBlob,
    error,
    setTranscript,
    startRecording,
    stopRecording,
    retryTranscription,
    reset,
  }
}
