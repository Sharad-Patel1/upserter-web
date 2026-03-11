import type { ItemFilters } from "@/lib/filters"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DEFAULT_FILTERS } from "@/lib/filters"

interface FilterBarProps {
  filters: ItemFilters
  onChange: (filters: ItemFilters) => void
  counts: { all: number; create: number; update: number; skip: number; error: number }
  availableBrands: Array<string>
}

type QuickFilter = "all" | "create" | "update" | "skip" | "error"

export function FilterBar({ filters, onChange, counts, availableBrands }: FilterBarProps) {
  const quickFilterValue = getQuickFilterValue(filters)

  function setQuickFilter(value: QuickFilter) {
    switch (value) {
      case "all":
        onChange({ ...filters, actions: [], hasError: null, page: 1 }); break
      case "create":
        onChange({ ...filters, actions: ["create", "create_dry_run"], hasError: null, page: 1 }); break
      case "update":
        onChange({ ...filters, actions: ["update", "update_dry_run"], hasError: null, page: 1 }); break
      case "skip":
        onChange({ ...filters, actions: ["skip_unchanged"], hasError: null, page: 1 }); break
      case "error":
        onChange({ ...filters, actions: [], hasError: true, page: 1 }); break
    }
  }

  function toggleBrand(brand: string) {
    const next = filters.brands.includes(brand)
      ? filters.brands.filter((b) => b !== brand)
      : [...filters.brands, brand]
    onChange({ ...filters, brands: next, page: 1 })
  }

  const activeFilterCount = countActiveAdvancedFilters(filters)

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        {(
          [
            ["all", "All"],
            ["create", "Create"],
            ["update", "Update"],
            ["skip", "Skip"],
            ["error", "Error"],
          ] as const
        ).map(([value, label]) => (
          <Button
            key={value}
            type="button"
            size="sm"
            variant={quickFilterValue === value ? "default" : "outline"}
            className="h-6 px-2 text-[11px]"
            onClick={() => setQuickFilter(value)}
          >
            {label}
            <span className="ml-1 tabular-nums text-[9px] opacity-70">{counts[value]}</span>
          </Button>
        ))}

        {availableBrands.length > 1 ? (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-6 px-2 text-[11px]">
                Prefix
                {filters.brands.length > 0 ? (
                  <Badge variant="default" className="ml-1 h-3.5 min-w-3.5 px-1 text-[9px]">
                    {filters.brands.length}
                  </Badge>
                ) : null}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-0" align="start">
              <div className="max-h-64 overflow-auto p-2">
                {availableBrands.map((brand) => (
                  <label
                    key={brand}
                    className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1 text-xs hover:bg-muted/40"
                  >
                    <Checkbox
                      checked={filters.brands.includes(brand)}
                      onCheckedChange={() => toggleBrand(brand)}
                    />
                    <span className="truncate">{brand}</span>
                  </label>
                ))}
              </div>
              {filters.brands.length > 0 ? (
                <div className="border-t p-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-full text-[11px]"
                    onClick={() => onChange({ ...filters, brands: [], page: 1 })}
                  >
                    Clear selection
                  </Button>
                </div>
              ) : null}
            </PopoverContent>
          </Popover>
        ) : null}

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-6 px-2 text-[11px]">
              Filters
              {activeFilterCount > 0 ? (
                <Badge variant="default" className="ml-1 h-3.5 min-w-3.5 px-1 text-[9px]">
                  {activeFilterCount}
                </Badge>
              ) : null}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 space-y-3" align="start">
            <div className="space-y-1.5">
              <p className="text-[11px] font-medium">Latency</p>
              <div className="flex flex-wrap gap-1">
                {(["any", "fast", "medium", "slow"] as const).map((value) => (
                  <Button
                    key={value}
                    size="sm"
                    variant={filters.latencyRange === value ? "default" : "outline"}
                    className="h-6 px-2 text-[11px]"
                    onClick={() => onChange({ ...filters, latencyRange: value, page: 1 })}
                  >
                    {value === "fast" ? "<100ms" : value === "medium" ? "100-500ms" : value === "slow" ? ">500ms" : "Any"}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-[11px] font-medium">Files</p>
              <Select
                value={filters.hasFiles}
                onValueChange={(value) =>
                  onChange({ ...filters, hasFiles: value as ItemFilters["hasFiles"], page: 1 })
                }
              >
                <SelectTrigger size="sm" className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="has-uploads">Has uploads</SelectItem>
                  <SelectItem value="has-failures">Has failures</SelectItem>
                  <SelectItem value="no-files">No files</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <p className="text-[11px] font-medium">Patch strategy</p>
              <Select
                value={filters.patchStrategy}
                onValueChange={(value) =>
                  onChange({
                    ...filters,
                    patchStrategy: value as ItemFilters["patchStrategy"],
                    page: 1,
                  })
                }
              >
                <SelectTrigger size="sm" className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="json-patch">JSON Patch</SelectItem>
                  <SelectItem value="merge-object">Merge Object</SelectItem>
                  <SelectItem value="none">None</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <p className="text-[11px] font-medium">File sync status</p>
              <Select
                value={filters.fileSyncStatus}
                onValueChange={(value) =>
                  onChange({
                    ...filters,
                    fileSyncStatus: value as ItemFilters["fileSyncStatus"],
                    page: 1,
                  })
                }
              >
                <SelectTrigger size="sm" className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="all-uploaded">All uploaded</SelectItem>
                  <SelectItem value="some-failed">Some failed</SelectItem>
                  <SelectItem value="none-attempted">None attempted</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-xs">
              <Checkbox
                checked={filters.hasDiffChanges === true}
                onCheckedChange={(checked) =>
                  onChange({ ...filters, hasDiffChanges: checked ? true : null, page: 1 })
                }
              />
              Has diff changes only
            </label>

            <Button
              variant="outline"
              size="sm"
              className="h-7 w-full text-xs"
              onClick={() =>
                onChange({
                  ...DEFAULT_FILTERS,
                  search: filters.search,
                  page: 1,
                  pageSize: filters.pageSize,
                })
              }
            >
              Reset filters
            </Button>
          </PopoverContent>
        </Popover>

        <div className="ml-auto">
          <Input
            value={filters.search}
            onChange={(event) => onChange({ ...filters, search: event.target.value, page: 1 })}
            placeholder="Search..."
            className="h-6 w-36 px-2 text-[11px]"
          />
        </div>
      </div>

      <ActiveFilterChips filters={filters} onChange={onChange} />
    </div>
  )
}

function ActiveFilterChips({
  filters,
  onChange,
}: {
  filters: ItemFilters
  onChange: (filters: ItemFilters) => void
}) {
  const chips: Array<{ label: string; onRemove: () => void }> = []

  for (const brand of filters.brands) {
    chips.push({
      label: `Prefix: ${brand}`,
      onRemove: () =>
        onChange({
          ...filters,
          brands: filters.brands.filter((b) => b !== brand),
          page: 1,
        }),
    })
  }
  if (filters.latencyRange !== "any") {
    chips.push({
      label: `Latency: ${filters.latencyRange}`,
      onRemove: () => onChange({ ...filters, latencyRange: "any", page: 1 }),
    })
  }
  if (filters.hasFiles !== "any") {
    chips.push({
      label: `Files: ${filters.hasFiles}`,
      onRemove: () => onChange({ ...filters, hasFiles: "any", page: 1 }),
    })
  }
  if (filters.patchStrategy !== "any") {
    chips.push({
      label: `Patch: ${filters.patchStrategy}`,
      onRemove: () => onChange({ ...filters, patchStrategy: "any", page: 1 }),
    })
  }
  if (filters.fileSyncStatus !== "any") {
    chips.push({
      label: `Sync: ${filters.fileSyncStatus}`,
      onRemove: () => onChange({ ...filters, fileSyncStatus: "any", page: 1 }),
    })
  }
  if (filters.hasDiffChanges !== null) {
    chips.push({
      label: "Has diff changes",
      onRemove: () => onChange({ ...filters, hasDiffChanges: null, page: 1 }),
    })
  }

  if (chips.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1">
      {chips.map((chip) => (
        <Badge
          key={chip.label}
          variant="secondary"
          className="cursor-pointer gap-1 text-[10px]"
          onClick={chip.onRemove}
        >
          {chip.label}
          <span className="text-muted-foreground">&times;</span>
        </Badge>
      ))}
      <button
        type="button"
        className="text-[10px] text-muted-foreground underline-offset-2 hover:underline"
        onClick={() =>
          onChange({
            ...DEFAULT_FILTERS,
            search: filters.search,
            page: 1,
            pageSize: filters.pageSize,
          })
        }
      >
        Clear all
      </button>
    </div>
  )
}

function getQuickFilterValue(filters: ItemFilters): QuickFilter {
  if (filters.hasError === true) return "error"
  if (filters.actions.length === 0 && filters.hasError === null) return "all"
  if (filters.actions.includes("create") || filters.actions.includes("create_dry_run"))
    return "create"
  if (filters.actions.includes("update") || filters.actions.includes("update_dry_run"))
    return "update"
  if (filters.actions.includes("skip_unchanged")) return "skip"
  return "all"
}

function countActiveAdvancedFilters(filters: ItemFilters) {
  let count = 0
  if (filters.latencyRange !== "any") count++
  if (filters.hasFiles !== "any") count++
  if (filters.patchStrategy !== "any") count++
  if (filters.fileSyncStatus !== "any") count++
  if (filters.hasDiffChanges !== null) count++
  return count
}
