import { format, formatDistanceToNowStrict } from "date-fns"
import { Link, createFileRoute } from "@tanstack/react-router"
import {
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getRunItemDetail, getRunSnapshot } from "@/lib/run.functions"
import { createRunConsoleState, reduceRunConsoleEvent } from "@/lib/run-reducer"
import type {
  RunItemDetail,
  RunItemOutcome,
  RunStreamEvent,
  TelemetryEvent,
} from "@/lib/run-types"
import { RunStatusBadge } from "@/routes/index"

type ItemFilter = "all" | "create" | "update" | "skip" | "error"

export const Route = createFileRoute("/runs/$runId")({
  loader: ({ params }) => getRunSnapshot({ data: { runId: params.runId } }),
  component: RunDetailPage,
})

function RunDetailPage() {
  const snapshot = Route.useLoaderData()
  const { runId } = Route.useParams()
  const [state, setState] = useState(() => createRunConsoleState(snapshot))
  const [selectedKey, setSelectedKey] = useState(() => snapshot.report.items.at(-1)?.key ?? "")
  const [detailsByKey, setDetailsByKey] = useState<
    Record<string, { loading: boolean; data?: RunItemDetail; error?: string }>
  >({})
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<ItemFilter>("all")
  const [streamError, setStreamError] = useState<string>()
  const deferredSearch = useDeferredValue(search)

  const filteredItems = useMemo(() => {
    const normalizedSearch = deferredSearch.trim().toLowerCase()

    return [...state.snapshot.report.items]
      .sort((left, right) => right.startedAt.localeCompare(left.startedAt))
      .filter((item) => {
        if (filter === "create" && !item.action.startsWith("create")) {
          return false
        }

        if (filter === "update" && !item.action.startsWith("update")) {
          return false
        }

        if (filter === "skip" && item.action !== "skip_unchanged") {
          return false
        }

        if (filter === "error" && !isErroredItem(item)) {
          return false
        }

        if (!normalizedSearch) {
          return true
        }

        const haystack = [
          item.key,
          item.externalRef,
          item.optionId ? String(item.optionId) : "",
          item.error,
          item.action,
          item.decision?.reason,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()

        return haystack.includes(normalizedSearch)
      })
  }, [deferredSearch, filter, state.snapshot.report.items])

  const selectedItem =
    filteredItems.find((item) => item.key === selectedKey) ??
    state.snapshot.report.items.find((item) => item.key === selectedKey)

  const selectedDetail = selectedKey ? detailsByKey[selectedKey] : undefined

  useEffect(() => {
    if (!selectedKey && filteredItems[0]) {
      setSelectedKey(filteredItems[0].key)
      return
    }

    if (selectedKey && !state.snapshot.report.items.some((item) => item.key === selectedKey)) {
      setSelectedKey(filteredItems[0]?.key ?? state.snapshot.report.items.at(0)?.key ?? "")
    }
  }, [filteredItems, selectedKey, state.snapshot.report.items])

  useEffect(() => {
    const streamUrl = getRunStreamUrl(runId)
    if (!streamUrl) {
      setStreamError("VITE_UPSERTER_API_BASE_URL is required to open the live stream.")
      setState((current) => ({ ...current, connectionState: "closed" }))
      return
    }

    setStreamError(undefined)
    const source = new EventSource(streamUrl)

    const applyStreamEvent = <T,>(type: RunStreamEvent["type"], payload: T) => {
      startTransition(() => {
        setState((current) =>
          reduceRunConsoleEvent(current, {
            type,
            payload,
          } as RunStreamEvent)
        )
      })
    }

    source.addEventListener("open", () => {
      setState((current) => ({ ...current, connectionState: "live" }))
    })
    source.addEventListener("snapshot", (event) => {
      applyStreamEvent("snapshot", JSON.parse(event.data))
    })
    source.addEventListener("run-status", (event) => {
      applyStreamEvent("run-status", JSON.parse(event.data))
    })
    source.addEventListener("item-recorded", (event) => {
      const payload = JSON.parse(event.data) as Extract<RunStreamEvent, { type: "item-recorded" }>["payload"]
      applyStreamEvent("item-recorded", payload)
      setSelectedKey((current) => current || payload.item.key)
    })
    source.addEventListener("telemetry", (event) => {
      applyStreamEvent("telemetry", JSON.parse(event.data))
    })
    source.addEventListener("heartbeat", (event) => {
      applyStreamEvent("heartbeat", JSON.parse(event.data))
    })
    source.addEventListener("terminal", (event) => {
      applyStreamEvent("terminal", JSON.parse(event.data))
      source.close()
    })
    source.onerror = () => {
      setState((current) => ({
        ...current,
        connectionState:
          current.connectionState === "closed" ? "closed" : "reconnecting",
      }))
    }

    return () => source.close()
  }, [runId])

  useEffect(() => {
    if (!selectedKey || detailsByKey[selectedKey]?.loading || detailsByKey[selectedKey]?.data) {
      return
    }

    let cancelled = false
    setDetailsByKey((current) => ({
      ...current,
      [selectedKey]: {
        ...current[selectedKey],
        loading: true,
      },
    }))

    startTransition(async () => {
      try {
        const detail = await getRunItemDetail({
          data: {
            runId,
            itemKey: selectedKey,
          },
        }) as RunItemDetail
        if (cancelled) {
          return
        }

        setDetailsByKey((current) => ({
          ...current,
          [selectedKey]: {
            loading: false,
            data: detail,
          },
        }))
      } catch (detailError) {
        if (cancelled) {
          return
        }

        setDetailsByKey((current) => ({
          ...current,
          [selectedKey]: {
            loading: false,
            error: detailError instanceof Error ? detailError.message : String(detailError),
          },
        }))
      }
    })

    return () => {
      cancelled = true
    }
  }, [detailsByKey, runId, selectedKey])

  const filterCounts = useMemo(
    () => ({
      all: state.snapshot.report.items.length,
      create: state.snapshot.report.items.filter((item) => item.action.startsWith("create")).length,
      update: state.snapshot.report.items.filter((item) => item.action.startsWith("update")).length,
      skip: state.snapshot.report.items.filter((item) => item.action === "skip_unchanged").length,
      error: state.snapshot.report.items.filter((item) => isErroredItem(item)).length,
    }),
    [state.snapshot.report.items]
  )

  return (
    <div className="min-h-svh bg-[radial-gradient(circle_at_top_left,_rgba(222,116,41,0.2),_transparent_25%),radial-gradient(circle_at_top_right,_rgba(18,61,74,0.28),_transparent_32%),linear-gradient(180deg,_rgba(248,244,238,0.98),_rgba(237,232,225,0.96))]">
      <div className="mx-auto flex min-h-svh max-w-[1640px] flex-col gap-4 px-4 py-5 md:px-6 md:py-6">
        <Card className="border border-foreground/10 bg-background/88 backdrop-blur-sm">
          <CardHeader className="gap-3 border-b border-border/70">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link to="/">Back to dashboard</Link>
                  </Button>
                  <Badge variant="outline">{state.snapshot.report.mode}</Badge>
                  <RunStatusBadge status={state.snapshot.report.status} />
                  <ConnectionBadge state={state.connectionState} />
                </div>
                <CardTitle className="text-3xl leading-none tracking-[-0.04em] md:text-4xl">
                  {state.snapshot.report.runId}
                </CardTitle>
                <CardDescription className="max-w-3xl text-sm">
                  Created {formatRelativeTime(state.snapshot.report.createdAt)}
                  {state.lastHeartbeatAt ? ` · last heartbeat ${formatRelativeTime(state.lastHeartbeatAt)}` : ""}
                  {streamError ? ` · ${streamError}` : ""}
                </CardDescription>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <SummaryMetric label="Scanned" value={state.snapshot.report.totals.scanned} />
                <SummaryMetric label="Created" value={state.snapshot.report.totals.created} />
                <SummaryMetric label="Updated" value={state.snapshot.report.totals.updated} />
                <SummaryMetric label="Errors" value={state.snapshot.report.totals.errored} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 pt-4 lg:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr]">
            <SummaryStrip
              title="Checkpoint"
              value={state.snapshot.report.checkpoint.lastProcessedKey ?? "Waiting for first item"}
              detail={state.snapshot.report.checkpoint.updatedAt ? formatDateTime(state.snapshot.report.checkpoint.updatedAt) : "No checkpoint yet"}
            />
            <SummaryStrip
              title="Duration"
              value={formatRunDuration(
                state.snapshot.report.startedAt,
                state.snapshot.report.finishedAt
              )}
              detail={state.snapshot.report.startedAt ? `Started ${formatDateTime(state.snapshot.report.startedAt)}` : "Queued only"}
            />
            <SummaryStrip
              title="Artifacts"
              value={state.snapshot.audit.artifactCount}
              detail={`${state.snapshot.audit.httpExchangeCount} HTTP exchanges · ${state.snapshot.audit.fileSyncAttemptCount} file steps`}
            />
            <SummaryStrip
              title="Runtime"
              value={state.snapshot.runtime.activeRunCount}
              detail={`${state.snapshot.runtime.pendingUpdateChains} pending update chains`}
            />
          </CardContent>
        </Card>

        <section className="grid min-h-[72svh] gap-px border border-foreground/10 bg-border/70 xl:grid-cols-[0.95fr_1.05fr_1.3fr]">
          <div className="bg-background/86">
            <ScrollArea className="h-[72svh]">
              <div className="space-y-4 p-4">
                <SectionHeader
                  title="Live timeline"
                  description="Every run-scoped telemetry event flowing through the API."
                />
                {state.snapshot.events.length === 0 ? (
                  <MutedState message="No telemetry events yet for this run." />
                ) : (
                  [...state.snapshot.events]
                    .sort((left, right) => right.timestamp.localeCompare(left.timestamp))
                    .map((event) => <TimelineEventCard key={event.id} event={event} />)
                )}
              </div>
            </ScrollArea>
          </div>

          <div className="bg-background/86">
            <ScrollArea className="h-[72svh]">
              <div className="space-y-4 p-4">
                <SectionHeader
                  title="Tender option items"
                  description="Filter by lifecycle outcome, inspect patch decisions, and jump into item detail."
                />

                <div className="space-y-3">
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search by key, external ref, option ID, or error"
                  />
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        ["all", "All"],
                        ["create", "Create"],
                        ["update", "Update"],
                        ["skip", "Skip"],
                        ["error", "Error"],
                      ] as const
                    ).map(([value, label]) => (
                      <Button
                        key={value}
                        type="button"
                        size="sm"
                        variant={filter === value ? "default" : "outline"}
                        onClick={() => setFilter(value)}
                      >
                        {label}
                        <span className="ml-1 text-[10px] uppercase tracking-[0.16em]">
                          {filterCounts[value]}
                        </span>
                      </Button>
                    ))}
                  </div>
                </div>

                {filteredItems.length === 0 ? (
                  <MutedState message="No items match the current filter." />
                ) : (
                  filteredItems.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setSelectedKey(item.key)}
                      className={[
                        "block w-full rounded-none border px-4 py-3 text-left transition-colors",
                        selectedKey === item.key
                          ? "border-primary/35 bg-primary/8"
                          : "border-border/70 bg-muted/12 hover:bg-muted/22",
                      ].join(" ")}
                    >
                      <ItemRow item={item} />
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          <div className="bg-background/86">
            <ScrollArea className="h-[72svh]">
              <div className="space-y-4 p-4">
                <SectionHeader
                  title="Item drilldown"
                  description="Artifacts, API exchanges, file sync attempts, and the exact event trail."
                />

                {selectedItem ? (
                  <>
                    <Card className="border border-foreground/10 bg-background/90">
                      <CardHeader className="gap-2 border-b border-border/70">
                        <div className="flex flex-wrap items-center gap-2">
                          <RunActionBadge action={selectedItem.action} />
                          {selectedItem.optionId ? <Badge variant="outline">Option {selectedItem.optionId}</Badge> : null}
                          {selectedItem.externalRef ? <Badge variant="outline">{selectedItem.externalRef}</Badge> : null}
                        </div>
                        <CardTitle className="break-all text-base tracking-[-0.03em]">
                          {selectedItem.key}
                        </CardTitle>
                        <CardDescription>
                          {selectedItem.decision?.reason ?? "No decision text recorded"}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="grid gap-2 pt-4 sm:grid-cols-2">
                        <SummaryStrip
                          title="Patch strategy"
                          value={selectedItem.audit?.patchStrategy ?? "n/a"}
                          detail={selectedItem.decision?.jsonPatchOperations?.length ? `${selectedItem.decision.jsonPatchOperations.length} json patch ops` : "No patch operations"}
                        />
                        <SummaryStrip
                          title="Files"
                          value={`${selectedItem.files.uploaded} uploaded / ${selectedItem.files.skippedExisting} skipped`}
                          detail={`${selectedItem.files.failed} failed · ${selectedItem.files.wouldUpload} would upload`}
                        />
                        <SummaryStrip
                          title="Latency"
                          value={`${selectedItem.latencyMs}ms`}
                          detail={`${formatDateTime(selectedItem.startedAt)} -> ${formatDateTime(selectedItem.finishedAt)}`}
                        />
                        <SummaryStrip
                          title="Changed paths"
                          value={selectedItem.decision?.jsonPatchOperations?.length ?? 0}
                          detail={selectedItem.error ?? "No terminal error recorded"}
                        />
                      </CardContent>
                    </Card>

                    {selectedDetail?.loading ? (
                      <MutedState message="Loading item detail..." />
                    ) : selectedDetail?.error ? (
                      <MutedState message={selectedDetail.error} tone="error" />
                    ) : selectedDetail?.data ? (
                      <Tabs defaultValue="artifacts">
                        <TabsList variant="line">
                          <TabsTrigger value="artifacts">Artifacts</TabsTrigger>
                          <TabsTrigger value="http">API exchanges</TabsTrigger>
                          <TabsTrigger value="files">Files</TabsTrigger>
                          <TabsTrigger value="timeline">Timeline</TabsTrigger>
                        </TabsList>

                        <TabsContent value="artifacts" className="space-y-3 pt-3">
                          {selectedDetail.data.artifacts.length === 0 ? (
                            <MutedState message="No artifacts recorded for this item." />
                          ) : (
                            selectedDetail.data.artifacts.map((artifact) => (
                              <ArtifactCard key={artifact.id} artifact={artifact} />
                            ))
                          )}
                        </TabsContent>

                        <TabsContent value="http" className="space-y-3 pt-3">
                          {selectedDetail.data.httpExchanges.length === 0 ? (
                            <MutedState message="No HTTP exchanges recorded for this item." />
                          ) : (
                            selectedDetail.data.httpExchanges.map((exchange) => (
                              <HttpExchangeCard key={exchange.requestId} exchange={exchange} />
                            ))
                          )}
                        </TabsContent>

                        <TabsContent value="files" className="space-y-3 pt-3">
                          {selectedDetail.data.fileSyncAttempts.length === 0 ? (
                            <MutedState message="No file sync attempts recorded for this item." />
                          ) : (
                            selectedDetail.data.fileSyncAttempts.map((attempt) => (
                              <FileAttemptCard key={attempt.id} attempt={attempt} />
                            ))
                          )}
                        </TabsContent>

                        <TabsContent value="timeline" className="space-y-3 pt-3">
                          {selectedDetail.data.stepEvents.length === 0 ? (
                            <MutedState message="No step events recorded for this item." />
                          ) : (
                            selectedDetail.data.stepEvents.map((event) => (
                              <StepEventCard key={event.id} event={event} />
                            ))
                          )}
                        </TabsContent>
                      </Tabs>
                    ) : (
                      <MutedState message="Select an item to load its full audit detail." />
                    )}
                  </>
                ) : (
                  <MutedState message="No item selected. Pick a tender option from the center pane." />
                )}
              </div>
            </ScrollArea>
          </div>
        </section>
      </div>
    </div>
  )
}

function SummaryMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-border/70 bg-muted/18 px-4 py-3">
      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl leading-none tracking-[-0.04em]">{value}</p>
    </div>
  )
}

function SummaryStrip({
  title,
  value,
  detail,
}: {
  title: string
  value: number | string
  detail: string
}) {
  return (
    <div className="border border-border/70 bg-muted/16 px-4 py-3">
      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{title}</p>
      <p className="mt-2 break-all text-sm font-medium">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </div>
  )
}

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="space-y-1 border-b border-border/70 pb-3">
      <h2 className="text-sm font-medium uppercase tracking-[0.22em] text-foreground/80">
        {title}
      </h2>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  )
}

function ItemRow({ item }: { item: RunItemOutcome }) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <RunActionBadge action={item.action} />
        {item.optionId ? <Badge variant="outline">Option {item.optionId}</Badge> : null}
        {item.externalRef ? <Badge variant="outline">{item.externalRef}</Badge> : null}
      </div>
      <p className="break-all text-sm font-medium">{item.key}</p>
      <p className="text-xs text-muted-foreground">
        {item.decision?.reason ?? "No decision metadata"} · {item.latencyMs}ms
      </p>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <SummaryStrip
          title="Files"
          value={`${item.files.uploaded}/${item.files.skippedExisting}`}
          detail={`${item.files.failed} failed`}
        />
        <SummaryStrip
          title="Patch"
          value={item.audit?.patchStrategy ?? "n/a"}
          detail={
            item.decision?.jsonPatchOperations?.length
              ? `${item.decision.jsonPatchOperations.length} ops`
              : item.error ?? "No diff ops"
          }
        />
      </div>
    </div>
  )
}

