import type { HealthResponse } from "@/lib/run-types"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

function StatusDot({ ok, label }: { ok: boolean; label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "inline-block h-2 w-2 rounded-full",
              ok ? "bg-emerald-500" : "bg-red-500"
            )}
          />
          <span className="text-xs text-sidebar-foreground/70">{label}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top">
        {label}: {ok ? "Connected" : "Unavailable"}
      </TooltipContent>
    </Tooltip>
  )
}

export function HealthStrip({ health }: { health: HealthResponse | null }) {
  if (!health) {
    return (
      <div className="flex items-center gap-2 px-2 py-1">
        <span className="inline-block h-2 w-2 rounded-full bg-muted-foreground/40" />
        <span className="text-xs text-sidebar-foreground/50">Checking health...</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 px-2 py-1">
      <StatusDot ok={health.ok} label="API" />
      <StatusDot ok={health.s3Configured} label="S3" />
      <StatusDot ok={health.clickhomeConfigured} label="CH" />
    </div>
  )
}
