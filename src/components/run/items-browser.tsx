import { useDeferredValue, useMemo } from "react"

import type { RunItemOutcome } from "@/lib/run-types"
import type { ItemFilters } from "@/lib/filters"
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
import { formatLatency, formatRelativeTime, getBrandsFromItems, parseItemKey } from "@/lib/format"
import { applyItemFilters, getQuickFilterCounts } from "@/lib/filters"
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
  const availableBrands = useMemo(() => getBrandsFromItems(items), [items])

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
        <button
          type="button"
          className="inline-flex items-center gap-0.5 text-[11px] font-medium hover:text-foreground"
          onClick={() => handleSort(field)}
        >
          {children}
          {filters.sortField === field ? (
            <span className="text-[10px]">{filters.sortDirection === "asc" ? "\u2191" : "\u2193"}</span>
          ) : null}
        </button>
      </TableHead>
    )
  }

  return (
    <div className="flex h-full flex-col gap-2">
      <FilterBar
        filters={filters}
        onChange={onFiltersChange}
        counts={counts}
        availableBrands={availableBrands}
      />

      {page.length === 0 ? (
        <MutedState message="No items match the current filter." />
      ) : (
        <div className="min-h-0 flex-1 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <SortHeader field="key" className="min-w-[140px]">Product</SortHeader>
                <SortHeader field="action" className="w-24">Action</SortHeader>
                <SortHeader field="latencyMs" className="w-16 text-right">Time</SortHeader>
                <SortHeader field="files" className="w-14 text-center">Files</SortHeader>
                <TableHead className="w-5"></TableHead>
                <SortHeader field="startedAt" className="w-20">When</SortHeader>
              </TableRow>
            </TableHeader>
            <TableBody>
              {page.map((item) => {
                const latency = formatLatency(item.latencyMs)
                const isErrored = item.action.includes("error") || Boolean(item.error)
                const parsed = parseItemKey(item.key)

                return (
                  <TableRow
                    key={item.key}
                    className={cn(
                      "cursor-pointer transition-colors",
                      selectedKey === item.key && "bg-primary/8"
                    )}
                    onClick={() => onSelectItem(item.key)}
                  >
                    <TableCell className="max-w-[260px] py-1.5">
                      <div className="flex flex-col">
                        <span className="truncate text-xs font-medium leading-snug">
                          {parsed.productName}
                        </span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="truncate font-mono text-[10px] leading-snug text-muted-foreground/50">
                              {parsed.brand !== "Other" ? `${parsed.brand} · ` : ""}{parsed.fileName}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="max-w-sm break-all font-mono text-[11px]">
                            {item.key}
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                    <TableCell className="py-1.5">
                      <RunActionBadge action={item.action} />
                    </TableCell>
                    <TableCell className="py-1.5 text-right">
                      <span
                        className={cn(
                          "font-mono text-[11px]",
                          latency.tone === "fast" && "text-emerald-600",
                          latency.tone === "medium" && "text-amber-600",
                          latency.tone === "slow" && "text-red-600"
                        )}
                      >
                        {latency.text}
                      </span>
                    </TableCell>
                    <TableCell className="py-1.5 text-center">
                      {item.files.uploaded + item.files.failed > 0 ? (
                        <span className="text-[11px] tabular-nums text-muted-foreground">
                          {item.files.uploaded}/{item.files.failed}
                        </span>
                      ) : (
                        <span className="text-[11px] text-muted-foreground/30">&ndash;</span>
                      )}
                    </TableCell>
                    <TableCell className="py-1.5">
                      {isErrored ? (
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-destructive" />
                      ) : null}
                    </TableCell>
                    <TableCell className="py-1.5 text-[11px] text-muted-foreground">
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
        <div className="shrink-0">
          <ItemsPagination
            currentPage={filters.page}
            totalPages={totalPages}
            onPageChange={(p) => onFiltersChange({ ...filters, page: p })}
          />
        </div>
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
