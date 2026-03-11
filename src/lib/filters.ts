import type { RunItemOutcome, UpsertAction } from "@/lib/run-types"

export interface ItemFilters {
  actions: Array<UpsertAction>
  hasError: boolean | null
  hasFiles: "any" | "has-uploads" | "has-failures" | "no-files"
  latencyRange: "any" | "fast" | "medium" | "slow" | "custom"
  latencyMin?: number
  latencyMax?: number
  search: string
  patchStrategy: "any" | "json-patch" | "merge-object" | "none"
  hasDiffChanges: boolean | null
  fileSyncStatus: "any" | "all-uploaded" | "some-failed" | "none-attempted"
  sortField: "key" | "action" | "latencyMs" | "startedAt" | "files"
  sortDirection: "asc" | "desc"
  page: number
  pageSize: number
}

export const DEFAULT_FILTERS: ItemFilters = {
  actions: [],
  hasError: null,
  hasFiles: "any",
  latencyRange: "any",
  search: "",
  patchStrategy: "any",
  hasDiffChanges: null,
  fileSyncStatus: "any",
  sortField: "startedAt",
  sortDirection: "desc",
  page: 1,
  pageSize: 50,
}

function matchesAction(item: RunItemOutcome, actions: Array<UpsertAction>) {
  if (actions.length === 0) return true
  return actions.some((action) => {
    if (action === "create") return item.action.startsWith("create")
    if (action === "update") return item.action.startsWith("update")
    return item.action === action
  })
}

function matchesSearch(item: RunItemOutcome, search: string) {
  if (!search) return true
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
  return haystack.includes(search.toLowerCase())
}

function matchesLatency(item: RunItemOutcome, filters: ItemFilters) {
  switch (filters.latencyRange) {
    case "any": return true
    case "fast": return item.latencyMs < 100
    case "medium": return item.latencyMs >= 100 && item.latencyMs < 500
    case "slow": return item.latencyMs >= 500
    case "custom": {
      if (filters.latencyMin !== undefined && item.latencyMs < filters.latencyMin) return false
      if (filters.latencyMax !== undefined && item.latencyMs > filters.latencyMax) return false
      return true
    }
  }
}

function matchesHasError(item: RunItemOutcome, hasError: boolean | null) {
  if (hasError === null) return true
  const isErrored = item.action.includes("error") || Boolean(item.error)
  return hasError === isErrored
}

function matchesHasFiles(item: RunItemOutcome, hasFiles: ItemFilters["hasFiles"]) {
  switch (hasFiles) {
    case "any": return true
    case "has-uploads": return item.files.uploaded > 0
    case "has-failures": return item.files.failed > 0
    case "no-files":
      return item.files.uploaded === 0 && item.files.failed === 0 && item.files.skippedExisting === 0
  }
}

function matchesPatchStrategy(item: RunItemOutcome, strategy: ItemFilters["patchStrategy"]) {
  if (strategy === "any") return true
  if (strategy === "none") return !item.audit?.patchStrategy
  return item.audit?.patchStrategy === strategy
}

function matchesDiffChanges(item: RunItemOutcome, hasDiff: boolean | null) {
  if (hasDiff === null) return true
  const hasPatchOps =
    (item.decision?.jsonPatchOperations?.length ?? 0) > 0 ||
    (item.decision?.mergePatchObject && Object.keys(item.decision.mergePatchObject).length > 0)
  return hasDiff === Boolean(hasPatchOps)
}

function matchesFileSyncStatus(item: RunItemOutcome, status: ItemFilters["fileSyncStatus"]) {
  switch (status) {
    case "any": return true
    case "none-attempted":
      return item.files.uploaded + item.files.failed + item.files.skippedExisting === 0
    case "all-uploaded":
      return item.files.uploaded > 0 && item.files.failed === 0
    case "some-failed":
      return item.files.failed > 0
  }
}

function compareItems(
  a: RunItemOutcome,
  b: RunItemOutcome,
  field: ItemFilters["sortField"],
  dir: ItemFilters["sortDirection"]
) {
  let cmp = 0
  switch (field) {
    case "key":
      cmp = a.key.localeCompare(b.key)
      break
    case "action":
      cmp = a.action.localeCompare(b.action)
      break
    case "latencyMs":
      cmp = a.latencyMs - b.latencyMs
      break
    case "startedAt":
      cmp = a.startedAt.localeCompare(b.startedAt)
      break
    case "files":
      cmp = a.files.uploaded + a.files.failed - (b.files.uploaded + b.files.failed)
      break
  }
  return dir === "asc" ? cmp : -cmp
}

