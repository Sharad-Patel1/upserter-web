import { Link } from "@tanstack/react-router"

import type { RunListEntry } from "@/lib/run-types"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { RunStatusIndicator } from "@/components/run/run-status-indicator"
import { formatRelativeTime, formatRunDuration, truncateMiddle } from "@/lib/format"

export function RecentRunsTable({ runs }: { runs: Array<RunListEntry> }) {
  return (
    <Card className="border border-foreground/10 bg-background/88 backdrop-blur-sm">
      <CardHeader className="gap-2 border-b border-border/70">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-xl tracking-[-0.03em]">Recent runs</CardTitle>
            <CardDescription>Ordered newest first from the audit store.</CardDescription>
          </div>
          <Badge variant="outline" className="border-foreground/10">
            {runs.length} visible
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {runs.length === 0 ? (
          <div className="border-b border-border/70 bg-muted/20 px-4 py-5 text-sm text-muted-foreground">
            No runs recorded yet.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-28">Status</TableHead>
                <TableHead>Run ID</TableHead>
                <TableHead className="w-20">Mode</TableHead>
                <TableHead className="w-32">Created</TableHead>
                <TableHead className="w-20 text-right">Items</TableHead>
                <TableHead className="w-20 text-right">Created</TableHead>
                <TableHead className="w-20 text-right">Updated</TableHead>
                <TableHead className="w-20 text-right">Errors</TableHead>
                <TableHead className="w-24">Duration</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map((run) => (
                <TableRow key={run.runId} className="group">
                  <TableCell>
                    <RunStatusIndicator status={run.status} size="sm" />
                  </TableCell>
                  <TableCell>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Link
                          to="/runs/$runId"
                          params={{ runId: run.runId }}
                          className="font-medium hover:underline"
                        >
                          {truncateMiddle(run.runId, 24)}
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent side="top">{run.runId}</TooltipContent>
                    </Tooltip>
                    {run.error ? (
                      <p className="max-w-xs truncate text-[11px] text-destructive">{run.error}</p>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">
                      {run.mode}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-help text-xs text-muted-foreground">
                          {formatRelativeTime(run.createdAt)}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top">{run.createdAt}</TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell className="text-right font-medium">{run.totals.scanned}</TableCell>
                  <TableCell className="text-right">{run.totals.created}</TableCell>
                  <TableCell className="text-right">{run.totals.updated}</TableCell>
                  <TableCell className="text-right">
                    <span className={run.totals.errored > 0 ? "text-destructive" : ""}>
                      {run.totals.errored}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatRunDuration(run.startedAt, run.finishedAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
