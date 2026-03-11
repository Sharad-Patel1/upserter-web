import {  startTransition, useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { toast } from "sonner"
import type {FormEvent} from "react";

import type { StartRunInput } from "@/lib/run-types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field"
import { startRun } from "@/lib/run.functions"

const DEFAULT_FORM_STATE: StartRunInput = {
  dryRun: true,
  prefix: "",
  concurrency: 5,
  fileConcurrency: 2,
  resumeFromCheckpoint: false,
}

export function LaunchRunSheet({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [formState, setFormState] = useState<StartRunInput>(DEFAULT_FORM_STATE)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string>()

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
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
        setOpen(false)
        toast.success("Run queued", {
          description: `${result.mode} run ${result.runId.slice(0, 8)}... started`,
        })
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
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Launch a run</SheetTitle>
          <SheetDescription>
            Defaults are conservative: dry run on, checkpoint resume off, explicit concurrency.
          </SheetDescription>
        </SheetHeader>

        <form className="space-y-5 px-4 pb-4" onSubmit={handleSubmit}>
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
                      setFormState((c) => ({ ...c, prefix: event.target.value }))
                    }
                    placeholder="enriched/**/*.json"
                  />
                  <FieldDescription>
                    Leave empty to use the API default prefix from the server environment.
                  </FieldDescription>
                </FieldContent>
              </Field>

              <div className="grid gap-4 md:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="limit">
                    <FieldTitle>Limit</FieldTitle>
                  </FieldLabel>
                  <FieldContent>
                    <Input
                      id="limit"
                      type="number"
                      value={formState.limit ?? ""}
                      placeholder="Unlimited"
                      onChange={(event) =>
                        setFormState((c) => ({
                          ...c,
                          limit: event.target.value === "" ? undefined : Number(event.target.value),
                        }))
                      }
                    />
                  </FieldContent>
                </Field>
                <Field>
                  <FieldLabel htmlFor="concurrency">
                    <FieldTitle>Concurrency</FieldTitle>
                  </FieldLabel>
                  <FieldContent>
                    <Input
                      id="concurrency"
                      type="number"
                      min={1}
                      value={formState.concurrency}
                      onChange={(event) =>
                        setFormState((c) => ({
                          ...c,
                          concurrency:
                            event.target.value === "" ? 1 : Number(event.target.value),
                        }))
                      }
                    />
                  </FieldContent>
                </Field>
                <Field>
                  <FieldLabel htmlFor="fileConcurrency">
                    <FieldTitle>File concurrency</FieldTitle>
                  </FieldLabel>
                  <FieldContent>
                    <Input
                      id="fileConcurrency"
                      type="number"
                      min={1}
                      value={formState.fileConcurrency}
                      onChange={(event) =>
                        setFormState((c) => ({
                          ...c,
                          fileConcurrency:
                            event.target.value === "" ? 1 : Number(event.target.value),
                        }))
                      }
                    />
                  </FieldContent>
                </Field>
                <Field>
                  <FieldLabel htmlFor="startAfter">
                    <FieldTitle>Start after</FieldTitle>
                  </FieldLabel>
                  <FieldContent>
                    <Input
                      id="startAfter"
                      value={formState.startAfter ?? ""}
                      onChange={(event) =>
                        setFormState((c) => ({ ...c, startAfter: event.target.value }))
                      }
                      placeholder="enriched/last-processed.json"
                    />
                  </FieldContent>
                </Field>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center justify-between gap-3 rounded-sm border border-border/70 px-4 py-3">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Dry run</p>
                    <p className="text-xs text-muted-foreground">
                      Calculate without mutating ClickHome.
                    </p>
                  </div>
                  <Switch
                    checked={formState.dryRun}
                    onCheckedChange={(checked) =>
                      setFormState((c) => ({ ...c, dryRun: checked }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between gap-3 rounded-sm border border-border/70 px-4 py-3">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Resume checkpoint</p>
                    <p className="text-xs text-muted-foreground">
                      Continue from the latest unfinished checkpoint.
                    </p>
                  </div>
                  <Switch
                    checked={formState.resumeFromCheckpoint}
                    onCheckedChange={(checked) =>
                      setFormState((c) => ({ ...c, resumeFromCheckpoint: checked }))
                    }
                  />
                </div>
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
      </SheetContent>
    </Sheet>
  )
}
