import { Suspense, lazy, memo } from "react"

import type { AuditArtifactRow } from "@/lib/run-types"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDateTime } from "@/lib/format"

const JsonViewer = lazy(() =>
  import("@/components/data/json-viewer").then((m) => ({ default: m.JsonViewer }))
)

export const ArtifactCard = memo(function ArtifactCard({
  artifact,
}: {
  artifact: AuditArtifactRow
}) {
  return (
    <Collapsible>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-sm border border-border/70 bg-muted/12 px-3 py-2 text-left text-xs transition-colors hover:bg-muted/22"
        >
          <Badge variant="outline">{artifact.step}</Badge>
          <Badge variant="secondary">{artifact.artifactType}</Badge>
          <span className="ml-auto text-muted-foreground">
            {artifact.contentType} - {formatDateTime(artifact.createdAt)}
          </span>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="border border-t-0 border-border/70 bg-background/90 p-3">
          <Suspense fallback={<Skeleton className="h-32" />}>
            <JsonViewer value={artifact.payload} />
          </Suspense>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
})
