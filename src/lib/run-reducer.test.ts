import { describe, expect, it } from "vitest"

import type { RunSnapshot } from "@/lib/run-types"
import { createRunConsoleState, reduceRunConsoleEvent } from "@/lib/run-reducer"

function buildSnapshot(): RunSnapshot {
  return {
    report: {
      runId: "run-1",
      status: "running",
      mode: "dry-run",
      createdAt: "2026-03-11T10:00:00.000Z",
      startedAt: "2026-03-11T10:00:01.000Z",
      options: {
        dryRun: true,
        prefix: "enriched/**/*.json",
        concurrency: 2,
        fileConcurrency: 1,
        resumeFromCheckpoint: false,
      },
      totals: {
        scanned: 0,
        parsed: 0,
        created: 0,
        updated: 0,
        skipped: 0,
        errored: 0,
        filesUploaded: 0,
        filesSkipped: 0,
      },
      checkpoint: {},
      items: [],
    },
    events: [],
    runtime: {
      activeRunIds: ["run-1"],
      activeRunCount: 1,
      pendingUpdateChains: 0,
    },
    metrics: {
      generatedAt: "2026-03-11T10:00:01.000Z",
      counters: [],
      gauges: [],
      timings: [],
    },
    audit: {
      run: null,
      itemCount: 0,
      stepEventCount: 0,
      artifactCount: 0,
      httpExchangeCount: 0,
      fileSyncAttemptCount: 0,
    },
  }
}

describe("reduceRunConsoleEvent", () => {
  it("merges item-recorded updates into the run snapshot", () => {
    const initialState = createRunConsoleState(buildSnapshot())

    const nextState = reduceRunConsoleEvent(initialState, {
      type: "item-recorded",
      payload: {
        item: {
          key: "enriched/example.json",
          action: "create_dry_run",
          files: {
            listedExisting: 0,
            uploaded: 0,
            skippedExisting: 0,
            failed: 0,
            wouldUpload: 2,
          },
          startedAt: "2026-03-11T10:00:02.000Z",
          finishedAt: "2026-03-11T10:00:03.000Z",
          latencyMs: 1000,
        },
        totals: {
          scanned: 1,
          parsed: 1,
          created: 1,
          updated: 0,
          skipped: 0,
          errored: 0,
          filesUploaded: 0,
          filesSkipped: 0,
        },
        checkpoint: {
          lastProcessedKey: "enriched/example.json",
          updatedAt: "2026-03-11T10:00:03.000Z",
        },
        status: "running",
      },
    })

    expect(nextState.snapshot.report.items).toHaveLength(1)
    expect(nextState.snapshot.report.totals.created).toBe(1)
    expect(nextState.snapshot.report.checkpoint.lastProcessedKey).toBe(
      "enriched/example.json"
    )
    expect(nextState.snapshot.audit.itemCount).toBe(1)
  })

  it("moves the console into the closed state on terminal events", () => {
    const initialState = createRunConsoleState(buildSnapshot())

    const nextState = reduceRunConsoleEvent(initialState, {
      type: "terminal",
      payload: {
        runId: "run-1",
        status: "completed",
      },
    })

    expect(nextState.connectionState).toBe("closed")
    expect(nextState.snapshot.report.status).toBe("completed")
  })
})
