import type { RunItemOutcome, RunStatus } from "@/lib/run-types"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const STATUS_CONFIG: Record<
  RunStatus,
  { variant: "default" | "secondary" | "destructive" | "outline"; dotClass?: string }
> = {
  running: { variant: "default", dotClass: "bg-primary animate-pulse" },
  queued: { variant: "outline" },
  completed: { variant: "secondary" },
  failed: { variant: "destructive" },
  cancelled: { variant: "outline" },
}

export function RunStatusIndicator({
  status,
  animate = true,
  size = "md",
}: {
  status: RunStatus
  animate?: boolean
  size?: "sm" | "md"
}) {
  const config = STATUS_CONFIG[status]

  return (
    <Badge
      variant={config.variant}
      className={cn(size === "sm" && "text-[10px] px-1.5 py-0")}
    >
      {config.dotClass && animate ? (
        <span className="relative mr-1.5 flex h-2 w-2">
          <span
            className={cn(
              "absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping",
              config.dotClass
            )}
          />
          <span className={cn("relative inline-flex h-2 w-2 rounded-full", config.dotClass)} />
        </span>
      ) : null}
      {status.replace("_", " ")}
    </Badge>
  )
}

const ACTION_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  create: "default",
  create_dry_run: "default",
  update: "secondary",
  update_dry_run: "secondary",
  skip_unchanged: "outline",
}

export function RunActionBadge({ action }: { action: RunItemOutcome["action"] }) {
  const variant = action.includes("error")
    ? "destructive"
    : ACTION_VARIANT[action] ?? "outline"

  return <Badge variant={variant}>{action.replaceAll("_", " ")}</Badge>
}