function TimelineEventCard({ event }: { event: TelemetryEvent }) {
  return (
    <div className="border border-border/70 bg-muted/14 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={event.level === "error" ? "destructive" : event.level === "warn" ? "outline" : "secondary"}>
          {event.level}
        </Badge>
        <Badge variant="outline">{event.component}</Badge>
        <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          {formatDateTime(event.timestamp)}
        </span>
      </div>
      <p className="mt-2 font-medium">{event.event}</p>
      {event.message ? <p className="mt-1 text-xs text-muted-foreground">{event.message}</p> : null}
      {event.itemKey ? <p className="mt-2 break-all text-xs text-foreground/75">{event.itemKey}</p> : null}
      {event.data ? <JsonPanel value={event.data} /> : null}
    </div>
  )
}

function ArtifactCard({ artifact }: { artifact: RunItemDetail["artifacts"][number] }) {
  return (
    <Card className="border border-border/70 bg-background/90">
      <CardHeader className="gap-2 border-b border-border/70">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{artifact.step}</Badge>
          <Badge variant="secondary">{artifact.artifactType}</Badge>
        </div>
        <CardDescription>
          {artifact.contentType} · {formatDateTime(artifact.createdAt)}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <JsonPanel value={artifact.payload} />
      </CardContent>
    </Card>
  )
}

