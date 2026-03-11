import { HeadContent, Outlet, Scripts, createRootRoute } from "@tanstack/react-router"
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools"
import { TanStackDevtools } from "@tanstack/react-devtools"
import { startTransition, useEffect, useState } from "react"

import appCss from "../styles.css?url"
import type { HealthResponse, RunListEntry } from "@/lib/run-types"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { AppSidebar } from "@/components/shell/app-sidebar"
import { CommandPalette } from "@/components/shell/command-palette"
import { getHealthStatus, listRuns } from "@/lib/run.functions"

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "Upserter Run Console",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
  component: RootLayout,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <TanStackDevtools
          config={{
            position: "bottom-right",
          }}
          plugins={[
            {
              name: "Tanstack Router",
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}

function RootLayout() {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [recentRuns, setRecentRuns] = useState<Array<RunListEntry>>([])

  useEffect(() => {
    startTransition(async () => {
      try {
        const result = await getHealthStatus()
        setHealth(result)
      } catch {
        // Health check failed, leave null
      }
    })

    startTransition(async () => {
      try {
        const runs = await listRuns({ data: { limit: 5 } })
        setRecentRuns(runs)
      } catch {
        // Failed to load recent runs for command palette
      }
    })
  }, [])

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar health={health} />
        <SidebarInset className="overflow-hidden">
          <header className="flex h-11 shrink-0 items-center gap-2 border-b border-border/60 bg-background/80 px-4 backdrop-blur-sm">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <a href="/">Dashboard</a>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Upserter</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <div className="ml-auto text-xs text-muted-foreground">
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                <span className="text-xs">&#8984;</span>K
              </kbd>
            </div>
          </header>
          <div className="min-h-0 flex-1 overflow-hidden">
            <Outlet />
          </div>
        </SidebarInset>
        <CommandPalette recentRuns={recentRuns} />
        <Toaster />
      </SidebarProvider>
    </TooltipProvider>
  )
}
