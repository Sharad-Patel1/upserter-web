import { useEffect, useState } from "react"
import { formatRunDuration } from "@/lib/format"

export function useElapsedTime(startedAt?: string, finishedAt?: string, running = false) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!running || !startedAt || finishedAt) {
      return
    }

    const interval = window.setInterval(() => setNow(Date.now()), 1_000)
    return () => window.clearInterval(interval)
  }, [running, startedAt, finishedAt])

  // Force re-evaluation when now changes for running timers
  void now

  return formatRunDuration(startedAt, finishedAt)
}
