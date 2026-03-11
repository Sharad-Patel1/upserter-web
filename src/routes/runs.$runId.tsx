import { createFileRoute } from "@tanstack/react-router"
import { startTransition, useEffect, useState } from "react"
import { toast } from "sonner"

import type { RunItemDetail, RunSnapshot, RunStreamEvent } from "@/lib/run-types"
import type { ItemFilters } from "@/lib/filters"
import { Button } from "@/components/ui/button"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { RunHeader } from "@/components/run/run-header"
import { ItemsBrowser } from "@/components/run/items-browser"
import { ItemDetailPanel } from "@/components/run/item-detail-panel"
import { ActivityFeed } from "@/components/run/activity-feed"
import {
  getRunItemDetail,
  getRunSnapshot,
  getRunStreamBaseUrl,
} from "@/lib/run.functions"
import { createRunConsoleState, reduceRunConsoleEvent } from "@/lib/run-reducer"
import { DEFAULT_FILTERS } from "@/lib/filters"

type ItemDetailState = { loading: boolean; data?: RunItemDetail; error?: string }
type MainView = "items" | "activity"

export const Route = createFileRoute("/runs/$runId")({
  loader: async ({ params }) => {
    const [snapshot, streamBaseUrl] = await Promise.all([
      getRunSnapshot({ data: { runId: params.runId } }),
      getRunStreamBaseUrl(),
    ])
    return { snapshot, streamBaseUrl }
  },
  component: RunDetailPage,
})

