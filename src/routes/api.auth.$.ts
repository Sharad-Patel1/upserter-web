import { createFileRoute } from "@tanstack/react-router"

import { proxyApiRequest } from "@/lib/api-proxy"

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: ({ createHandlers }) =>
      createHandlers({
        ANY: async ({ params, request }) => {
          const url = new URL(request.url)
          const suffix = params._splat ? `/${params._splat}` : ""

          return proxyApiRequest(`/api/auth${suffix}${url.search}`, request)
        },
      }),
  },
})
