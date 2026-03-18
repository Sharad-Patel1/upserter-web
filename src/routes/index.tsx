import { createFileRoute, redirect } from "@tanstack/react-router"
import { startTransition, useEffect, useMemo, useState } from "react"

import { SessionToolbar } from "@/components/auth/session-toolbar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LaunchRunSheet } from "@/components/dashboard/launch-run-sheet"
import { ActiveRunCard } from "@/components/dashboard/active-run-card"
import { RecentRunsTable } from "@/components/dashboard/recent-runs-table"
import { SummaryMetric } from "@/components/run/run-metrics"
import { getSession } from "@/lib/auth.functions"
import { listRuns } from "@/lib/run.functions"

export const Route = createFileRoute("/")({
  beforeLoad: async ({ location }) => {
    const session = await getSession()

    if (!session) {
      throw redirect({
        to: "/login",
        search: {
          redirect: location.href,
        },
      })
    }

    return { session }
  },
  loader: () => listRuns({ data: { limit: 20 } }),
  component: DashboardPage,
})

function DashboardPage() {
  const initialRuns = Route.useLoaderData()
  const { session } = Route.useRouteContext()
  const [runs, setRuns] = useState(initialRuns)
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    const interval = window.setInterval(() => {
      setIsRefreshing(true)
      startTransition(async () => {
        try {
          setRuns(await listRuns({ data: { limit: 20 } }))
        } catch {
          // Keep the last successful snapshot if refresh fails.
        } finally {
          setIsRefreshing(false)
        }
      })
    }, 15_000)

    return () => window.clearInterval(interval)
  }, [])

  const activeRuns = useMemo(
    () => runs.filter((run) => run.status === "queued" || run.status === "running"),
    [runs]
  )

  return (
    <div className="mx-auto flex max-w-[1480px] flex-col gap-6 px-4 py-6 md:px-6 md:py-8">
      <SessionToolbar email={session.user.email} />

      <section className="grid gap-4 lg:grid-cols-[1.5fr_0.9fr]">
        <Card className="border border-foreground/10 bg-background/88 backdrop-blur-sm">
          <CardHeader className="gap-3 border-b border-border/70">
            <Badge variant="outline" className="w-fit border-foreground/15 bg-background/60">
              Tender option upsert console
            </Badge>
            <CardTitle className="max-w-3xl text-3xl leading-none tracking-[-0.04em] md:text-5xl">
              Launch runs, inspect every artifact, and watch the pipeline move live.
            </CardTitle>
            <CardDescription className="max-w-2xl text-sm text-muted-foreground">
              This console is tuned for operators. Start a dry run or apply run, then move
              straight into the live stream view with full audit visibility per tender option.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 pt-4 sm:grid-cols-4">
            <SummaryMetric label="Recent runs" value={String(runs.length)} />
            <SummaryMetric label="Active now" value={String(activeRuns.length)} />
            <SummaryMetric
              label="Refresh"
              value={isRefreshing ? "Updating" : "Every 15s"}
              tone={isRefreshing ? "active" : "default"}
            />
            <div className="flex items-end">
              <LaunchRunSheet>
                <Button size="lg" className="w-full">
                  Launch Run
                </Button>
              </LaunchRunSheet>
            </div>
          </CardContent>
        </Card>

        <ActiveRunCard run={activeRuns[0]} />
      </section>

      <RecentRunsTable runs={runs} />
    </div>
  )
}
