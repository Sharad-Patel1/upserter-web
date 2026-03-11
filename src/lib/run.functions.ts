import { createServerFn } from "@tanstack/react-start"

import type {
  HealthResponse,
  RunItemDetail,
  RunListEntry,
  RunSnapshot,
  StartRunInput,
  StartRunResponse,
} from "@/lib/run-types"
import { upserterApiRequest } from "@/lib/upserter-api.server"

export const listRuns = createServerFn({ method: "GET" })
  .inputValidator((data: { limit?: number } | undefined) => data ?? {})
  .handler(async ({ data }) => {
    const search = new URLSearchParams()
    if (data.limit) {
      search.set("limit", String(data.limit))
    }

    const suffix = search.size > 0 ? `?${search.toString()}` : ""
    return upserterApiRequest<Array<RunListEntry>>(`/upserts/tender-options/runs${suffix}`)
  })

export const getRunSnapshot = createServerFn({ method: "GET" })
  .inputValidator((data: { runId: string }) => data)
  .handler(async ({ data }) => {
    const snapshot = await upserterApiRequest<RunSnapshot>(
      `/observability/runs/${encodeURIComponent(data.runId)}`
    )

    return snapshot
  })

export const getRunStreamBaseUrl = createServerFn({ method: "GET" }).handler(async () => {
  const baseUrl =
    process.env.UPSERTER_API_BASE_URL ??
    process.env.VITE_UPSERTER_API_BASE_URL ??
    null

  return typeof baseUrl === "string" && baseUrl.length > 0 ? baseUrl : null
})

export const getRunItemDetail = createServerFn({ method: "GET" })
  .inputValidator((data: { runId: string; itemKey: string }) => data)
  .handler(async ({ data }) => {
    const detail = await upserterApiRequest<RunItemDetail>(
      `/observability/runs/${encodeURIComponent(data.runId)}/items/${encodeURIComponent(
        data.itemKey
      )}`
    )

    return detail
  })

export const startRun = createServerFn({ method: "POST" })
  .inputValidator((data: StartRunInput) => data)
  .handler(async ({ data }) =>
    upserterApiRequest<StartRunResponse>("/upserts/tender-options/run", {
      method: "POST",
      body: JSON.stringify(data),
    })
  )

export const getHealthStatus = createServerFn({ method: "GET" }).handler(async () => {
  try {
    return await upserterApiRequest<HealthResponse>("/health")
  } catch {
    return { ok: false, s3Configured: false, clickhomeConfigured: false, version: "unknown" }
  }
})
