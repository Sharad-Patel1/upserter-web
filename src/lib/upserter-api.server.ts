import { getRequestHeaders } from "@tanstack/react-start/server"

export function getApiBaseUrl() {
  const apiBaseUrl = process.env.UPSERTER_API_BASE_URL

  if (!apiBaseUrl) {
    throw new Error("UPSERTER_API_BASE_URL is required")
  }

  return apiBaseUrl.endsWith("/") ? apiBaseUrl.slice(0, -1) : apiBaseUrl
}

async function parseResponseBody(response: Response) {
  const contentType = response.headers.get("content-type") ?? ""

  if (contentType.includes("application/json")) {
    return response.json()
  }

  const text = await response.text()

  if (!text) {
    return undefined
  }

  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

function getForwardedHeaders(source?: HeadersInit) {
  const incomingHeaders = source ? new Headers(source) : getRequestHeaders()
  const headers = new Headers()

  for (const name of [
    "cookie",
    "user-agent",
    "x-forwarded-for",
    "x-forwarded-host",
    "x-forwarded-proto",
  ]) {
    const value = incomingHeaders.get(name)
    if (value) {
      headers.set(name, value)
    }
  }

  return headers
}

export async function upserterApiFetch(
  path: string,
  init?: RequestInit & { forwardHeaders?: HeadersInit }
) {
  const headers = new Headers(init?.headers)
  const forwardedHeaders = getForwardedHeaders(init?.forwardHeaders)

  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json")
  }

  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }

  forwardedHeaders.forEach((value, key) => {
    if (!headers.has(key)) {
      headers.set(key, value)
    }
  })

  return fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers,
  })
}

export async function upserterApiRequest<T>(
  path: string,
  init?: RequestInit & { forwardHeaders?: HeadersInit }
): Promise<T> {
  const response = await upserterApiFetch(path, init)

  const body = await parseResponseBody(response)

  if (!response.ok) {
    const detail =
      typeof body === "string"
        ? body
        : body
          ? JSON.stringify(body)
          : response.statusText

    throw new Error(`API request failed (${response.status}): ${detail}`)
  }

  return body as T
}
