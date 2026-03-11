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
import { MutedState } from "@/components/run/run-metrics"
import { FileSyncTable } from "@/components/data/file-sync-table"
import { FilePreviewGallery } from "@/components/data/file-preview"
import { formatDateTime, formatLatency, parseItemKey } from "@/lib/format"
import { cn } from "@/lib/utils"

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
    return (
      <div className="flex h-full items-center justify-center p-4">
        <p className="text-sm text-muted-foreground">Select an item to view details</p>
      </div>
    )
  }

  const latency = formatLatency(item.latencyMs)
  const parsed = parseItemKey(item.key)

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* ── Fixed header ─────────────────────────────────────────── */}
      <div className="shrink-0 space-y-1.5 border-b border-border/50 px-3 py-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <RunActionBadge action={item.action} />
          {item.optionId ? <Badge variant="outline" className="text-[10px]">Opt {item.optionId}</Badge> : null}
          {item.externalRef ? <Badge variant="outline" className="text-[10px]">{item.externalRef}</Badge> : null}
          <span
            className={cn(
              "ml-auto font-mono text-[11px]",
              latency.tone === "fast" && "text-emerald-600",
              latency.tone === "medium" && "text-amber-600",
              latency.tone === "slow" && "text-red-600"
            )}
          >
            {latency.text}
          </span>
        </div>
        <h3 className="text-sm font-semibold leading-snug tracking-tight">{parsed.productName}</h3>
        <p className="break-all font-mono text-[10px] leading-snug text-muted-foreground/50">{item.key}</p>
        {item.decision?.reason ? (
          <p className="text-[11px] text-muted-foreground">{item.decision.reason}</p>
        ) : null}
        {item.error ? (
          <div className="rounded-sm border border-destructive/20 bg-destructive/8 px-2 py-1.5 text-[11px] text-destructive">
            {item.error}
          </div>
        ) : null}
      </div>

      {/* ── Quick stats ──────────────────────────────────────────── */}
      <div className="grid shrink-0 grid-cols-3 border-b border-border/50 divide-x divide-border/50">
        <QuickStat label="Patch" value={item.audit?.patchStrategy ?? "none"} />
        <QuickStat label="Files" value={`${item.files.uploaded}up ${item.files.failed}fail`} />
        <QuickStat
          label="Ops"
          value={String(item.decision?.jsonPatchOperations?.length ?? 0)}
        />
      </div>

      {/* ── Scrollable detail ────────────────────────────────────── */}
      <div className="min-h-0 flex-1 overflow-auto">
        {detail?.loading ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-xs text-muted-foreground">Loading detail...</p>
          </div>
        ) : detail?.error ? (
          <div className="p-3">
            <MutedState message={detail.error} tone="error" />
          </div>
        ) : detail?.data ? (
          <Accordion type="multiple" defaultValue={["files-preview", "decision", "artifacts"]} className="px-3 py-2">
            {detail.data.fileSyncAttempts.length > 0 ? (
              <AccordionItem value="files-preview">
                <AccordionTrigger className="py-2 text-xs">
                  File Gallery ({detail.data.fileSyncAttempts.length})
                </AccordionTrigger>
                <AccordionContent>
                  <FilePreviewGallery attempts={detail.data.fileSyncAttempts} />
                </AccordionContent>
              </AccordionItem>
            ) : null}

            {(item.decision?.jsonPatchOperations?.length ?? 0) > 0 ||
            (item.decision?.mergePatchObject &&
              Object.keys(item.decision.mergePatchObject).length > 0) ? (
              <AccordionItem value="decision">
                <AccordionTrigger className="py-2 text-xs">Decision & Diff</AccordionTrigger>
                <AccordionContent>
                  <Suspense fallback={<Skeleton className="h-24" />}>
                    <DiffViewer
                      jsonPatchOperations={item.decision?.jsonPatchOperations}
                      mergePatchObject={item.decision?.mergePatchObject}
                    />
                  </Suspense>
                </AccordionContent>
              </AccordionItem>
            ) : null}

            <AccordionItem value="artifacts">
              <AccordionTrigger className="py-2 text-xs">
                Artifacts ({detail.data.artifacts.length})
              </AccordionTrigger>
              <AccordionContent>
                {detail.data.artifacts.length === 0 ? (
                  <p className="py-2 text-[11px] text-muted-foreground">No artifacts recorded.</p>
                ) : (
                  <Suspense fallback={<Skeleton className="h-16" />}>
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
              <AccordionTrigger className="py-2 text-xs">
                HTTP ({detail.data.httpExchanges.length})
              </AccordionTrigger>
              <AccordionContent>
                {detail.data.httpExchanges.length === 0 ? (
                  <p className="py-2 text-[11px] text-muted-foreground">No HTTP exchanges.</p>
                ) : (
                  <Suspense fallback={<Skeleton className="h-16" />}>
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
              <AccordionTrigger className="py-2 text-xs">
                File Sync ({detail.data.fileSyncAttempts.length})
              </AccordionTrigger>
              <AccordionContent>
                <FileSyncTable attempts={detail.data.fileSyncAttempts} />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="timeline">
              <AccordionTrigger className="py-2 text-xs">
                Timeline ({detail.data.stepEvents.length})
              </AccordionTrigger>
              <AccordionContent>
                {detail.data.stepEvents.length === 0 ? (
                  <p className="py-2 text-[11px] text-muted-foreground">No step events.</p>
                ) : (
                  <div className="space-y-0.5">
                    {detail.data.stepEvents.map((event) => (
                      <StepEventRow key={event.id} event={event} />
                    ))}
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        ) : (
          <div className="flex items-center justify-center py-8">
            <p className="text-xs text-muted-foreground">Select an item to load audit detail.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function QuickStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-3 py-1.5">
      <p className="text-[9px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="text-[11px] font-medium">{value}</p>
    </div>
  )
}

function StepEventRow({ event }: { event: AuditStepEventRow }) {
  return (
    <div className="flex items-start gap-1.5 py-1 text-[11px]">
      <Badge
        variant={
          event.level === "error"
            ? "destructive"
            : event.level === "warn"
              ? "outline"
              : "secondary"
        }
        className="shrink-0 text-[8px]"
      >
        {event.level}
      </Badge>
      {event.step ? (
        <Badge variant="outline" className="shrink-0 text-[8px]">
          {event.step}
        </Badge>
      ) : null}
      <span className="min-w-0 flex-1">
        <span className="font-medium">{event.event}</span>
        {event.message ? (
          <span className="ml-1 text-muted-foreground">{event.message}</span>
        ) : null}
      </span>
      <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
        {formatDateTime(event.createdAt)}
      </span>
    </div>
  )
}