function HttpExchangeCard({ exchange }: { exchange: RunItemDetail["httpExchanges"][number] }) {
  return (
    <Card className="border border-border/70 bg-background/90">
      <CardHeader className="gap-2 border-b border-border/70">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{exchange.method}</Badge>
          {exchange.status ? (
            <Badge variant={exchange.status >= 400 ? "destructive" : "secondary"}>
              {exchange.status}
            </Badge>
          ) : null}
          {exchange.step ? <Badge variant="outline">{exchange.step}</Badge> : null}
        </div>
        <CardTitle className="break-all text-sm">{exchange.path}</CardTitle>
        <CardDescription>
          {exchange.durationMs ? `${exchange.durationMs}ms` : "No duration"} · {formatDateTime(exchange.createdAt)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 pt-4">
        {exchange.error ? (
          <div className="border border-destructive/20 bg-destructive/8 px-3 py-2 text-xs text-destructive">
            {exchange.error}
          </div>
        ) : null}
        <JsonPanel label="Request headers" value={exchange.requestHeaders} />
        <JsonPanel label="Request body" value={exchange.requestBody} />
        <JsonPanel label="Response headers" value={exchange.responseHeaders} />
        <JsonPanel label="Response body" value={exchange.responseBody} />
      </CardContent>
    </Card>
  )
}

function FileAttemptCard({ attempt }: { attempt: RunItemDetail["fileSyncAttempts"][number] }) {
  return (
    <Card className="border border-border/70 bg-background/90">
      <CardHeader className="gap-2 border-b border-border/70">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{attempt.stage}</Badge>
          <Badge variant={attempt.status.includes("failed") ? "destructive" : "secondary"}>
            {attempt.status}
          </Badge>
        </div>
        <CardTitle className="break-all text-sm">{attempt.fileName}</CardTitle>
        <CardDescription>{formatDateTime(attempt.createdAt)}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 pt-4">
        {attempt.sourceUrl ? <p className="break-all text-xs text-muted-foreground">{attempt.sourceUrl}</p> : null}
        {attempt.error ? (
          <div className="border border-destructive/20 bg-destructive/8 px-3 py-2 text-xs text-destructive">
            {attempt.error}
          </div>
        ) : null}
        <JsonPanel label="Request" value={attempt.request} />
        <JsonPanel label="Response" value={attempt.response} />
      </CardContent>
    </Card>
  )
}

function StepEventCard({ event }: { event: RunItemDetail["stepEvents"][number] }) {
  return (
    <div className="border border-border/70 bg-muted/14 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={event.level === "error" ? "destructive" : event.level === "warn" ? "outline" : "secondary"}>
          {event.level}
        </Badge>
        {event.step ? <Badge variant="outline">{event.step}</Badge> : null}
        <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          {formatDateTime(event.createdAt)}
        </span>
      </div>
      <p className="mt-2 font-medium">{event.event}</p>
      {event.message ? <p className="mt-1 text-xs text-muted-foreground">{event.message}</p> : null}
      {event.data ? <JsonPanel value={event.data} /> : null}
    </div>
  )
}

function JsonPanel({ label, value }: { label?: string; value: unknown }) {
  if (value === undefined || value === null) {
    return null
  }

  return (
    <div className="space-y-2">
      {label ? (
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      ) : null}
      <pre className="overflow-x-auto border border-border/70 bg-[#10161b] p-3 text-[11px] leading-5 text-[#d8e0e8]">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  )
}

function ConnectionBadge({ state }: { state: "live" | "connecting" | "reconnecting" | "closed" }) {
  const variant =
    state === "live" ? "secondary" : state === "closed" ? "outline" : "default"

  return <Badge variant={variant}>{state}</Badge>
}

function RunActionBadge({ action }: { action: RunItemOutcome["action"] }) {
  const variant =
    action === "skip_unchanged"
      ? "outline"
      : action.includes("error")
        ? "destructive"
        : action.startsWith("update")
          ? "secondary"
          : "default"

  return <Badge variant={variant}>{action.replaceAll("_", " ")}</Badge>
}

function MutedState({ message, tone = "default" }: { message: string; tone?: "default" | "error" }) {
  return (
    <div
      className={[
        "border px-4 py-5 text-sm",
        tone === "error"
          ? "border-destructive/20 bg-destructive/8 text-destructive"
          : "border-border/70 bg-muted/16 text-muted-foreground",
      ].join(" ")}
    >
      {message}
    </div>
  )
}

function formatDateTime(value: string) {
  return format(new Date(value), "dd MMM yyyy HH:mm:ss")
}

function formatRelativeTime(value: string) {
  return formatDistanceToNowStrict(new Date(value), { addSuffix: true })
}

function formatRunDuration(startedAt?: string, finishedAt?: string) {
  if (!startedAt) {
    return "Queued"
  }

  const end = finishedAt ? new Date(finishedAt).getTime() : Date.now()
  const start = new Date(startedAt).getTime()
  return `${Math.max(0, end - start)}ms`
}

function getRunStreamUrl(runId: string) {
  const baseUrl = import.meta.env.VITE_UPSERTER_API_BASE_URL
  if (!baseUrl) {
    return null
  }

  const normalized = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl
  return `${normalized}/observability/runs/${encodeURIComponent(runId)}/stream`
}

function isErroredItem(item: RunItemOutcome) {
  return item.action.includes("error") || Boolean(item.error)
}
