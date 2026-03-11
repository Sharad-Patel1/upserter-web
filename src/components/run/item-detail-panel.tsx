import { Suspense, lazy } from "react"

import type { AuditStepEventRow, RunItemDetail, RunItemOutcome } from "@/lib/run-types"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { RunActionBadge } from "@/components/run/run-status-indicator"
import { MutedState, SummaryStrip } from "@/components/run/run-metrics"
import { FileSyncTable } from "@/components/data/file-sync-table"
import { formatDateTime, formatLatency } from "@/lib/format"

const DiffViewer = lazy(() =>
  import("@/components/data/diff-viewer").then((m) => ({ default: m.DiffViewer }))
)
const HttpExchangeCard = lazy(() =>
  import("@/components/data/http-exchange-card").then((m) => ({ default: m.HttpExchangeCard }))
)
const ArtifactCard = lazy(() =>
  import("@/components/data/artifact-card").then((m) => ({ default: m.ArtifactCard }))
)

interface ItemDetailPanelProps {
  item: RunItemOutcome | null
  detail?: { loading: boolean; data?: RunItemDetail; error?: string }
}

export function ItemDetailPanel({ item, detail }: ItemDetailPanelProps) {
  if (!item) {
    return <MutedState message="Select an item from the list to see its detail." />
  }

  const latency = formatLatency(item.latencyMs)

  return (
    <div className="flex h-full flex-col gap-3 overflow-auto p-3">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <RunActionBadge action={item.action} />
          {item.optionId ? <Badge variant="outline">Option {item.optionId}</Badge> : null}
          {item.externalRef ? <Badge variant="outline">{item.externalRef}</Badge> : null}
        </div>
        <p className="break-all text-sm font-medium">{item.key}</p>
        <p className="text-xs text-muted-foreground">
          {item.decision?.reason ?? "No decision text recorded"}
        </p>
        {item.error ? (
          <div className="border border-destructive/20 bg-destructive/8 px-3 py-2 text-xs text-destructive">
            {item.error}
          </div>
        ) : null}
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        <SummaryStrip
          title="Patch strategy"
          value={item.audit?.patchStrategy ?? "n/a"}
          detail={
            item.decision?.jsonPatchOperations?.length
              ? `${item.decision.jsonPatchOperations.length} json patch ops`
              : "No patch operations"
          }
        />
        <SummaryStrip
          title="Latency"
          value={latency.text}
          detail={`${formatDateTime(item.startedAt)} -> ${formatDateTime(item.finishedAt)}`}
        />
        <SummaryStrip
          title="Files"
          value={`${item.files.uploaded} up / ${item.files.skippedExisting} skip`}
          detail={`${item.files.failed} failed · ${item.files.wouldUpload} would upload`}
        />
        <SummaryStrip
          title="Changed paths"
          value={item.decision?.jsonPatchOperations?.length ?? 0}
          detail={item.error ?? "No terminal error"}
        />
      </div>

      {detail?.loading ? (
        <MutedState message="Loading item detail..." />
      ) : detail?.error ? (
        <MutedState message={detail.error} tone="error" />
      ) : detail?.data ? (
        <Accordion type="multiple" defaultValue={["decision", "artifacts"]} className="space-y-1">
          {(item.decision?.jsonPatchOperations?.length ?? 0) > 0 ||
          (item.decision?.mergePatchObject &&
            Object.keys(item.decision.mergePatchObject).length > 0) ? (
            <AccordionItem value="decision">
              <AccordionTrigger>Decision & Diff</AccordionTrigger>
              <AccordionContent>
                <Suspense fallback={<Skeleton className="h-32" />}>
                  <DiffViewer
                    jsonPatchOperations={item.decision?.jsonPatchOperations}
                    mergePatchObject={item.decision?.mergePatchObject}
                  />
                </Suspense>
              </AccordionContent>
            </AccordionItem>
          ) : null}

          <AccordionItem value="artifacts">
            <AccordionTrigger>
              Artifacts ({detail.data.artifacts.length})
            </AccordionTrigger>
            <AccordionContent>
              {detail.data.artifacts.length === 0 ? (
                <MutedState message="No artifacts recorded." />
              ) : (
                <Suspense fallback={<Skeleton className="h-20" />}>
                  <div className="space-y-2">
                    {detail.data.artifacts.map((artifact) => (
                      <ArtifactCard key={artifact.id} artifact={artifact} />
                    ))}
                  </div>
                </Suspense>
              )}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="http">
            <AccordionTrigger>
              HTTP Exchanges ({detail.data.httpExchanges.length})
            </AccordionTrigger>
            <AccordionContent>
              {detail.data.httpExchanges.length === 0 ? (
                <MutedState message="No HTTP exchanges recorded." />
              ) : (
                <Suspense fallback={<Skeleton className="h-20" />}>
                  <div className="space-y-2">
                    {detail.data.httpExchanges.map((exchange) => (
                      <HttpExchangeCard key={exchange.requestId} exchange={exchange} />
                    ))}
                  </div>
                </Suspense>
              )}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="files">
            <AccordionTrigger>
              File Sync ({detail.data.fileSyncAttempts.length})
            </AccordionTrigger>
            <AccordionContent>
              <FileSyncTable attempts={detail.data.fileSyncAttempts} />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="timeline">
            <AccordionTrigger>
              Timeline ({detail.data.stepEvents.length})
            </AccordionTrigger>
            <AccordionContent>
              {detail.data.stepEvents.length === 0 ? (
                <MutedState message="No step events recorded." />
              ) : (
                <div className="space-y-1">
                  {detail.data.stepEvents.map((event) => (
                    <StepEventRow key={event.id} event={event} />
                  ))}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      ) : (
        <MutedState message="Select an item to load its full audit detail." />
      )}
    </div>
  )
}

function StepEventRow({ event }: { event: AuditStepEventRow }) {
  return (
    <div className="flex items-start gap-2 border border-border/70 bg-muted/10 px-3 py-2 text-xs">
      <Badge
        variant={
          event.level === "error"
            ? "destructive"
            : event.level === "warn"
              ? "outline"
              : "secondary"
        }
        className="shrink-0 text-[10px]"
      >
        {event.level}
      </Badge>
      {event.step ? (
        <Badge variant="outline" className="shrink-0 text-[10px]">
          {event.step}
        </Badge>
      ) : null}
      <span className="min-w-0 flex-1">
        <span className="font-medium">{event.event}</span>
        {event.message ? (
          <span className="ml-1 text-muted-foreground">{event.message}</span>
        ) : null}
      </span>
      <span className="shrink-0 text-muted-foreground">{formatDateTime(event.createdAt)}</span>
    </div>
  )
}
