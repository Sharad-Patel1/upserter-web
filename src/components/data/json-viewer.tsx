import { memo, useCallback, useState } from "react"

import type { JsonValue } from "@/lib/run-types"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { useClipboard } from "@/hooks/use-clipboard"

interface JsonViewerProps {
  value: JsonValue
  collapsed?: boolean
  maxDepth?: number
  copyable?: boolean
  rootLabel?: string
}

export const JsonViewer = memo(function JsonViewer({
  value,
  collapsed = false,
  maxDepth = 6,
  copyable = true,
  rootLabel,
}: JsonViewerProps) {
  const { copy, copied } = useClipboard()
  const [expandAll, setExpandAll] = useState(!collapsed)

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        {rootLabel ? (
          <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {rootLabel}
          </span>
        ) : null}
        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[10px]"
            onClick={() => setExpandAll(true)}
          >
            Expand all
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[10px]"
            onClick={() => setExpandAll(false)}
          >
            Collapse all
          </Button>
          {copyable ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[10px]"
              onClick={() => copy(JSON.stringify(value, null, 2))}
            >
              {copied ? "Copied" : "Copy"}
            </Button>
          ) : null}
        </div>
      </div>
      <div className="rounded-md border border-border/70 bg-muted/10 p-2 font-mono text-xs">
        <JsonNode value={value} depth={0} maxDepth={maxDepth} expandAll={expandAll} />
      </div>
    </div>
  )
})

const JsonNode = memo(function JsonNode({
  value,
  depth,
  maxDepth,
  expandAll,
  keyName,
}: {
  value: JsonValue
  depth: number
  maxDepth: number
  expandAll: boolean
  keyName?: string
}) {
  if (value === null) {
    return (
      <span>
        {keyName ? <span className="text-foreground/70">{keyName}: </span> : null}
        <span className="text-muted-foreground">null</span>
      </span>
    )
  }

  if (typeof value === "string") {
    return (
      <span>
        {keyName ? <span className="text-foreground/70">{keyName}: </span> : null}
        <span className="text-emerald-600 dark:text-emerald-400">"{value}"</span>
      </span>
    )
  }

  if (typeof value === "number") {
    return (
      <span>
        {keyName ? <span className="text-foreground/70">{keyName}: </span> : null}
        <span className="text-blue-600 dark:text-blue-400">{value}</span>
      </span>
    )
  }

  if (typeof value === "boolean") {
    return (
      <span>
        {keyName ? <span className="text-foreground/70">{keyName}: </span> : null}
        <span className="text-purple-600 dark:text-purple-400">{String(value)}</span>
      </span>
    )
  }

  if (Array.isArray(value)) {
    return (
      <CollapsibleNode
        keyName={keyName}
        bracket={["[", "]"]}
        count={value.length}
        depth={depth}
        maxDepth={maxDepth}
        expandAll={expandAll}
      >
        {value.map((item, index) => (
          <div key={index} style={{ paddingLeft: 16 }}>
            <JsonNode
              value={item}
              depth={depth + 1}
              maxDepth={maxDepth}
              expandAll={expandAll}
            />
            {index < value.length - 1 ? <span className="text-muted-foreground">,</span> : null}
          </div>
        ))}
      </CollapsibleNode>
    )
  }

  const entries = Object.entries(value)
  return (
    <CollapsibleNode
      keyName={keyName}
      bracket={["{", "}"]}
      count={entries.length}
      depth={depth}
      maxDepth={maxDepth}
      expandAll={expandAll}
    >
      {entries.map(([k, v], index) => (
        <div key={k} style={{ paddingLeft: 16 }}>
          <JsonNode
            keyName={k}
            value={v}
            depth={depth + 1}
            maxDepth={maxDepth}
            expandAll={expandAll}
          />
          {index < entries.length - 1 ? <span className="text-muted-foreground">,</span> : null}
        </div>
      ))}
    </CollapsibleNode>
  )
})

function CollapsibleNode({
  keyName,
  bracket,
  count,
  depth,
  maxDepth,
  expandAll,
  children,
}: {
  keyName?: string
  bracket: [string, string]
  count: number
  depth: number
  maxDepth: number
  expandAll: boolean
  children: React.ReactNode
}) {
  const shouldStartOpen = expandAll && depth < maxDepth && count <= 50
  const [open, setOpen] = useState(shouldStartOpen)

  const handleToggle = useCallback(() => setOpen((prev) => !prev), [])

  // Sync with expandAll changes
  useState(() => {
    // initial only
  })

  // Re-sync expandAll
  if (expandAll && !open && depth < maxDepth && count <= 50) {
    // Will be picked up on next render via effect-like behavior
  }

  return (
    <Collapsible open={expandAll ? (depth < maxDepth && count <= 50) : open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          onClick={handleToggle}
          className="inline-flex items-center gap-1 hover:bg-muted/30 rounded-sm"
        >
          {keyName ? <span className="text-foreground/70">{keyName}: </span> : null}
          <span className="text-muted-foreground">{bracket[0]}</span>
          <span className="text-[10px] text-muted-foreground">
            {count} {count === 1 ? "item" : "items"}
          </span>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        {children}
        <span className="text-muted-foreground">{bracket[1]}</span>
      </CollapsibleContent>
      {!(expandAll ? (depth < maxDepth && count <= 50) : open) ? (
        <span className="text-muted-foreground"> ...{bracket[1]}</span>
      ) : null}
    </Collapsible>
  )
}
