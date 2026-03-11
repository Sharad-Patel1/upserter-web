import { Suspense, lazy, memo } from "react"

import type { AuditHttpExchangeRow } from "@/lib/run-types"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDateTime } from "@/lib/format"

const JsonViewer = lazy(() =>
  import("@/components/data/json-viewer").then((m) => ({ default: m.JsonViewer }))
)

export const HttpExchangeCard = memo(function HttpExchangeCard({
  exchange,
}: {
  exchange: AuditHttpExchangeRow
}) {
  const summary = `${exchange.method} ${exchange.path} -> ${exchange.status ?? "?"} (${exchange.durationMs ?? "?"}ms)`

  return (
    <Collapsible>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-sm border border-border/70 bg-muted/12 px-3 py-2 text-left text-xs transition-colors hover:bg-muted/22"
        >
          <Badge variant="outline" className="shrink-0">
            {exchange.method}
          </Badge>
          {exchange.status ? (
            <Badge variant={exchange.status >= 400 ? "destructive" : "secondary"} className="shrink-0">
              {exchange.status}
            </Badge>
          ) : null}
          <span className="min-w-0 truncate font-mono text-muted-foreground">{exchange.path}</span>
          {exchange.durationMs ? (
            <span className="ml-auto shrink-0 text-muted-foreground">{exchange.durationMs}ms</span>
          ) : null}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="space-y-3 border border-t-0 border-border/70 bg-background/90 p-3">
          <p className="text-xs text-muted-foreground">
            {summary} - {formatDateTime(exchange.createdAt)}
          </p>
          {exchange.error ? (
            <div className="border border-destructive/20 bg-destructive/8 px-3 py-2 text-xs text-destructive">
              {exchange.error}
            </div>
          ) : null}
          <Suspense fallback={<Skeleton className="h-20" />}>
            {exchange.requestHeaders ? (
              <JsonViewer value={exchange.requestHeaders} rootLabel="Request headers" collapsed />
            ) : null}
            {exchange.requestBody ? (
              <JsonViewer value={exchange.requestBody} rootLabel="Request body" collapsed />
            ) : null}
            {exchange.responseHeaders ? (
              <JsonViewer value={exchange.responseHeaders} rootLabel="Response headers" collapsed />
            ) : null}
            {exchange.responseBody ? (
              <JsonViewer value={exchange.responseBody} rootLabel="Response body" collapsed />
            ) : null}
          </Suspense>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
})
