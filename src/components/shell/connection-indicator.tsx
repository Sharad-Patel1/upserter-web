import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const DOT_STYLES = {
  live: "bg-emerald-500",
  connecting: "bg-amber-500",
  reconnecting: "bg-amber-500",
  closed: "bg-muted-foreground/50",
} as const

const LABEL: Record<string, string> = {
  live: "Live",
  connecting: "Connecting",
  reconnecting: "Reconnecting",
  closed: "Closed",
}

export function ConnectionIndicator({
  state,
}: {
  state: "live" | "connecting" | "reconnecting" | "closed"
}) {
  const variant = state === "live" ? "secondary" : state === "closed" ? "outline" : "default"
  const shouldPulse = state === "live" || state === "connecting" || state === "reconnecting"

  return (
    <Badge variant={variant} className="gap-1.5">
      <span className="relative flex h-2 w-2">
        {shouldPulse ? (
          <span
            className={cn(
              "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
              DOT_STYLES[state]
            )}
          />
        ) : null}
        <span
          className={cn("relative inline-flex h-2 w-2 rounded-full", DOT_STYLES[state])}
        />
      </span>
      {LABEL[state]}
    </Badge>
  )
}
