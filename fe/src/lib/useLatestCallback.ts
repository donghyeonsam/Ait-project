import { useCallback, useEffect, useRef } from 'react'

/**
 * Returns a stable function identity that always calls the latest `callback`.
 * Use this to call a prop callback from inside an effect without the callback's
 * (often inline, ever-changing) identity forcing the effect to re-run every render.
 */
export function useLatestCallback<Args extends unknown[], Return>(callback: (...args: Args) => Return) {
  const callbackRef = useRef(callback)

  useEffect(() => {
    callbackRef.current = callback
  })

  return useCallback((...args: Args) => callbackRef.current(...args), [])
}
