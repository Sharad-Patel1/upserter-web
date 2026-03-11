import { cn } from "@/lib/utils"

export function SummaryMetric({
  label,
  value,
  tone = "default",
}: {
  label: string
  value: number | string
  tone?: "default" | "active" | "error"
}) {
  return (
    <div
      className={cn(
        "border px-4 py-3",
        tone === "active"
          ? "border-primary/35 bg-primary/10 text-primary"
          : tone === "error"
            ? "border-destructive/30 bg-destructive/8 text-destructive"
            : "border-border/70 bg-muted/18"
      )}
    >
      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl leading-none tracking-[-0.04em]">{value}</p>
    </div>
  )
}

export function SummaryStrip({
  title,
  value,
  detail,
}: {
  title: string
  value: number | string
  detail: string
}) {
  return (
    <div className="border border-border/70 bg-muted/16 px-4 py-3">
      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{title}</p>
      <p className="mt-2 break-all text-sm font-medium">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </div>
  )
}

export function MetricChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-none border border-white/10 bg-white/5 px-3 py-2">
      <p className="text-[10px] uppercase tracking-[0.2em] text-[#d3c4b5]">{label}</p>
      <p className="mt-1 text-sm font-medium text-white">{value}</p>
    </div>
  )
}

export function MutedState({
  message,
  tone = "default",
}: {
  message: string
  tone?: "default" | "error"
}) {
  return (
    <div
      className={cn(
        "border px-4 py-5 text-sm",
        tone === "error"
          ? "border-destructive/20 bg-destructive/8 text-destructive"
          : "border-border/70 bg-muted/16 text-muted-foreground"
      )}
    >
      {message}
    </div>
  )
}
