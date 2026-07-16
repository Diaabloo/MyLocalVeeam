import { KeyRound, ShieldCheck, Database } from "lucide-react"

function ConnectionPill({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof KeyRound
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-success/25 bg-success/10 px-3 py-1.5">
      <span className="relative flex size-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
        <span className="relative inline-flex size-2 rounded-full bg-success" />
      </span>
      <Icon className="size-4 text-success" />
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-semibold text-success">{value}</span>
    </div>
  )
}

export function DashboardHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-inset ring-primary/25">
            <ShieldCheck className="size-6 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-balance">
              MyLocalVeeam
            </h1>
            <p className="text-xs text-muted-foreground">
              Local PostgreSQL backup console
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ConnectionPill icon={KeyRound} label="KMS Vault" value="Connected" />
          <ConnectionPill icon={Database} label="S3 Storage" value="Active" />
        </div>
      </div>
    </header>
  )
}
