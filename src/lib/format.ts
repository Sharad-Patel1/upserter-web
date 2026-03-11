import { format, formatDistanceToNowStrict } from "date-fns"

export function formatRelativeTime(value: string) {
  return formatDistanceToNowStrict(new Date(value), { addSuffix: true })
}

export function formatDateTime(value: string) {
  return format(new Date(value), "dd MMM yyyy HH:mm:ss")
}

export function formatRunDuration(startedAt?: string, finishedAt?: string) {
  if (!startedAt) {
    return "Queued"
  }

  const end = finishedAt ? new Date(finishedAt).getTime() : Date.now()
  const start = new Date(startedAt).getTime()
  const ms = Math.max(0, end - start)

  if (ms < 1_000) {
    return `${ms}ms`
  }

  if (ms < 60_000) {
    return `${(ms / 1_000).toFixed(1)}s`
  }

  const minutes = Math.floor(ms / 60_000)
  const seconds = Math.round((ms % 60_000) / 1_000)
  return `${minutes}m ${seconds}s`
}

export function formatValue(value: string | number | boolean | null) {
  if (value === null) {
    return "null"
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false"
  }

  return String(value)
}

export function truncateMiddle(value: string, maxLen: number) {
  if (value.length <= maxLen) {
    return value
  }

  const half = Math.floor((maxLen - 3) / 2)
  return `${value.slice(0, half)}...${value.slice(-half)}`
}

export function formatLatency(ms: number): { text: string; tone: "fast" | "medium" | "slow" } {
  if (ms < 100) {
    return { text: `${ms}ms`, tone: "fast" }
  }

  if (ms < 500) {
    return { text: `${ms}ms`, tone: "medium" }
  }

  if (ms < 1_000) {
    return { text: `${ms}ms`, tone: "slow" }
  }

  return { text: `${(ms / 1_000).toFixed(1)}s`, tone: "slow" }
}
