"use client"

import { DatabaseBackup, History, Loader2, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"

export function QuickActions({
  isBackingUp,
  isTesting,
  onTriggerBackup,
  onTestRestore,
}: {
  isBackingUp: boolean
  isTesting: boolean
  onTriggerBackup: () => void
  onTestRestore: () => void
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-xl space-y-1.5">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
            <ShieldCheck className="size-3.5" />
            End-to-end encrypted pipeline
          </div>
          <h2 className="text-xl font-semibold tracking-tight text-pretty">
            Protect your databases on demand
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Dump, encrypt with AES-256 keys from your KMS Vault, and ship to
            secure S3 storage — all in a single click.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            size="lg"
            onClick={onTriggerBackup}
            disabled={isBackingUp}
            className="h-11 px-5 text-sm"
          >
            {isBackingUp ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <DatabaseBackup className="size-4" />
            )}
            {isBackingUp ? "Backing up…" : "Trigger Backup Now"}
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={onTestRestore}
            disabled={isTesting}
            className="h-11 px-5 text-sm"
          >
            {isTesting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <History className="size-4" />
            )}
            {isTesting ? "Verifying…" : "Test Restore"}
          </Button>
        </div>
      </div>
    </section>
  )
}
