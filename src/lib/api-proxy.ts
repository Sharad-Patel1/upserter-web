import { getApiBaseUrl } from "@/lib/upserter-api.server"

function sanitizeProxyHeaders(headers: Headers) {
  const forwardedHeaders = new Headers(headers)
  forwardedHeaders.delete("connection")
  forwardedHeaders.delete("content-length")
  forwardedHeaders.delete("host")
  forwardedHeaders.delete("transfer-encoding")

  return forwardedHeaders
}

async function readRequestBody(request: Request) {
  if (request.method === "GET" || request.method === "HEAD") {
    return undefined
  }

  const body = await request.arrayBuffer()
  return body.byteLength > 0 ? body : undefined
}

export async function proxyApiRequest(path: string, request: Request) {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method: request.method,
    headers: sanitizeProxyHeaders(request.headers),
    body: await readRequestBody(request),
    redirect: "manual",
  })

  return new Response(response.body, {
    status: response.status,
    headers: new Headers(response.headers),
  })
}
