import { CheckCircle2, Loader2, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { BackupStatus } from "@/lib/backup-data"

const config: Record<
  BackupStatus,
  { label: string; className: string; icon: typeof CheckCircle2; spin?: boolean }
> = {
  success: {
    label: "Success",
    className: "bg-success/15 text-success border-success/25",
    icon: CheckCircle2,
  },
  failed: {
    label: "Failed",
    className: "bg-destructive/15 text-destructive border-destructive/25",
    icon: XCircle,
  },
  running: {
    label: "Running",
    className: "bg-primary/15 text-primary border-primary/25",
    icon: Loader2,
    spin: true,
  },
}

export function StatusBadge({ status }: { status: BackupStatus }) {
  const { label, className, icon: Icon, spin } = config[status]
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        className,
      )}
    >
      <Icon className={cn("size-3.5", spin && "animate-spin")} />
      {label}
    </span>
  )
}
