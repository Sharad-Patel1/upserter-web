import type { RunSnapshot } from "@/lib/run-types"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { ConnectionIndicator } from "@/components/shell/connection-indicator"
import { RunStatusIndicator } from "@/components/run/run-status-indicator"
import { useElapsedTime } from "@/hooks/use-elapsed-time"
import { formatDateTime, formatRelativeTime, truncateMiddle } from "@/lib/format"
import { cn } from "@/lib/utils"

interface RunHeaderProps {
  snapshot: RunSnapshot
  connectionState: "live" | "connecting" | "reconnecting" | "closed"
  lastHeartbeatAt?: string
  streamError?: string
}

export function RunHeader({
  snapshot,
  connectionState,
  streamError,
}: RunHeaderProps) {
  const { report } = snapshot
  const isRunning = report.status === "running"
  const duration = useElapsedTime(report.startedAt, report.finishedAt, isRunning)

  const progress = report.options.limit
    ? Math.min(100, (report.totals.scanned / report.options.limit) * 100)
    : undefined

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <h1 className="text-sm font-semibold tracking-tight">
              {truncateMiddle(report.runId, 20)}
            </h1>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="font-mono text-xs">{report.runId}</TooltipContent>
        </Tooltip>
        <RunStatusIndicator status={report.status} animate={isRunning} />
        <Badge variant="outline" className="text-[10px]">{report.mode}</Badge>
        <ConnectionIndicator state={connectionState} />
        <span className="text-xs text-muted-foreground">
          {formatRelativeTime(report.createdAt)}
        </span>
        <span className="text-xs font-mono text-muted-foreground">{duration}</span>
        {streamError ? (
          <span className="text-[11px] text-amber-600">{streamError}</span>
        ) : null}
      </div>

      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <Metric label="scanned" value={report.totals.scanned} />
        <Metric label="created" value={report.totals.created} />
        <Metric label="updated" value={report.totals.updated} />
        <Metric
          label="errors"
          value={report.totals.errored}
          tone={report.totals.errored > 0 ? "error" : undefined}
        />
        <Metric label="files" value={report.totals.filesUploaded} />

        {report.checkpoint.lastProcessedKey ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-[11px] text-muted-foreground">
                @ {truncateMiddle(report.checkpoint.lastProcessedKey, 24)}
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-sm break-all font-mono text-xs">
              Checkpoint: {report.checkpoint.lastProcessedKey}
              {report.checkpoint.updatedAt ? (
                <span className="block text-muted-foreground">
                  {formatDateTime(report.checkpoint.updatedAt)}
                </span>
              ) : null}
            </TooltipContent>
          </Tooltip>
        ) : null}
      </div>

      {progress !== undefined && isRunning ? (
        <div className="flex items-center gap-3">
          <Progress value={progress} className="h-1.5 flex-1" />
          <span className="text-[11px] font-mono text-muted-foreground">
            {report.totals.scanned}/{report.options.limit}
          </span>
        </div>
      ) : null}
    </div>
  )
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone?: "error"
}) {
  return (
    <span className="inline-flex items-baseline gap-1">
      <span
        className={cn(
          "text-base font-semibold tabular-nums tracking-tight",
          tone === "error" && value > 0 && "text-destructive"
        )}
      >
        {value.toLocaleString()}
      </span>
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
    </span>
  )
}
