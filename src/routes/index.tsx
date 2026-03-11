import { formatDistanceToNowStrict } from "date-fns"
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router"
import { startTransition, useEffect, useMemo, useState, type FormEvent } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { listRuns, startRun } from "@/lib/run.functions"
import type { RunListEntry, StartRunInput } from "@/lib/run-types"

const DEFAULT_FORM_STATE: StartRunInput = {
  dryRun: true,
  prefix: "",
  concurrency: 5,
  fileConcurrency: 2,
  resumeFromCheckpoint: false,
}

export const Route = createFileRoute("/")({
  loader: () => listRuns({ data: { limit: 20 } }),
  component: DashboardPage,
})

function DashboardPage() {
  const initialRuns = Route.useLoaderData()
  const navigate = useNavigate()
  const [runs, setRuns] = useState(initialRuns)
  const [formState, setFormState] = useState<StartRunInput>(DEFAULT_FORM_STATE)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string>()

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
  const latestActiveRun = activeRuns[0]

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(undefined)
    setIsSubmitting(true)

    startTransition(async () => {
      try {
        const payload: StartRunInput = {
          ...formState,
          prefix: formState.prefix?.trim() ? formState.prefix.trim() : undefined,
          startAfter: formState.startAfter?.trim() ? formState.startAfter.trim() : undefined,
          limit: formState.limit ? Number(formState.limit) : undefined,
        }

        const result = await startRun({ data: payload })
        navigate({
          to: "/runs/$runId",
          params: { runId: result.runId },
        })
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : String(submitError))
      } finally {
        setIsSubmitting(false)
      }
    })
  }

  return (
    <div className="min-h-svh bg-[radial-gradient(circle_at_top_left,_rgba(222,116,41,0.22),_transparent_32%),radial-gradient(circle_at_top_right,_rgba(18,61,74,0.24),_transparent_28%),linear-gradient(180deg,_rgba(252,248,241,0.98),_rgba(244,238,229,0.96))]">
      <div className="mx-auto flex min-h-svh max-w-[1480px] flex-col gap-6 px-4 py-6 md:px-6 md:py-8">
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
            <CardContent className="grid gap-3 pt-4 sm:grid-cols-3">
              <DashboardMetric label="Recent runs" value={String(runs.length)} />
              <DashboardMetric label="Active now" value={String(activeRuns.length)} />
              <DashboardMetric
                label="Refresh"
                value={isRefreshing ? "Updating" : "Every 15s"}
                tone={isRefreshing ? "active" : "default"}
              />
            </CardContent>
          </Card>

          <Card className="border border-foreground/10 bg-[#112a33] text-[#f5efe5]">
            <CardHeader className="gap-3 border-b border-white/10">
              <CardTitle className="text-xl tracking-[-0.03em]">Latest active run</CardTitle>
              <CardDescription className="text-[#d3c4b5]">
                Jump back into the newest live execution without searching the history list.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {latestActiveRun ? (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{latestActiveRun.runId}</p>
                      <p className="text-xs text-[#d3c4b5]">
                        {formatRelativeTime(latestActiveRun.createdAt)}
                      </p>
                    </div>
                    <RunStatusBadge status={latestActiveRun.status} />
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <MetricChip label="Scanned" value={String(latestActiveRun.totals.scanned)} />
                    <MetricChip label="Errors" value={String(latestActiveRun.totals.errored)} />
                    <MetricChip label="Created" value={String(latestActiveRun.totals.created)} />
                    <MetricChip label="Updated" value={String(latestActiveRun.totals.updated)} />
                  </div>
                  <Button asChild className="w-full justify-between">
                    <Link to="/runs/$runId" params={{ runId: latestActiveRun.runId }}>
                      Open live run
                      <span className="text-[10px] uppercase tracking-[0.25em]">
                        {latestActiveRun.mode}
                      </span>
                    </Link>
                  </Button>
                </>
              ) : (
                <div className="rounded-none border border-white/10 bg-white/5 p-4 text-sm text-[#d3c4b5]">
                  No active run right now. Launch a new run from the panel to the left.
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
          <Card className="border border-foreground/10 bg-background/88 backdrop-blur-sm">
            <CardHeader className="gap-2 border-b border-border/70">
              <CardTitle className="text-xl tracking-[-0.03em]">Launch a run</CardTitle>
              <CardDescription>
                Defaults are conservative: dry run on, checkpoint resume off, explicit concurrency.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <form className="space-y-5" onSubmit={handleSubmit}>
                <FieldSet>
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="prefix">
                        <FieldTitle>Prefix</FieldTitle>
                      </FieldLabel>
                      <FieldContent>
                        <Input
                          id="prefix"
                          value={formState.prefix ?? ""}
                          onChange={(event) =>
                            setFormState((current) => ({
                              ...current,
                              prefix: event.target.value,
                            }))
                          }
                          placeholder="enriched/**/*.json"
                        />
                        <FieldDescription>
                          Leave empty to use the API default prefix from the server environment.
                        </FieldDescription>
                      </FieldContent>
                    </Field>

                    <div className="grid gap-4 md:grid-cols-2">
                      <NumberField
                        id="limit"
                        label="Limit"
                        value={formState.limit}
                        placeholder="Unlimited"
                        onChange={(value) =>
                          setFormState((current) => ({
                            ...current,
                            limit: value,
                          }))
                        }
                      />
                      <NumberField
                        id="concurrency"
                        label="Concurrency"
                        value={formState.concurrency}
                        min={1}
                        onChange={(value) =>
                          setFormState((current) => ({
                            ...current,
                            concurrency: value ?? 1,
                          }))
                        }
                      />
                      <NumberField
                        id="fileConcurrency"
                        label="File concurrency"
                        value={formState.fileConcurrency}
                        min={1}
                        onChange={(value) =>
                          setFormState((current) => ({
                            ...current,
                            fileConcurrency: value ?? 1,
                          }))
                        }
                      />
                      <Field>
                        <FieldLabel htmlFor="startAfter">
                          <FieldTitle>Start after</FieldTitle>
                        </FieldLabel>
                        <FieldContent>
                          <Input
                            id="startAfter"
                            value={formState.startAfter ?? ""}
                            onChange={(event) =>
                              setFormState((current) => ({
                                ...current,
                                startAfter: event.target.value,
                              }))
                            }
                            placeholder="enriched/last-processed.json"
                          />
                        </FieldContent>
                      </Field>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <BooleanField
                        label="Dry run"
                        description="Calculate creates, updates, diffs, and file uploads without mutating ClickHome."
                        checked={formState.dryRun}
                        onToggle={() =>
                          setFormState((current) => ({
                            ...current,
                            dryRun: !current.dryRun,
                          }))
                        }
                      />
                      <BooleanField
                        label="Resume from checkpoint"
                        description="Continue from the latest unfinished checkpoint when no explicit startAfter is set."
                        checked={formState.resumeFromCheckpoint}
                        onToggle={() =>
                          setFormState((current) => ({
                            ...current,
                            resumeFromCheckpoint: !current.resumeFromCheckpoint,
                          }))
                        }
                      />
                    </div>
                  </FieldGroup>
                </FieldSet>

                {error ? (
                  <div className="border border-destructive/20 bg-destructive/8 px-3 py-2 text-xs text-destructive">
                    {error}
                  </div>
                ) : null}

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Button type="submit" disabled={isSubmitting} className="sm:min-w-48">
                    {isSubmitting ? "Queuing run..." : "Start run"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setFormState(DEFAULT_FORM_STATE)
                      setError(undefined)
                    }}
                  >
                    Reset defaults
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="border border-foreground/10 bg-background/88 backdrop-blur-sm">
            <CardHeader className="gap-2 border-b border-border/70">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-xl tracking-[-0.03em]">Recent runs</CardTitle>
                  <CardDescription>
                    Ordered newest first from the SQLite audit store.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="border-foreground/10">
                  {runs.length} visible
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              {runs.length === 0 ? (
                <div className="border border-border/70 bg-muted/20 px-4 py-5 text-sm text-muted-foreground">
                  No runs recorded yet.
                </div>
              ) : (
                runs.map((run) => <RunListCard key={run.runId} run={run} />)
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  )
}

function DashboardMetric({
  label,
  value,
  tone = "default",
}: {
  label: string
  value: string
  tone?: "default" | "active"
}) {
  return (
    <div
      className={[
        "rounded-none border px-4 py-3",
        tone === "active"
          ? "border-primary/35 bg-primary/10 text-primary"
          : "border-border/70 bg-muted/20",
      ].join(" ")}
    >
      <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl leading-none tracking-[-0.04em]">{value}</p>
    </div>
  )
}

function MetricChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-none border border-white/10 bg-white/5 px-3 py-2">
      <p className="text-[10px] uppercase tracking-[0.2em] text-[#d3c4b5]">{label}</p>
      <p className="mt-1 text-sm font-medium text-white">{value}</p>
    </div>
  )
}

