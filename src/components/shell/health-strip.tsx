import type { HealthResponse } from "@/lib/run-types"
import { cn } from "@/lib/utils"
import { useSidebar } from "@/components/ui/sidebar"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

function StatusDot({ ok, label, showLabel }: { ok: boolean; label: string; showLabel: boolean }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "inline-block h-2 w-2 shrink-0 rounded-full",
              ok ? "bg-emerald-500" : "bg-red-500"
            )}
          />
          {showLabel ? (
            <span className="truncate text-xs text-sidebar-foreground/70">{label}</span>
          ) : null}
        </div>
      </TooltipTrigger>
      <TooltipContent side="top">
        {label}: {ok ? "Connected" : "Unavailable"}
      </TooltipContent>
    </Tooltip>
  )
}

export function HealthStrip({ health }: { health: HealthResponse | null }) {
  const { state } = useSidebar()
  const expanded = state === "expanded"

  if (!health) {
    return (
      <div className="flex items-center gap-2 overflow-hidden px-2 py-1">
        <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-muted-foreground/40" />
        {expanded ? (
          <span className="truncate text-xs text-sidebar-foreground/50">Checking...</span>
        ) : null}
      </div>
    )
  }

  return (
    <div className={cn(
      "flex items-center overflow-hidden px-2 py-1",
      expanded ? "gap-3" : "flex-col gap-2"
    )}>
      <StatusDot ok={health.ok} label="API" showLabel={expanded} />
      <StatusDot ok={health.s3Configured} label="S3" showLabel={expanded} />
      <StatusDot ok={health.clickhomeConfigured} label="CH" showLabel={expanded} />
    </div>
  )
}
