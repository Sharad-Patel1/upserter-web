import { createServerFn } from "@tanstack/react-start"
import { getRequestHeaders } from "@tanstack/react-start/server"

export interface AuthSession {
  session: {
    id: string
    userId: string
    expiresAt: string
  }
  user: {
    id: string
    email: string
    name: string
    role?: string | null
  }
}

function getApiBaseUrl() {
  const apiBaseUrl = process.env.UPSERTER_API_BASE_URL

  if (!apiBaseUrl) {
    throw new Error("UPSERTER_API_BASE_URL is required")
  }

  return apiBaseUrl.endsWith("/") ? apiBaseUrl.slice(0, -1) : apiBaseUrl
}

async function fetchSession() {
  const incomingHeaders = getRequestHeaders()
  const headers = new Headers()
  const cookie = incomingHeaders.get("cookie")

  if (cookie) {
    headers.set("cookie", cookie)
  }

  const userAgent = incomingHeaders.get("user-agent")
  if (userAgent) {
    headers.set("user-agent", userAgent)
  }

  const response = await fetch(`${getApiBaseUrl()}/api/auth/get-session`, {
    method: "GET",
    headers,
  })

  if (response.status === 401) {
    return null
  }

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`Session lookup failed (${response.status}): ${detail || response.statusText}`)
  }

  return (await response.json()) as AuthSession | null
}
export const getSession = createServerFn({ method: "GET" }).handler(async () => fetchSession())
