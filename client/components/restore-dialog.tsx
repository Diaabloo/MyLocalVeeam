"use client"

import { useEffect } from "react"
import { AlertTriangle, Loader2, RotateCcw, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Backup } from "@/lib/backup-data"

export function RestoreDialog({
  backup,
  isRestoring,
  onConfirm,
  onClose,
}: {
  backup: Backup | null
  isRestoring: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !isRestoring) onClose()
    }
    if (backup) document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [backup, isRestoring, onClose])

  if (!backup) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="restore-title"
    >
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-background/70 backdrop-blur-sm"
        onClick={() => !isRestoring && onClose()}
      />

      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <button
          type="button"
          onClick={() => !isRestoring && onClose()}
          className="absolute right-4 top-4 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
          disabled={isRestoring}
          aria-label="Close"
        >
          <X className="size-4" />
        </button>

        <div className="flex size-11 items-center justify-center rounded-xl bg-warning/15 ring-1 ring-inset ring-warning/25">
          <AlertTriangle className="size-5 text-warning" />
        </div>

        <h3 id="restore-title" className="mt-4 text-lg font-semibold tracking-tight">
          Confirm restore
        </h3>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          This will decrypt the snapshot and overwrite the target database. The
          operation cannot be undone.
        </p>

        <dl className="mt-4 space-y-2 rounded-xl border border-border bg-muted/40 p-4 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">Backup ID</dt>
            <dd className="font-mono text-xs">{backup.id}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">Database</dt>
            <dd className="font-mono text-xs">{backup.database}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">Snapshot</dt>
            <dd className="font-mono text-xs">{backup.timestamp}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">Size</dt>
            <dd className="tabular-nums">{backup.size}</dd>
          </div>
        </dl>

        <div className="mt-6 flex justify-end gap-2.5">
          <Button
            variant="ghost"
            size="lg"
            onClick={onClose}
            disabled={isRestoring}
          >
            Cancel
          </Button>
          <Button size="lg" onClick={onConfirm} disabled={isRestoring}>
            {isRestoring ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RotateCcw className="size-4" />
            )}
            {isRestoring ? "Restoring…" : "Restore Now"}
          </Button>
        </div>
      </div>
    </div>
  )
}
