export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue }

export type RunStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled"

export type UpsertAction =
  | "create"
  | "create_dry_run"
  | "update"
  | "update_dry_run"
  | "skip_unchanged"
  | "error_missing_identity"
  | "error_duplicate_identity"
  | "error_validation"
  | "error_runtime"

export interface AppliedRunOptions {
  dryRun: boolean
  prefix: string
  limit?: number
  startAfter?: string
  concurrency: number
  fileConcurrency: number
  resumeFromCheckpoint: boolean
}

export interface JsonPatchOperation {
  op: "add" | "remove" | "replace"
  path: string
  value?: JsonValue
}

export interface RunDecision {
  action: "create" | "update" | "skip_unchanged"
  reason: string
  optionId?: number
  jsonPatchOperations?: JsonPatchOperation[]
  mergePatchObject?: { [key: string]: JsonValue }
}

export interface FileSyncSummary {
  listedExisting: number
  uploaded: number
  skippedExisting: number
  failed: number
  wouldUpload: number
}

export interface ItemAudit {
  mappedPayloadHash?: string
  jsonPatchHash?: string
  mergePayloadHash?: string
  responseId?: number
  patchStrategy?: "json-patch" | "merge-object"
}

export interface RunItemOutcome {
  key: string
  externalRef?: string
  action: UpsertAction
  decision?: RunDecision
  optionId?: number
  files: FileSyncSummary
  error?: string
  startedAt: string
  finishedAt: string
  latencyMs: number
  audit?: ItemAudit
}

export interface RunTotals {
  scanned: number
  parsed: number
  created: number
  updated: number
  skipped: number
  errored: number
  filesUploaded: number
  filesSkipped: number
}

export interface RunCheckpoint {
  lastProcessedKey?: string
  updatedAt?: string
}

export interface RunReport {
  runId: string
  status: RunStatus
  mode: "dry-run" | "apply"
  startedAt?: string
  finishedAt?: string
  createdAt: string
  options: AppliedRunOptions
  totals: RunTotals
  checkpoint: RunCheckpoint
  items: RunItemOutcome[]
  error?: string
}

export interface RunListEntry {
  runId: string
  status: RunStatus
  mode: RunReport["mode"]
  createdAt: string
  startedAt?: string
  finishedAt?: string
  options: AppliedRunOptions
  totals: RunTotals
  checkpoint: RunCheckpoint
  itemCount: number
  error?: string
}

export interface MetricCounter {
  name: string
  tags: Record<string, string>
  value: number
  updatedAt: string
}

export interface MetricGauge extends MetricCounter {}

export interface MetricTiming {
  name: string
  tags: Record<string, string>
  count: number
  totalMs: number
  minMs: number
  maxMs: number
  lastMs: number
  avgMs: number
  updatedAt: string
}

export interface TelemetryEvent {
  id: string
  timestamp: string
  level: "debug" | "info" | "warn" | "error"
  component: string
  event: string
  traceId?: string
  requestId?: string
  runId?: string
  itemKey?: string
  externalRef?: string
  optionId?: number
  message?: string
  durationMs?: number
  data?: { [key: string]: JsonValue }
}

export interface RunSnapshot {
  report: RunReport
  events: TelemetryEvent[]
  runtime: {
    activeRunIds: string[]
    activeRunCount: number
    pendingUpdateChains: number
  }
  metrics: {
    generatedAt: string
    counters: MetricCounter[]
    gauges: MetricGauge[]
    timings: MetricTiming[]
  }
  audit: {
    run: RunReport | null
    itemCount: number
    stepEventCount: number
    artifactCount: number
    httpExchangeCount: number
    fileSyncAttemptCount: number
  }
}

export interface AuditStepEventRow {
  id: string
  runId: string
  itemKey?: string
  externalRef?: string
  optionId?: number
  step?: string
  component: string
  event: string
  level: "debug" | "info" | "warn" | "error"
  message?: string
  durationMs?: number
  data?: { [key: string]: JsonValue }
  createdAt: string
}

export interface AuditArtifactRow {
  id: string
  runId: string
  itemKey?: string
  externalRef?: string
  optionId?: number
  step: string
  artifactType: string
  contentType: string
  sha256: string
  payload: JsonValue
  createdAt: string
}

export interface AuditHttpExchangeRow {
  requestId: string
  runId?: string
  itemKey?: string
  externalRef?: string
  optionId?: number
  step?: string
  method: string
  path: string
  url: string
  attempt: number
  status?: number
  requestHeaders?: { [key: string]: JsonValue }
  requestBody?: JsonValue
  responseHeaders?: { [key: string]: JsonValue }
  responseBody?: JsonValue
  durationMs?: number
  error?: string
  createdAt: string
}

export interface AuditFileSyncAttemptRow {
  id: string
  runId: string
  itemKey: string
  externalRef?: string
  optionId?: number
  stage: string
  status: string
  fileName: string
  sourceUrl?: string
  request?: JsonValue
  response?: JsonValue
  error?: string
  createdAt: string
}

export interface RunItemDetail {
  item: RunItemOutcome | null
  stepEvents: AuditStepEventRow[]
  artifacts: AuditArtifactRow[]
  httpExchanges: AuditHttpExchangeRow[]
  fileSyncAttempts: AuditFileSyncAttemptRow[]
}

export interface StartRunInput {
  dryRun: boolean
  prefix?: string
  limit?: number
  startAfter?: string
  concurrency: number
  fileConcurrency: number
  resumeFromCheckpoint: boolean
}

export interface StartRunResponse {
  runId: string
  accepted: true
  mode: "dry-run" | "apply"
}

export type RunStreamEvent =
  | {
      type: "snapshot"
      payload: RunSnapshot
    }
  | {
      type: "run-status"
      payload: {
        report: RunReport
      }
    }
  | {
      type: "item-recorded"
      payload: {
        item: RunItemOutcome
        totals: RunTotals
        checkpoint: RunCheckpoint
        status: RunStatus
      }
    }
  | {
      type: "telemetry"
      payload: TelemetryEvent
    }
  | {
      type: "heartbeat"
      payload: {
        timestamp: string
      }
    }
  | {
      type: "terminal"
      payload: {
        runId: string
        status: Extract<RunStatus, "completed" | "failed" | "cancelled">
      }
    }
