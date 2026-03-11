import { Link } from "@tanstack/react-router"

import type { RunSnapshot } from "@/lib/run-types"
import { Badge } from "@/components/ui/badge"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { ConnectionIndicator } from "@/components/shell/connection-indicator"
import { SummaryMetric, SummaryStrip } from "@/components/run/run-metrics"
import { RunStatusIndicator } from "@/components/run/run-status-indicator"
import { useElapsedTime } from "@/hooks/use-elapsed-time"
import { formatDateTime, formatRelativeTime, truncateMiddle } from "@/lib/format"

interface RunHeaderProps {
  snapshot: RunSnapshot
  connectionState: "live" | "connecting" | "reconnecting" | "closed"
  lastHeartbeatAt?: string
  streamError?: string
}

export function RunHeader({
  snapshot,
  connectionState,
  lastHeartbeatAt,
  streamError,
}: RunHeaderProps) {
  const { report } = snapshot
  const isRunning = report.status === "running"
  const duration = useElapsedTime(report.startedAt, report.finishedAt, isRunning)

  const progress = report.options.limit
    ? Math.min(100, (report.totals.scanned / report.options.limit) * 100)
    : undefined

  return (
    <Card className="overflow-hidden border border-foreground/10 bg-background/88 backdrop-blur-sm">
      <CardHeader className="gap-3 border-b border-border/70">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/">Dashboard</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Run</BreadcrumbPage>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <Tooltip>
                <TooltipTrigger asChild>
                  <BreadcrumbPage>{truncateMiddle(report.runId, 20)}</BreadcrumbPage>
                </TooltipTrigger>
                <TooltipContent side="bottom">{report.runId}</TooltipContent>
              </Tooltip>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex flex-wrap items-center gap-2">
          <RunStatusIndicator status={report.status} animate={isRunning} />
          <Badge variant="outline">{report.mode}</Badge>
          <ConnectionIndicator state={connectionState} />
          {streamError ? (
            <span className="text-xs text-amber-600">{streamError}</span>
          ) : null}
        </div>

        <p className="text-sm text-muted-foreground">
          Created {formatRelativeTime(report.createdAt)}
          {lastHeartbeatAt ? ` · heartbeat ${formatRelativeTime(lastHeartbeatAt)}` : ""}
        </p>

        {progress !== undefined ? (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Progress</span>
              <span>
                {report.totals.scanned} / {report.options.limit}
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        ) : null}

        <div className="grid shrink-0 gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryMetric label="Scanned" value={report.totals.scanned} />
          <SummaryMetric label="Created" value={report.totals.created} />
          <SummaryMetric label="Updated" value={report.totals.updated} />
          <SummaryMetric
            label="Errors"
            value={report.totals.errored}
            tone={report.totals.errored > 0 ? "error" : "default"}
          />
        </div>
      </CardHeader>

      <CardContent className="grid gap-3 pt-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryStrip
          title="Checkpoint"
          value={report.checkpoint.lastProcessedKey ?? "Waiting for first item"}
          detail={
            report.checkpoint.updatedAt
              ? formatDateTime(report.checkpoint.updatedAt)
              : "No checkpoint yet"
          }
        />
        <SummaryStrip
          title="Duration"
          value={duration}
          detail={
            report.startedAt
              ? `Started ${formatDateTime(report.startedAt)}`
              : "Queued only"
          }
        />
        <SummaryStrip
          title="Artifacts"
          value={snapshot.audit.artifactCount}
          detail={`${snapshot.audit.httpExchangeCount} HTTP exchanges · ${snapshot.audit.fileSyncAttemptCount} file steps`}
        />
        <SummaryStrip
          title="Runtime"
          value={snapshot.runtime.activeRunCount}
          detail={`${snapshot.runtime.pendingUpdateChains} pending update chains`}
        />
      </CardContent>
    </Card>
  )
}
