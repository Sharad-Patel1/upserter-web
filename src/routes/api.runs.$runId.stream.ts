import { createFileRoute } from "@tanstack/react-router"

import { proxyApiRequest } from "@/lib/api-proxy"

export const Route = createFileRoute("/api/runs/$runId/stream")({
  server: {
    handlers: {
      GET: async ({ params, request }) =>
        proxyApiRequest(
          `/observability/runs/${encodeURIComponent(params.runId)}/stream`,
          request
        ),
    },
  },
})
