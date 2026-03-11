import { useCallback, useEffect, useState } from "react"
import { useMatches, useNavigate } from "@tanstack/react-router"

import type { RunListEntry } from "@/lib/run-types"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { useSidebar } from "@/components/ui/sidebar"

export function CommandPalette({ recentRuns }: { recentRuns?: Array<RunListEntry> }) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const matches = useMatches()
  const sidebar = useSidebar()
  const runMatch = matches.find((m) => m.routeId === "/runs/$runId")
  const activeRunId = runMatch?.params ? (runMatch.params as { runId: string }).runId : undefined

  useEffect(() => {
    function handler(event: KeyboardEvent) {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setOpen((prev) => !prev)
      }
    }

    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [])

  const go = useCallback(
    (to: string, params?: Record<string, string>) => {
      setOpen(false)
      navigate({ to, params } as Parameters<typeof navigate>[0])
    },
    [navigate]
  )

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Command palette"
      description="Navigate and perform actions"
    >
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => go("/")}>
            <span>Dashboard</span>
          </CommandItem>
          {activeRunId ? (
            <CommandItem onSelect={() => go("/runs/$runId", { runId: activeRunId })}>
              <span>Current Run</span>
            </CommandItem>
          ) : null}
        </CommandGroup>

        {recentRuns && recentRuns.length > 0 ? (
          <>
            <CommandSeparator />
            <CommandGroup heading="Recent Runs">
              {recentRuns.slice(0, 5).map((run) => (
                <CommandItem
                  key={run.runId}
                  onSelect={() => go("/runs/$runId", { runId: run.runId })}
                >
                  <span className="truncate">{run.runId}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{run.status}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        ) : null}

        <CommandSeparator />
        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => { setOpen(false); sidebar.toggleSidebar() }}>
            <span>Toggle Sidebar</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
