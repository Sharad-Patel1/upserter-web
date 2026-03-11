import { Link } from "@tanstack/react-router"

import type { RunListEntry } from "@/lib/run-types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Spinner } from "@/components/ui/spinner"
import { MetricChip } from "@/components/run/run-metrics"
import { RunStatusIndicator } from "@/components/run/run-status-indicator"
import { formatRelativeTime } from "@/lib/format"

export function ActiveRunCard({ run }: { run: RunListEntry | undefined }) {
  return (
    <Card className="border border-foreground/10 bg-[#112a33] text-[#f5efe5]">
      <CardHeader className="gap-3 border-b border-white/10">
        <CardTitle className="text-xl tracking-[-0.03em]">Latest active run</CardTitle>
        <CardDescription className="text-[#d3c4b5]">
          Jump back into the newest live execution.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {run ? (
          <>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{run.runId}</p>
                <p className="text-xs text-[#d3c4b5]">{formatRelativeTime(run.createdAt)}</p>
              </div>
              <div className="flex items-center gap-2">
                {run.status === "running" ? <Spinner className="h-4 w-4" /> : null}
                <RunStatusIndicator status={run.status} />
              </div>
            </div>
            {run.options.limit ? (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-[#d3c4b5]">
                  <span>Progress</span>
                  <span>
                    {run.totals.scanned} / {run.options.limit}
                  </span>
                </div>
                <Progress
                  value={Math.min(100, (run.totals.scanned / run.options.limit) * 100)}
                  className="h-2"
                />
              </div>
            ) : null}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <MetricChip label="Scanned" value={String(run.totals.scanned)} />
              <MetricChip label="Errors" value={String(run.totals.errored)} />
              <MetricChip label="Created" value={String(run.totals.created)} />
              <MetricChip label="Updated" value={String(run.totals.updated)} />
            </div>
            <Button asChild className="w-full justify-between">
              <Link to="/runs/$runId" params={{ runId: run.runId }}>
                Open live run
                <Badge variant="outline" className="border-white/20 text-[10px]">
                  {run.mode}
                </Badge>
              </Link>
            </Button>
          </>
        ) : (
          <div className="rounded-none border border-white/10 bg-white/5 p-4 text-sm text-[#d3c4b5]">
            No active run right now. Launch a new run to get started.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
