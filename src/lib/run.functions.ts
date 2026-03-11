import { createServerFn } from "@tanstack/react-start"

import { upserterApiRequest } from "@/lib/upserter-api.server"
import type {
  RunItemDetail,
  RunListEntry,
  RunSnapshot,
  StartRunInput,
  StartRunResponse,
} from "@/lib/run-types"

export const listRuns = createServerFn({ method: "GET" })
  .inputValidator((data: { limit?: number } | undefined) => data ?? {})
  .handler(async ({ data }) => {
    const search = new URLSearchParams()
    if (data.limit) {
      search.set("limit", String(data.limit))
    }

    const suffix = search.size > 0 ? `?${search.toString()}` : ""
    return upserterApiRequest<RunListEntry[]>(`/upserts/tender-options/runs${suffix}`)
  })

export const getRunSnapshot = createServerFn({ method: "GET" })
  .inputValidator((data: { runId: string }) => data)
  .handler(async ({ data }) => {
    const snapshot = await upserterApiRequest<RunSnapshot>(
      `/observability/runs/${encodeURIComponent(data.runId)}`
    )

    return snapshot as RunSnapshot
  })

export const getRunItemDetail = createServerFn({ method: "GET" })
  .inputValidator((data: { runId: string; itemKey: string }) => data)
  .handler(async ({ data }) => {
    const detail = await upserterApiRequest<RunItemDetail>(
      `/observability/runs/${encodeURIComponent(data.runId)}/items/${encodeURIComponent(
        data.itemKey
      )}`
    )

    return detail as RunItemDetail
  })

export const startRun = createServerFn({ method: "POST" })
  .inputValidator((data: StartRunInput) => data)
  .handler(async ({ data }) =>
    upserterApiRequest<StartRunResponse>("/upserts/tender-options/run", {
      method: "POST",
      body: JSON.stringify(data),
    })
  )
