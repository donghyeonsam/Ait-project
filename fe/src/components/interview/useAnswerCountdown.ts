import { useEffect, useRef, useState } from 'react'

interface UseAnswerCountdownOptions {
  activeKey: string | null
  durationSeconds: number
  onExpire: () => void
}

interface CountdownState {
  key: string | null
  remainingSeconds: number
}

export function useAnswerCountdown({
  activeKey,
  durationSeconds,
  onExpire,
}: UseAnswerCountdownOptions) {
  const [countdown, setCountdown] = useState<CountdownState>({
    key: null,
    remainingSeconds: durationSeconds,
  })
  const onExpireRef = useRef(onExpire)

  useEffect(() => {
    onExpireRef.current = onExpire
  }, [onExpire])

  useEffect(() => {
    if (!activeKey) return

    const countdownKey = activeKey
    const deadline = Date.now() + durationSeconds * 1000
    let expirationHandled = false

    const updateCountdown = () => {
      const remainingSeconds = Math.max(
        0,
        Math.ceil((deadline - Date.now()) / 1000),
      )
      setCountdown({
        key: countdownKey,
        remainingSeconds,
      })

      if (remainingSeconds === 0 && !expirationHandled) {
        expirationHandled = true
        onExpireRef.current()
      }
    }

    const firstTick = window.setTimeout(updateCountdown, 0)
    const timer = window.setInterval(updateCountdown, 250)

    return () => {
      window.clearTimeout(firstTick)
      window.clearInterval(timer)
    }
  }, [activeKey, durationSeconds])

  return countdown.key === activeKey
    ? countdown.remainingSeconds
    : durationSeconds
}
