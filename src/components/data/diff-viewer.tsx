import { memo } from "react"

import type { JsonPatchOperation, JsonValue } from "@/lib/run-types"
import { Badge } from "@/components/ui/badge"
import { JsonViewer } from "@/components/data/json-viewer"

interface DiffViewerProps {
  jsonPatchOperations?: Array<JsonPatchOperation>
  mergePatchObject?: Record<string, JsonValue>
}

const OP_STYLES = {
  add: "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400",
  remove: "bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400",
  replace: "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400",
} as const

const OP_PREFIX = {
  add: "+",
  remove: "-",
  replace: "~",
} as const

export const DiffViewer = memo(function DiffViewer({
  jsonPatchOperations,
  mergePatchObject,
}: DiffViewerProps) {
  if (!jsonPatchOperations?.length && !mergePatchObject) {
    return (
      <div className="border border-border/70 bg-muted/16 px-4 py-3 text-sm text-muted-foreground">
        No diff changes recorded.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {jsonPatchOperations && jsonPatchOperations.length > 0 ? (
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            JSON Patch Operations ({jsonPatchOperations.length})
          </p>
          <div className="space-y-1">
            {jsonPatchOperations.map((op, index) => (
              <div
                key={`${op.op}-${op.path}-${index}`}
                className={`flex items-start gap-2 rounded-sm border px-3 py-2 font-mono text-xs ${OP_STYLES[op.op]}`}
              >
                <Badge variant="outline" className="shrink-0 text-[10px]">
                  {OP_PREFIX[op.op]} {op.op}
                </Badge>
                <span className="font-medium">{op.path}</span>
                {op.value !== undefined ? (
                  <span className="ml-auto truncate text-muted-foreground">
                    {typeof op.value === "object" ? JSON.stringify(op.value) : String(op.value)}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {mergePatchObject && Object.keys(mergePatchObject).length > 0 ? (
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Merge Patch Object
          </p>
          <JsonViewer value={mergePatchObject} copyable rootLabel="" />
        </div>
      ) : null}
    </div>
  )
})