function RunDetailPage() {
  const { snapshot: initialSnapshot, streamBaseUrl } = Route.useLoaderData()
  const { runId } = Route.useParams()
  const [state, setState] = useState(() => createRunConsoleState(initialSnapshot))
  const [mainView, setMainView] = useState<MainView>("items")
  const [selectedKey, setSelectedKey] = useState(
    () => initialSnapshot.report.items.at(-1)?.key ?? ""
  )
  const [detailsByKey, setDetailsByKey] = useState<Record<string, ItemDetailState>>({})
  const [filters, setFilters] = useState<ItemFilters>(DEFAULT_FILTERS)
  const [streamError, setStreamError] = useState<string>()

  const selectedItem = state.snapshot.report.items.find((item) => item.key === selectedKey)
  const selectedDetail = selectedKey ? detailsByKey[selectedKey] : undefined

  // ── SSE connection management ──────────────────────────────────────
  useEffect(() => {
    let closed = false
    let terminal = isTerminalStatus(initialSnapshot.report.status)
    let reconnectTimer: number | undefined
    const resolvedBaseUrl = resolveStreamBaseUrl(streamBaseUrl)

    const applyStreamEvent = (event: RunStreamEvent) => {
      startTransition(() => {
        setState((current) => reduceRunConsoleEvent(current, event))
      })
    }

    const connect = () => {
      if (closed) return

      if (!resolvedBaseUrl) {
        setStreamError("Live stream base URL is unavailable. Falling back to polling.")
        setState((current) => ({ ...current, connectionState: "reconnecting" }))
        return
      }

      setState((current) => ({
        ...current,
        connectionState: current.connectionState === "closed" ? "closed" : "connecting",
      }))
      setStreamError(undefined)

      const source = new EventSource(
        `${resolvedBaseUrl}/observability/runs/${encodeURIComponent(runId)}/stream`
      )

      source.addEventListener("open", () => {
        if (closed) { source.close(); return }
        setStreamError(undefined)
        setState((current) => ({ ...current, connectionState: "live" }))
      })

      source.addEventListener("snapshot", (event) => {
        applyStreamEvent({
          type: "snapshot",
          payload: JSON.parse(event.data) as RunSnapshot,
        })
      })

      source.addEventListener("run-status", (event) => {
        applyStreamEvent({
          type: "run-status",
          payload: JSON.parse(event.data) as Extract<RunStreamEvent, { type: "run-status" }>["payload"],
        })
      })

      source.addEventListener("item-recorded", (event) => {
        const payload = JSON.parse(event.data) as Extract<RunStreamEvent, { type: "item-recorded" }>["payload"]
        applyStreamEvent({ type: "item-recorded", payload })
        setSelectedKey((current) => current || payload.item.key)
      })

      source.addEventListener("telemetry", (event) => {
        applyStreamEvent({
          type: "telemetry",
          payload: JSON.parse(event.data) as Extract<RunStreamEvent, { type: "telemetry" }>["payload"],
        })
      })

      source.addEventListener("heartbeat", (event) => {
        applyStreamEvent({
          type: "heartbeat",
          payload: JSON.parse(event.data) as Extract<RunStreamEvent, { type: "heartbeat" }>["payload"],
        })
      })

      source.addEventListener("terminal", (event) => {
        terminal = true
        const payload = JSON.parse(event.data) as Extract<RunStreamEvent, { type: "terminal" }>["payload"]
        applyStreamEvent({ type: "terminal", payload })
        closed = true
        source.close()

        if (payload.status === "completed") {
          toast.success("Run completed", { description: `Run ${runId.slice(0, 8)}... finished successfully.` })
        } else if (payload.status === "failed") {
          toast.error("Run failed", { description: `Run ${runId.slice(0, 8)}... failed.` })
        }
      })

      source.onerror = () => {
        source.close()
        if (closed || terminal) return
        setStreamError("Live stream interrupted. Retrying and polling until it returns.")
        setState((current) => ({
          ...current,
          connectionState: current.connectionState === "closed" ? "closed" : "reconnecting",
        }))
        reconnectTimer = window.setTimeout(connect, 2_000)
      }
    }

    connect()
    return () => {
      closed = true
      if (reconnectTimer) window.clearTimeout(reconnectTimer)
    }
  }, [initialSnapshot.report.status, runId, streamBaseUrl])

  // ── Polling fallback ───────────────────────────────────────────────
  useEffect(() => {
    if (state.connectionState === "live" || isTerminalStatus(state.snapshot.report.status)) return

    let cancelled = false
    const interval = window.setInterval(() => {
      startTransition(async () => {
        try {
          const freshSnapshot = await getRunSnapshot({ data: { runId } })
          if (cancelled) return
          setState((current) => ({
            ...current,
            snapshot: freshSnapshot,
            connectionState: isTerminalStatus(freshSnapshot.report.status) ? "closed" : current.connectionState,
          }))
        } catch {
          // Keep last good state while retrying.
        }
      })
    }, 2_500)

    return () => { cancelled = true; window.clearInterval(interval) }
  }, [runId, state.connectionState, state.snapshot.report.status])

  // ── Item detail fetching ───────────────────────────────────────────
  useEffect(() => {
    if (!selectedKey) return

    const gate = { skip: false }
    setDetailsByKey((current) => {
      const existing = current[selectedKey] as ItemDetailState | undefined
      if (existing && (existing.loading || existing.data)) {
        gate.skip = true
        return current
      }
      return {
        ...current,
        [selectedKey]: { loading: true },
      }
    })

    if (gate.skip) return

    let cancelled = false

    startTransition(async () => {
      try {
        const detail = await getRunItemDetail({ data: { runId, itemKey: selectedKey } })
        if (cancelled) return
        setDetailsByKey((current) => ({
          ...current,
          [selectedKey]: { loading: false, data: detail },
        }))
      } catch (detailError) {
        if (cancelled) return
        setDetailsByKey((current) => ({
          ...current,
          [selectedKey]: { loading: false, error: detailError instanceof Error ? detailError.message : String(detailError) },
        }))
      }
    })

    return () => { cancelled = true }
  }, [runId, selectedKey])

  // ── Auto-select first item ─────────────────────────────────────────
  useEffect(() => {
    if (!selectedKey && state.snapshot.report.items.length > 0) {
      setSelectedKey(state.snapshot.report.items[state.snapshot.report.items.length - 1].key)
    }
  }, [selectedKey, state.snapshot.report.items])

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* ── Compact header ──────────────────────────────────────── */}
      <div className="shrink-0 border-b border-border/50 px-4 py-2.5 md:px-5">
        <RunHeader
          snapshot={state.snapshot}
          connectionState={state.connectionState}
          lastHeartbeatAt={state.lastHeartbeatAt}
          streamError={streamError}
        />
      </div>

      {/* ── View tabs ───────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center gap-1.5 border-b border-border/50 px-4 py-1.5 md:px-5">
        <Button
          size="sm"
          variant={mainView === "items" ? "default" : "ghost"}
          className="h-7 text-xs"
          onClick={() => setMainView("items")}
        >
          Items
          <span className="ml-1 tabular-nums text-[10px] opacity-70">
            {state.snapshot.report.items.length}
          </span>
        </Button>
        <Button
          size="sm"
          variant={mainView === "activity" ? "default" : "ghost"}
          className="h-7 text-xs"
          onClick={() => setMainView("activity")}
        >
          Activity
          <span className="ml-1 tabular-nums text-[10px] opacity-70">
            {state.snapshot.events.length}
          </span>
        </Button>
      </div>

      {/* ── Main content area ───────────────────────────────────── */}
      <div className="min-h-0 flex-1">
        {mainView === "items" ? (
          <ResizablePanelGroup orientation="horizontal" className="h-full">
            <ResizablePanel defaultSize={50} minSize={30}>
              <div className="flex h-full flex-col overflow-hidden">
                <div className="min-h-0 flex-1 overflow-auto px-3 py-2">
                  <ItemsBrowser
                    items={state.snapshot.report.items}
                    selectedKey={selectedKey}
                    onSelectItem={setSelectedKey}
                    filters={filters}
                    onFiltersChange={setFilters}
                  />
                </div>
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={50} minSize={25}>
              <div className="h-full overflow-hidden">
                <ItemDetailPanel item={selectedItem ?? null} detail={selectedDetail} />
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : (
          <div className="h-full overflow-hidden p-3">
            <ActivityFeed
              events={state.snapshot.events}
              connectionState={state.connectionState}
            />
          </div>
        )}
      </div>
    </div>
  )
}

function resolveStreamBaseUrl(serverValue: string | null) {
  if (serverValue) {
    return serverValue.endsWith("/") ? serverValue.slice(0, -1) : serverValue
  }

  if (typeof window === "undefined") return null

  const { origin, hostname, protocol, port } = window.location
  if (port === "3001") return `${protocol}//${hostname}:3000`
  return origin
}

function isTerminalStatus(status: string) {
  return status === "completed" || status === "failed" || status === "cancelled"
}
