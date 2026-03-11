import { useDeferredValue, useMemo } from "react"

import type { RunItemOutcome } from "@/lib/run-types"
import type {ItemFilters} from "@/lib/filters";
import { Button } from "@/components/ui/button"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { FilterBar } from "@/components/run/filter-bar"
import { RunActionBadge } from "@/components/run/run-status-indicator"
import { MutedState } from "@/components/run/run-metrics"
import { formatLatency, formatRelativeTime, truncateMiddle } from "@/lib/format"
import {  applyItemFilters, getQuickFilterCounts } from "@/lib/filters"
import { cn } from "@/lib/utils"

interface ItemsBrowserProps {
  items: Array<RunItemOutcome>
  selectedKey: string
  onSelectItem: (key: string) => void
  filters: ItemFilters
  onFiltersChange: (filters: ItemFilters) => void
}

export function ItemsBrowser({
  items,
  selectedKey,
  onSelectItem,
  filters,
  onFiltersChange,
}: ItemsBrowserProps) {
  const deferredSearch = useDeferredValue(filters.search)
  const activeFilters = useMemo(
    () => ({ ...filters, search: deferredSearch }),
    [filters, deferredSearch]
  )
  const { page, totalPages } = useMemo(
    () => applyItemFilters(items, activeFilters),
    [items, activeFilters]
  )
  const counts = useMemo(() => getQuickFilterCounts(items), [items])

  function handleSort(field: ItemFilters["sortField"]) {
    if (filters.sortField === field) {
      onFiltersChange({
        ...filters,
        sortDirection: filters.sortDirection === "asc" ? "desc" : "asc",
      })
    } else {
      onFiltersChange({ ...filters, sortField: field, sortDirection: "desc" })
    }
  }

  function SortHeader({
    field,
    children,
    className,
  }: {
    field: ItemFilters["sortField"]
    children: React.ReactNode
    className?: string
  }) {
    return (
      <TableHead className={className}>
        <Button
          variant="ghost"
          size="sm"
          className="h-auto -ml-2 px-2 py-0 text-xs font-medium"
          onClick={() => handleSort(field)}
        >
          {children}
          {filters.sortField === field ? (
            <span className="ml-1">{filters.sortDirection === "asc" ? "\u2191" : "\u2193"}</span>
          ) : null}
        </Button>
      </TableHead>
    )
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <FilterBar filters={filters} onChange={onFiltersChange} counts={counts} />

      {page.length === 0 ? (
        <MutedState message="No items match the current filter." />
      ) : (
        <div className="min-h-0 flex-1 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <SortHeader field="key">Key</SortHeader>
                <TableHead className="w-24">Ref</TableHead>
                <SortHeader field="action" className="w-28">
                  Action
                </SortHeader>
                <TableHead className="w-20">Option</TableHead>
                <SortHeader field="latencyMs" className="w-20 text-right">
                  Latency
                </SortHeader>
                <SortHeader field="files" className="w-20 text-center">
                  Files
                </SortHeader>
                <TableHead className="w-8"></TableHead>
                <SortHeader field="startedAt" className="w-28">
                  Started
                </SortHeader>
              </TableRow>
            </TableHeader>
            <TableBody>
              {page.map((item) => {
                const latency = formatLatency(item.latencyMs)
                const isErrored = item.action.includes("error") || Boolean(item.error)

                return (
                  <TableRow
                    key={item.key}
                    className={cn(
                      "cursor-pointer transition-colors",
                      selectedKey === item.key && "bg-primary/8"
                    )}
                    onClick={() => onSelectItem(item.key)}
                  >
                    <TableCell className="max-w-[240px]">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="block truncate font-medium text-xs">
                            {truncateMiddle(item.key, 36)}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-md break-all">
                          {item.key}
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground truncate max-w-[100px]">
                      {item.externalRef ?? "-"}
                    </TableCell>
                    <TableCell>
                      <RunActionBadge action={item.action} />
                    </TableCell>
                    <TableCell className="text-xs">
                      {item.optionId ?? "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={cn(
                          "text-xs font-mono",
                          latency.tone === "fast" && "text-emerald-600",
                          latency.tone === "medium" && "text-amber-600",
                          latency.tone === "slow" && "text-red-600"
                        )}
                      >
                        {latency.text}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-xs text-muted-foreground">
                        {item.files.uploaded}/{item.files.skippedExisting}/{item.files.failed}
                      </span>
                    </TableCell>
                    <TableCell>
                      {isErrored ? (
                        <span className="inline-block h-2 w-2 rounded-full bg-destructive" />
                      ) : null}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatRelativeTime(item.startedAt)}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {totalPages > 1 ? (
        <ItemsPagination
          currentPage={filters.page}
          totalPages={totalPages}
          onPageChange={(p) => onFiltersChange({ ...filters, page: p })}
        />
      ) : null}
    </div>
  )
}

function ItemsPagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}) {
  const pages = getVisiblePages(currentPage, totalPages)

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            className={currentPage <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
          />
        </PaginationItem>
        {pages.map((page, i) =>
          page === -1 ? (
            <PaginationItem key={`ellipsis-${i}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={page}>
              <PaginationLink
                isActive={page === currentPage}
                onClick={() => onPageChange(page)}
                className="cursor-pointer"
              >
                {page}
              </PaginationLink>
            </PaginationItem>
          )
        )}
        <PaginationItem>
          <PaginationNext
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            className={
              currentPage >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"
            }
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  )
}

function getVisiblePages(current: number, total: number): Array<number> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  if (current <= 3) return [1, 2, 3, 4, -1, total]
  if (current >= total - 2) return [1, -1, total - 3, total - 2, total - 1, total]
  return [1, -1, current - 1, current, current + 1, -1, total]
}
