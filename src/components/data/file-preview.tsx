import { memo, useState } from "react"

import type { AuditFileSyncAttemptRow } from "@/lib/run-types"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { getFileTypeLabel, isImageFile } from "@/lib/format"
import { cn } from "@/lib/utils"

interface FilePreviewProps {
  attempt: AuditFileSyncAttemptRow
  size?: "sm" | "md"
}

export const FilePreview = memo(function FilePreview({ attempt, size = "sm" }: FilePreviewProps) {
  const [imgError, setImgError] = useState(false)
  const isImage = isImageFile(attempt.fileName)
  const typeLabel = getFileTypeLabel(attempt.fileName)
  const isFailed = attempt.status.includes("failed")

  if (isImage && attempt.sourceUrl && !imgError) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "group relative overflow-hidden rounded-md border transition-all",
              isFailed
                ? "border-destructive/30"
                : "border-border/50 hover:border-border hover:shadow-sm",
              size === "sm" ? "h-12 w-12" : "h-20 w-20"
            )}
          >
            <img
              src={attempt.sourceUrl}
              alt={attempt.fileName}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
              loading="lazy"
              onError={() => setImgError(true)}
            />
            {isFailed ? (
              <div className="absolute inset-0 flex items-center justify-center bg-destructive/20">
                <FailedIcon />
              </div>
            ) : null}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="font-medium">{attempt.fileName}</p>
          <p className="text-muted-foreground">{attempt.stage} &middot; {attempt.status}</p>
          {attempt.error ? <p className="text-destructive">{attempt.error}</p> : null}
        </TooltipContent>
      </Tooltip>
    )
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "flex items-center justify-center rounded-md border bg-muted/20",
            isFailed ? "border-destructive/30" : "border-border/50",
            size === "sm" ? "h-12 w-12" : "h-20 w-20"
          )}
        >
          <div className="flex flex-col items-center gap-0.5">
            <FileTypeIcon type={typeLabel} />
            <span className="text-[8px] font-medium uppercase tracking-wider text-muted-foreground">
              {typeLabel}
            </span>
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <p className="font-medium">{attempt.fileName}</p>
        <p className="text-muted-foreground">{attempt.stage} &middot; {attempt.status}</p>
        {attempt.error ? <p className="text-destructive">{attempt.error}</p> : null}
      </TooltipContent>
    </Tooltip>
  )
})

export function FilePreviewGallery({
  attempts,
  maxVisible = 8,
}: {
  attempts: Array<AuditFileSyncAttemptRow>
  maxVisible?: number
}) {
  const [showAll, setShowAll] = useState(false)
  const visible = showAll ? attempts : attempts.slice(0, maxVisible)
  const remaining = attempts.length - maxVisible

  if (attempts.length === 0) return null

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {visible.map((attempt) => (
          <FilePreviewItem key={attempt.id} attempt={attempt} />
        ))}
        {!showAll && remaining > 0 ? (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="flex h-20 w-20 items-center justify-center rounded-md border border-dashed border-border/60 text-xs text-muted-foreground transition-colors hover:border-border hover:bg-muted/20"
          >
            +{remaining} more
          </button>
        ) : null}
      </div>
    </div>
  )
}

function FilePreviewItem({ attempt }: { attempt: AuditFileSyncAttemptRow }) {
  const [imgError, setImgError] = useState(false)
  const isImage = isImageFile(attempt.fileName)
  const typeLabel = getFileTypeLabel(attempt.fileName)
  const isFailed = attempt.status.includes("failed")

  return (
    <div className="group flex flex-col gap-1">
      {isImage && attempt.sourceUrl && !imgError ? (
        <a
          href={attempt.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "relative block overflow-hidden rounded-md border transition-all",
            isFailed
              ? "border-destructive/30"
              : "border-border/50 hover:border-primary/40 hover:shadow-md"
          )}
          style={{ width: 80, height: 80 }}
        >
          <img
            src={attempt.sourceUrl}
            alt={attempt.fileName}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
            loading="lazy"
            onError={() => setImgError(true)}
          />
          {isFailed ? (
            <div className="absolute inset-0 flex items-center justify-center bg-destructive/20">
              <FailedIcon />
            </div>
          ) : null}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-1 pb-1 pt-3 opacity-0 transition-opacity group-hover:opacity-100">
            <span className="text-[9px] font-medium text-white">
              Open
            </span>
          </div>
        </a>
      ) : (
        <div
          className={cn(
            "flex items-center justify-center rounded-md border bg-muted/20",
            isFailed ? "border-destructive/30" : "border-border/50"
          )}
          style={{ width: 80, height: 80 }}
        >
          <div className="flex flex-col items-center gap-1">
            <FileTypeIcon type={typeLabel} />
            <span className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
              {typeLabel}
            </span>
          </div>
        </div>
      )}
      <div className="w-20 space-y-0.5">
        <p className="truncate text-[10px] font-medium leading-tight">{attempt.fileName}</p>
        <div className="flex items-center gap-1">
          <Badge
            variant={isFailed ? "destructive" : "secondary"}
            className="h-3.5 px-1 text-[8px]"
          >
            {attempt.status}
          </Badge>
        </div>
      </div>
    </div>
  )
}

function FileTypeIcon({ type }: { type: string }) {
  switch (type) {
    case "Image":
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      )
    case "PDF":
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      )
    default:
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      )
  }
}

function FailedIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-destructive">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  )
}
