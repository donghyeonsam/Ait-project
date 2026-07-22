import { useEffect, useRef, useState } from 'react'

function measureRms(analyser: AnalyserNode, buffer: Uint8Array<ArrayBuffer>) {
  analyser.getByteTimeDomainData(buffer)
  let sumSquares = 0
  for (let i = 0; i < buffer.length; i += 1) {
    const normalized = (buffer[i] - 128) / 128
    sumSquares += normalized * normalized
  }
  return Math.sqrt(sumSquares / buffer.length)
}

export function useAudioLevel(stream: MediaStream | null, gain: number) {
  const [level, setLevel] = useState(0)
  const gainNodeRef = useRef<GainNode | null>(null)

  useEffect(() => {
    if (!stream || stream.getAudioTracks().length === 0) {
      return
    }

    const audioContext = new AudioContext()
    const source = audioContext.createMediaStreamSource(stream)
    const gainNode = audioContext.createGain()
    const analyser = audioContext.createAnalyser()
    analyser.fftSize = 512
    source.connect(gainNode)
    gainNode.connect(analyser)
    gainNodeRef.current = gainNode

    const buffer = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount))
    let frameId = 0

    const tick = () => {
      const rms = measureRms(analyser, buffer)
      setLevel(Math.min(100, Math.round(rms * 400)))
      frameId = requestAnimationFrame(tick)
    }
    frameId = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(frameId)
      gainNodeRef.current = null
      source.disconnect()
      gainNode.disconnect()
      analyser.disconnect()
      void audioContext.close()
      setLevel(0)
    }
  }, [stream])

  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = gain / 50
    }
  }, [gain])

  return level
}
