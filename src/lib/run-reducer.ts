import type { RunItemOutcome, RunSnapshot, RunStreamEvent, TelemetryEvent } from "@/lib/run-types"

export interface RunConsoleState {
  snapshot: RunSnapshot
  connectionState: "live" | "connecting" | "reconnecting" | "closed"
  lastHeartbeatAt?: string
}

function dedupeTelemetry(events: TelemetryEvent[]) {
  return [...new Map(events.map((event) => [event.id, event])).values()].sort((left, right) =>
    left.timestamp.localeCompare(right.timestamp)
  )
}

function upsertItem(items: RunItemOutcome[], item: RunItemOutcome) {
  const nextItems = items.filter((current) => current.key !== item.key)
  nextItems.push(item)
  nextItems.sort((left, right) => left.startedAt.localeCompare(right.startedAt))
  return nextItems
}

export function createRunConsoleState(snapshot: RunSnapshot): RunConsoleState {
  return {
    snapshot,
    connectionState:
      snapshot.report.status === "completed" ||
      snapshot.report.status === "failed" ||
      snapshot.report.status === "cancelled"
        ? "closed"
        : "connecting",
  }
}

export function reduceRunConsoleEvent(
  state: RunConsoleState,
  event: RunStreamEvent
): RunConsoleState {
  switch (event.type) {
    case "snapshot":
      return {
        ...state,
        snapshot: event.payload,
        connectionState:
          event.payload.report.status === "completed" ||
          event.payload.report.status === "failed" ||
          event.payload.report.status === "cancelled"
            ? "closed"
            : "live",
      }
    case "run-status":
      return {
        ...state,
        snapshot: {
          ...state.snapshot,
          report: event.payload.report,
          audit: {
            ...state.snapshot.audit,
            run: event.payload.report,
            itemCount: event.payload.report.items.length,
          },
        },
      }
    case "item-recorded":
      return {
        ...state,
        snapshot: {
          ...state.snapshot,
          report: {
            ...state.snapshot.report,
            status: event.payload.status,
            totals: event.payload.totals,
            checkpoint: event.payload.checkpoint,
            items: upsertItem(state.snapshot.report.items, event.payload.item),
          },
          audit: {
            ...state.snapshot.audit,
            itemCount: upsertItem(state.snapshot.report.items, event.payload.item).length,
          },
        },
      }
    case "telemetry":
      return {
        ...state,
        snapshot: {
          ...state.snapshot,
          events: dedupeTelemetry([...state.snapshot.events, event.payload]),
        },
      }
    case "heartbeat":
      return {
        ...state,
        connectionState: "live",
        lastHeartbeatAt: event.payload.timestamp,
      }
    case "terminal":
      return {
        ...state,
        connectionState: "closed",
        snapshot: {
          ...state.snapshot,
          report: {
            ...state.snapshot.report,
            status: event.payload.status,
          },
        },
      }
    default:
      return state
  }
}
