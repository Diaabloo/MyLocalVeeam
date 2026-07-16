import { Archive, HardDrive, Lock, CheckCircle2, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

type Metric = {
  label: string
  value: string
  sub: string
  icon: LucideIcon
  tone: "primary" | "success" | "muted"
}

const toneClasses: Record<Metric["tone"], string> = {
  primary: "bg-primary/15 text-primary ring-primary/25",
  success: "bg-success/15 text-success ring-success/25",
  muted: "bg-muted text-muted-foreground ring-border",
}

export function MetricsGrid({
  totalBackups,
  storageUsed,
  lastStatus,
}: {
  totalBackups: number
  storageUsed: string
  lastStatus: string
}) {
  const metrics: Metric[] = [
    {
      label: "Total Backups",
      value: String(totalBackups),
      sub: "across 4 databases",
      icon: Archive,
      tone: "primary",
    },
    {
      label: "Storage Used",
      value: storageUsed,
      sub: "S3 · MinIO bucket",
      icon: HardDrive,
      tone: "muted",
    },
    {
      label: "Encryption Status",
      value: "AES-256",
      sub: "Enabled · KMS Vault",
      icon: Lock,
      tone: "success",
    },
    {
      label: "Last Backup",
      value: "Success",
      sub: lastStatus,
      icon: CheckCircle2,
      tone: "success",
    },
  ]

  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((m) => (
        <div
          key={m.label}
          className="rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/30"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">{m.label}</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight">
                {m.value}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{m.sub}</p>
            </div>
            <div
              className={cn(
                "flex size-10 items-center justify-center rounded-xl ring-1 ring-inset",
                toneClasses[m.tone],
              )}
            >
              <m.icon className="size-5" />
            </div>
          </div>
        </div>
      ))}
    </section>
  )
}
