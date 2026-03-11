import { memo } from "react"

import type { AuditFileSyncAttemptRow } from "@/lib/run-types"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { formatDateTime, truncateMiddle } from "@/lib/format"

export const FileSyncTable = memo(function FileSyncTable({
  attempts,
}: {
  attempts: Array<AuditFileSyncAttemptRow>
}) {
  if (attempts.length === 0) {
    return (
      <div className="border border-border/70 bg-muted/16 px-4 py-5 text-sm text-muted-foreground">
        No file sync attempts recorded.
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-24">Stage</TableHead>
          <TableHead className="w-28">Status</TableHead>
          <TableHead>Filename</TableHead>
          <TableHead className="w-48">Source URL</TableHead>
          <TableHead className="w-48">Error</TableHead>
          <TableHead className="w-36">Created</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {attempts.map((attempt) => (
          <TableRow key={attempt.id}>
            <TableCell>
              <Badge variant="outline" className="text-[10px]">
                {attempt.stage}
              </Badge>
            </TableCell>
            <TableCell>
              <Badge
                variant={attempt.status.includes("failed") ? "destructive" : "secondary"}
                className="text-[10px]"
              >
                {attempt.status}
              </Badge>
            </TableCell>
            <TableCell className="max-w-[200px] truncate font-medium">
              {attempt.fileName}
            </TableCell>
            <TableCell className="max-w-[200px]">
              {attempt.sourceUrl ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="cursor-help truncate text-xs text-muted-foreground">
                      {truncateMiddle(attempt.sourceUrl, 40)}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-md break-all">
                    {attempt.sourceUrl}
                  </TooltipContent>
                </Tooltip>
              ) : (
                <span className="text-xs text-muted-foreground">-</span>
              )}
            </TableCell>
            <TableCell>
              {attempt.error ? (
                <span className="text-xs text-destructive">{attempt.error}</span>
              ) : (
                <span className="text-xs text-muted-foreground">-</span>
              )}
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">
              {formatDateTime(attempt.createdAt)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
})
