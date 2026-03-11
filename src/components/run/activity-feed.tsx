import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"

import type { TelemetryEvent } from "@/lib/run-types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { MutedState } from "@/components/run/run-metrics"
import { formatDateTime, formatRelativeTime } from "@/lib/format"

const LEVELS = ["debug", "info", "warn", "error"] as const

interface ActivityFeedProps {
  events: Array<TelemetryEvent>
  connectionState: "live" | "connecting" | "reconnecting" | "closed"
}

export function ActivityFeed({ events }: ActivityFeedProps) {
  const [levelFilter, setLevelFilter] = useState<Set<string>>(new Set(["info", "warn", "error"]))
  const [componentFilter, setComponentFilter] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState("")
  const [autoScroll, setAutoScroll] = useState(true)
  const parentRef = useRef<HTMLDivElement>(null)

  const components = useMemo(
    () => [...new Set(events.map((e) => e.component))].sort(),
    [events]
  )

  const filtered = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return [...events]
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
      .filter((event) => {
        if (!levelFilter.has(event.level)) return false
        if (componentFilter.size > 0 && !componentFilter.has(event.component)) return false
        if (normalizedSearch) {
          const haystack = [
            event.event,
            event.message,
            event.component,
            event.itemKey,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
          if (!haystack.includes(normalizedSearch)) return false
        }
        return true
      })
  }, [events, levelFilter, componentFilter, search])

  const virtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 44,
    overscan: 20,
  })

  useEffect(() => {
    if (autoScroll && filtered.length > 0) {
      virtualizer.scrollToIndex(filtered.length - 1, { align: "end" })
    }
  }, [autoScroll, filtered.length, virtualizer])

  const handleScroll = useCallback(() => {
    const el = parentRef.current
    if (!el) return
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100
    setAutoScroll(isAtBottom)
  }, [])

  function toggleLevel(level: string) {
    setLevelFilter((prev) => {
      const next = new Set(prev)
      if (next.has(level)) {
        next.delete(level)
      } else {
        next.add(level)
      }
      return next
    })
  }

  function toggleComponent(component: string) {
    setComponentFilter((prev) => {
      const next = new Set(prev)
      if (next.has(component)) {
        next.delete(component)
      } else {
        next.add(component)
      }
      return next
    })
  }

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1">
          {LEVELS.map((level) => (
            <Button
              key={level}
              size="sm"
              variant={levelFilter.has(level) ? "default" : "outline"}
              className="h-7 text-xs"
              onClick={() => toggleLevel(level)}
            >
              {level}
            </Button>
          ))}
        </div>

        {components.length > 0 ? (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-7">
                Components
                {componentFilter.size > 0 ? (
                  <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                    {componentFilter.size}
                  </Badge>
                ) : null}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 space-y-2" align="start">
              {components.map((comp) => (
                <div key={comp} className="flex items-center gap-2">
                  <Checkbox
                    id={`comp-${comp}`}
                    checked={componentFilter.has(comp)}
                    onCheckedChange={() => toggleComponent(comp)}
                  />
                  <label htmlFor={`comp-${comp}`} className="text-xs">
                    {comp}
                  </label>
                </div>
              ))}
              {componentFilter.size > 0 ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => setComponentFilter(new Set())}
                >
                  Clear
                </Button>
              ) : null}
            </PopoverContent>
          </Popover>
        ) : null}

        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search events..."
          className="ml-auto h-7 w-48"
        />

        <span className="text-xs text-muted-foreground">
          {filtered.length} / {events.length}
        </span>
      </div>

      {filtered.length === 0 ? (
        <MutedState message="No telemetry events match the current filter." />
      ) : (
        <div className="relative min-h-0 flex-1">
          <div
            ref={parentRef}
            onScroll={handleScroll}
            className="h-full overflow-auto rounded-md border border-border/70 bg-muted/5"
          >
            <div
              style={{
                height: `${virtualizer.getTotalSize()}px`,
                width: "100%",
                position: "relative",
              }}
            >
              {virtualizer.getVirtualItems().map((virtualItem) => {
                const event = filtered[virtualItem.index]
                return (
                  <div
                    key={event.id}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      transform: `translateY(${virtualItem.start}px)`,
                    }}
                  >
                    <EventRow event={event} />
                  </div>
                )
              })}
            </div>
          </div>

          {!autoScroll ? (
            <Button
              size="sm"
              variant="secondary"
              className="absolute bottom-2 right-4 z-10 shadow-md"
              onClick={() => {
                setAutoScroll(true)
                virtualizer.scrollToIndex(filtered.length - 1, { align: "end" })
              }}
            >
              Scroll to bottom
            </Button>
          ) : null}
        </div>
      )}
    </div>
  )
}

function EventRow({ event }: { event: TelemetryEvent }) {
  return (
    <Collapsible>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-2 border-b border-border/40 px-3 py-2 text-left text-xs transition-colors hover:bg-muted/10"
        >
          <Badge
            variant={
              event.level === "error"
                ? "destructive"
                : event.level === "warn"
                  ? "outline"
                  : "secondary"
            }
            className="shrink-0 text-[10px]"
          >
            {event.level}
          </Badge>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="shrink-0 text-muted-foreground">
                {formatRelativeTime(event.timestamp)}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top">{formatDateTime(event.timestamp)}</TooltipContent>
          </Tooltip>
          <Badge variant="outline" className="shrink-0 text-[10px]">
            {event.component}
          </Badge>
          <span className="min-w-0 flex-1 truncate font-medium">{event.event}</span>
          {event.message ? (
            <span className="min-w-0 max-w-[30%] truncate text-muted-foreground">
              {event.message}
            </span>
          ) : null}
          {event.durationMs !== undefined ? (
            <span className="shrink-0 font-mono text-muted-foreground">
              {event.durationMs}ms
            </span>
          ) : null}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="space-y-2 border-b border-border/40 bg-muted/5 px-3 py-2 text-xs">
          {event.itemKey ? (
            <div>
              <span className="font-medium">Item:</span>{" "}
              <span className="text-muted-foreground">{event.itemKey}</span>
            </div>
          ) : null}
          {event.data ? (
            <pre className="overflow-auto rounded-sm bg-muted/10 p-2 text-[11px]">
              {JSON.stringify(event.data, null, 2)}
            </pre>
          ) : null}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