export function applyItemFilters(
  items: Array<RunItemOutcome>,
  filters: ItemFilters
): {
  filtered: Array<RunItemOutcome>
  page: Array<RunItemOutcome>
  totalPages: number
} {
  const filtered = items.filter(
    (item) =>
      matchesAction(item, filters.actions) &&
      matchesSearch(item, filters.search) &&
      matchesLatency(item, filters) &&
      matchesHasError(item, filters.hasError) &&
      matchesHasFiles(item, filters.hasFiles) &&
      matchesPatchStrategy(item, filters.patchStrategy) &&
      matchesDiffChanges(item, filters.hasDiffChanges) &&
      matchesFileSyncStatus(item, filters.fileSyncStatus)
  )

  filtered.sort((a, b) => compareItems(a, b, filters.sortField, filters.sortDirection))

  const totalPages = Math.max(1, Math.ceil(filtered.length / filters.pageSize))
  const safePage = Math.min(Math.max(1, filters.page), totalPages)
  const start = (safePage - 1) * filters.pageSize
  const page = filtered.slice(start, start + filters.pageSize)

  return { filtered, page, totalPages }
}

export function serializeFilters(filters: ItemFilters): Record<string, string> {
  const params: Record<string, string> = {}
  if (filters.actions.length > 0) params.actions = filters.actions.join(",")
  if (filters.hasError !== null) params.hasError = String(filters.hasError)
  if (filters.hasFiles !== "any") params.hasFiles = filters.hasFiles
  if (filters.latencyRange !== "any") params.latencyRange = filters.latencyRange
  if (filters.latencyMin !== undefined) params.latencyMin = String(filters.latencyMin)
  if (filters.latencyMax !== undefined) params.latencyMax = String(filters.latencyMax)
  if (filters.search) params.search = filters.search
  if (filters.patchStrategy !== "any") params.patchStrategy = filters.patchStrategy
  if (filters.hasDiffChanges !== null) params.hasDiffChanges = String(filters.hasDiffChanges)
  if (filters.fileSyncStatus !== "any") params.fileSyncStatus = filters.fileSyncStatus
  if (filters.sortField !== "startedAt") params.sortField = filters.sortField
  if (filters.sortDirection !== "desc") params.sortDirection = filters.sortDirection
  if (filters.page !== 1) params.page = String(filters.page)
  if (filters.pageSize !== 50) params.pageSize = String(filters.pageSize)
  return params
}

export function deserializeFilters(params: Record<string, string>): Partial<ItemFilters> {
  const result: Partial<ItemFilters> = {}
  if (params.actions) result.actions = params.actions.split(",") as Array<UpsertAction>
  if (params.hasError) result.hasError = params.hasError === "true"
  if (params.hasFiles) result.hasFiles = params.hasFiles as ItemFilters["hasFiles"]
  if (params.latencyRange) result.latencyRange = params.latencyRange as ItemFilters["latencyRange"]
  if (params.latencyMin) result.latencyMin = Number(params.latencyMin)
  if (params.latencyMax) result.latencyMax = Number(params.latencyMax)
  if (params.search) result.search = params.search
  if (params.patchStrategy) result.patchStrategy = params.patchStrategy as ItemFilters["patchStrategy"]
  if (params.hasDiffChanges) result.hasDiffChanges = params.hasDiffChanges === "true"
  if (params.fileSyncStatus) result.fileSyncStatus = params.fileSyncStatus as ItemFilters["fileSyncStatus"]
  if (params.sortField) result.sortField = params.sortField as ItemFilters["sortField"]
  if (params.sortDirection) result.sortDirection = params.sortDirection as ItemFilters["sortDirection"]
  if (params.page) result.page = Number(params.page)
  if (params.pageSize) result.pageSize = Number(params.pageSize)
  return result
}

export function getQuickFilterCounts(items: Array<RunItemOutcome>) {
  return {
    all: items.length,
    create: items.filter((i) => i.action.startsWith("create")).length,
    update: items.filter((i) => i.action.startsWith("update")).length,
    skip: items.filter((i) => i.action === "skip_unchanged").length,
    error: items.filter((i) => i.action.includes("error") || Boolean(i.error)).length,
  }
}
