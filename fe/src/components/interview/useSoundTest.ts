import { useCallback, useEffect, useRef, useState } from 'react'

const TEST_TONE_DURATION_MS = 1500

export function useSoundTest(speakerDeviceId: string | null, volume: number) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [level, setLevel] = useState(0)
  const contextRef = useRef<AudioContext | null>(null)
  const gainNodeRef = useRef<GainNode | null>(null)
  const frameRef = useRef(0)

  const stop = useCallback(() => {
    cancelAnimationFrame(frameRef.current)
    contextRef.current?.close()
    contextRef.current = null
    gainNodeRef.current = null
    setIsPlaying(false)
    setLevel(0)
  }, [])

  const play = useCallback(async () => {
    stop()

    const audioContext = new AudioContext()
    const oscillator = audioContext.createOscillator()
    oscillator.type = 'sine'
    oscillator.frequency.value = 440

    const gainNode = audioContext.createGain()
    gainNode.gain.value = volume / 100

    const analyser = audioContext.createAnalyser()
    analyser.fftSize = 512

    const destination = audioContext.createMediaStreamDestination()
    oscillator.connect(gainNode)
    gainNode.connect(analyser)
    analyser.connect(destination)
    oscillator.start()

    const audioElement = new Audio()
    audioElement.srcObject = destination.stream
    if (speakerDeviceId && audioElement.setSinkId) {
      try {
        await audioElement.setSinkId(speakerDeviceId)
      } catch {
        // 선택한 출력 장치를 지원하지 않는 브라우저는 기본 출력으로 재생한다.
      }
    }
    await audioElement.play()

    contextRef.current = audioContext
    gainNodeRef.current = gainNode
    setIsPlaying(true)

    const buffer = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount))
    const tick = () => {
      analyser.getByteTimeDomainData(buffer)
      let sumSquares = 0
      for (let i = 0; i < buffer.length; i += 1) {
        const normalized = (buffer[i] - 128) / 128
        sumSquares += normalized * normalized
      }
      const rms = Math.sqrt(sumSquares / buffer.length)
      setLevel(Math.min(100, Math.round(rms * 300)))
      frameRef.current = requestAnimationFrame(tick)
    }
    frameRef.current = requestAnimationFrame(tick)

    window.setTimeout(() => {
      oscillator.stop()
      audioElement.pause()
      stop()
    }, TEST_TONE_DURATION_MS)
  }, [speakerDeviceId, stop, volume])

  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = volume / 100
    }
  }, [volume])

  useEffect(() => stop, [stop])

  return { isPlaying, level, play }
}
