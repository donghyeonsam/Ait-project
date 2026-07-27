import { useEffect, useRef, useState } from 'react'

// 시간 영역 파형에서 RMS(제곱평균제곱근)를 구해 순간 음량을 근사한다. 0~1 범위.
function measureRms(analyser: AnalyserNode, buffer: Uint8Array<ArrayBuffer>) {
  analyser.getByteTimeDomainData(buffer)
  let sumSquares = 0
  for (let i = 0; i < buffer.length; i += 1) {
    const normalized = (buffer[i] - 128) / 128
    sumSquares += normalized * normalized
  }
  return Math.sqrt(sumSquares / buffer.length)
}

// 마이크 스트림의 실시간 음량(0~100)을 반환한다. gain은 화면 슬라이더 값으로 오디오 게인에 반영된다.
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
      // RMS를 400배 해 일반적인 말소리 음량이 막대를 넉넉히 채우도록 스케일링(100 상한).
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

  // 게인만 바꿀 때는 오디오 그래프를 재생성하지 않고 값만 갱신한다(50을 기준 1배로).
  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = gain / 50
    }
  }, [gain])

  return level
}
