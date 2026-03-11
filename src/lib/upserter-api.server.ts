function getApiBaseUrl() {
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

export async function upserterApiRequest<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  })

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
