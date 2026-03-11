import { format, formatDistanceToNowStrict } from "date-fns"

export function formatRelativeTime(value: string) {
  return formatDistanceToNowStrict(new Date(value), { addSuffix: true })
}

export function formatDateTime(value: string) {
  return format(new Date(value), "dd MMM yyyy HH:mm:ss")
}

export function formatRunDuration(startedAt?: string, finishedAt?: string) {
  if (!startedAt) {
    return "Queued"
  }

  const end = finishedAt ? new Date(finishedAt).getTime() : Date.now()
  const start = new Date(startedAt).getTime()
  const ms = Math.max(0, end - start)

  if (ms < 1_000) {
    return `${ms}ms`
  }

  if (ms < 60_000) {
    return `${(ms / 1_000).toFixed(1)}s`
  }

  const minutes = Math.floor(ms / 60_000)
  const seconds = Math.round((ms % 60_000) / 1_000)
  return `${minutes}m ${seconds}s`
}

export function formatValue(value: string | number | boolean | null) {
  if (value === null) {
    return "null"
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false"
  }

  return String(value)
}

export function truncateMiddle(value: string, maxLen: number) {
  if (value.length <= maxLen) {
    return value
  }

  const half = Math.floor((maxLen - 3) / 2)
  return `${value.slice(0, half)}...${value.slice(-half)}`
}

// ── Item key parsing ───────────────────────────────────────────────
// Keys follow the pattern: prefix/BrandParts.Product_Name_Parts.json
// e.g. "enriched_new/easycraft_Vogue.dado_MDF_Rebated_Dado_Mould_Primed.json"

export interface ParsedItemKey {
  brand: string
  productName: string
  fileName: string
  rawKey: string
}

export function parseItemKey(key: string): ParsedItemKey {
  const lastSlash = key.lastIndexOf("/")
  const fileName = lastSlash >= 0 ? key.slice(lastSlash + 1) : key

  const baseName = fileName.replace(/\.json$/i, "")

  const dotIndex = baseName.indexOf(".")
  if (dotIndex === -1) {
    return {
      brand: "Other",
      productName: baseName.replace(/_/g, " "),
      fileName,
      rawKey: key,
    }
  }

  const brandPart = baseName.slice(0, dotIndex)
  const productPart = baseName.slice(dotIndex + 1)

  return {
    brand: brandPart.replace(/_/g, " "),
    productName: productPart.replace(/_/g, " "),
    fileName,
    rawKey: key,
  }
}

export function getBrandsFromItems(items: Array<{ key: string }>): Array<string> {
  const brands = new Set<string>()
  for (const item of items) {
    brands.add(parseItemKey(item.key).brand)
  }
  return [...brands].sort()
}

// ── File type detection ────────────────────────────────────────────

const IMAGE_EXTS = new Set(["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "ico", "avif", "tiff"])

export function isImageFile(fileName: string): boolean {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? ""
  return IMAGE_EXTS.has(ext)
}

export function getFileTypeLabel(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? ""
  if (IMAGE_EXTS.has(ext)) return "Image"
  switch (ext) {
    case "pdf": return "PDF"
    case "doc": case "docx": return "Document"
    case "xls": case "xlsx": return "Spreadsheet"
    case "csv": return "CSV"
    case "json": return "JSON"
    default: return "File"
  }
}

export function formatLatency(ms: number): { text: string; tone: "fast" | "medium" | "slow" } {
  if (ms < 100) {
    return { text: `${ms}ms`, tone: "fast" }
  }

  if (ms < 500) {
    return { text: `${ms}ms`, tone: "medium" }
  }

  if (ms < 1_000) {
    return { text: `${ms}ms`, tone: "slow" }
  }

  return { text: `${(ms / 1_000).toFixed(1)}s`, tone: "slow" }
}