function NumberField({
  id,
  label,
  value,
  min,
  placeholder,
  onChange,
}: {
  id: string
  label: string
  value?: number
  min?: number
  placeholder?: string
  onChange: (value?: number) => void
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>
        <FieldTitle>{label}</FieldTitle>
      </FieldLabel>
      <FieldContent>
        <Input
          id={id}
          type="number"
          min={min}
          value={value ?? ""}
          placeholder={placeholder}
          onChange={(event) =>
            onChange(event.target.value === "" ? undefined : Number(event.target.value))
          }
        />
      </FieldContent>
    </Field>
  )
}

function BooleanField({
  label,
  description,
  checked,
  onToggle,
}: {
  label: string
  description: string
  checked: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={[
        "flex w-full flex-col gap-2 rounded-none border px-4 py-3 text-left transition-colors",
        checked
          ? "border-primary/30 bg-primary/8"
          : "border-border/70 bg-muted/15 hover:bg-muted/25",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium">{label}</span>
        <Badge variant={checked ? "default" : "outline"}>{checked ? "On" : "Off"}</Badge>
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </button>
  )
}

function RunListCard({ run }: { run: RunListEntry }) {
  return (
    <Link
      to="/runs/$runId"
      params={{ runId: run.runId }}
      className="block rounded-none border border-border/70 bg-muted/12 p-4 transition-colors hover:bg-muted/22"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{run.runId}</span>
            <RunStatusBadge status={run.status} />
            <Badge variant="outline">{run.mode}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Created {formatRelativeTime(run.createdAt)}
            {run.finishedAt ? ` · finished ${formatRelativeTime(run.finishedAt)}` : ""}
          </p>
          {run.error ? (
            <p className="max-w-3xl text-xs text-destructive">{run.error}</p>
          ) : null}
        </div>
        <div className="grid min-w-0 grid-cols-2 gap-2 text-xs md:w-[360px]">
          <RunStat label="Scanned" value={run.totals.scanned} />
          <RunStat label="Errors" value={run.totals.errored} />
          <RunStat label="Created" value={run.totals.created} />
          <RunStat label="Updated" value={run.totals.updated} />
        </div>
      </div>
    </Link>
  )
}

function RunStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-border/70 bg-background/70 px-3 py-2">
      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  )
}

export function RunStatusBadge({ status }: { status: RunListEntry["status"] }) {
  const variant =
    status === "failed"
      ? "destructive"
      : status === "completed"
        ? "secondary"
        : status === "running"
          ? "default"
          : "outline"

  return <Badge variant={variant}>{status.replace("_", " ")}</Badge>
}

function formatRelativeTime(value: string) {
  return formatDistanceToNowStrict(new Date(value), { addSuffix: true })
}
