"use client"

import { Download, Lock, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/status-badge"
import type { Backup } from "@/lib/backup-data"

export function BackupsTable({
  backups,
  onRestore,
}: {
  backups: Backup[]
  onRestore: (backup: Backup) => void
}) {
  return (
    <section className="rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h2 className="text-base font-semibold tracking-tight">
            Backup History
          </h2>
          <p className="text-xs text-muted-foreground">
            Encrypted snapshots stored in secure-backups
          </p>
        </div>
        <span className="rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
          {backups.length} records
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-5 py-3 font-medium">Backup ID</th>
              <th className="px-5 py-3 font-medium">Date / Time</th>
              <th className="px-5 py-3 font-medium">Database</th>
              <th className="px-5 py-3 font-medium">Size</th>
              <th className="px-5 py-3 font-medium">Encryption</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {backups.map((b) => (
              <tr
                key={b.id}
                className="border-b border-border/60 transition-colors last:border-0 hover:bg-muted/40"
              >
                <td className="px-5 py-3.5">
                  <span className="font-mono text-xs text-foreground">{b.id}</span>
                </td>
                <td className="px-5 py-3.5 font-mono text-xs text-muted-foreground">
                  {b.timestamp}
                </td>
                <td className="px-5 py-3.5">
                  <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs">
                    {b.database}
                  </span>
                </td>
                <td className="px-5 py-3.5 tabular-nums text-muted-foreground">
                  {b.size}
                </td>
                <td className="px-5 py-3.5">
                  <span className="inline-flex items-center gap-1.5 text-xs text-success">
                    <Lock className="size-3.5" />
                    {b.encryption}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <StatusBadge status={b.status} />
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center justify-end gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={b.status !== "success"}
                      onClick={() => onRestore(b)}
                    >
                      <RotateCcw className="size-3.5" />
                      Restore
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={b.status !== "success"}
                      aria-label={`Download backup ${b.id}`}
                    >
                      <Download className="size-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
