import { useCallback, useRef, useState } from "react"

export function useClipboard(timeout = 2_000) {
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<number>(undefined)

  const copy = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        window.clearTimeout(timerRef.current)
        timerRef.current = window.setTimeout(() => setCopied(false), timeout)
      } catch {
        setCopied(false)
      }
    },
    [timeout]
  )

  return { copy, copied }
}
