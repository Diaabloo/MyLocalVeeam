"use client"

import { useMemo, useState } from "react"
import { CheckCircle2 } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard-header"
import { QuickActions } from "@/components/quick-actions"
import { MetricsGrid } from "@/components/metrics-grid"
import { BackupsTable } from "@/components/backups-table"
import { LogsPanel } from "@/components/logs-panel"
import { RestoreDialog } from "@/components/restore-dialog"
import {
  DATABASES,
  initialBackups,
  initialLogs,
  randomHex,
  type Backup,
  type LogLine,
} from "@/lib/backup-data"

function now() {
  return new Date().toLocaleTimeString("en-GB", { hour12: false })
}

function timestamp() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

export default function Page() {
  const [backups, setBackups] = useState<Backup[]>(initialBackups)
  const [logs, setLogs] = useState<LogLine[]>(initialLogs)
  const [isBackingUp, setIsBackingUp] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [restoreTarget, setRestoreTarget] = useState<Backup | null>(null)
  const [isRestoring, setIsRestoring] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const storageUsed = useMemo(() => {
    const total = backups
      .filter((b) => b.status === "success")
      .reduce((sum, b) => sum + Number.parseFloat(b.size), 0)
    return `${total.toFixed(1)} MB`
  }, [backups])

  const lastStatus = useMemo(() => {
    const last = backups.find((b) => b.status === "success")
    return last ? `${last.database} · ${last.timestamp.split(" ")[1]}` : "—"
  }, [backups])

  function pushLog(level: LogLine["level"], message: string) {
    setLogs((prev) => [
      ...prev,
      { id: `${Date.now()}-${randomHex(4)}`, level, message, time: now() },
    ])
  }

  function showToast(message: string) {
    setToast(message)
    window.setTimeout(() => setToast(null), 3500)
  }

  function handleTriggerBackup() {
    if (isBackingUp) return
    setIsBackingUp(true)
    const db = DATABASES[Math.floor(Math.random() * DATABASES.length)]
    const id = `bkp_${randomHex(6)}`

    const steps: Array<[number, LogLine["level"], string]> = [
      [200, "INFO", `Dumping database ${db} via pg_dump`],
      [1000, "SEC", "Fetching AES-256 data key from KMS Vault"],
      [1800, "SEC", "Encrypting dump with envelope encryption"],
      [2600, "S3", "Uploading to secure-backups bucket (MinIO)"],
    ]
    steps.forEach(([delay, level, message]) =>
      window.setTimeout(() => pushLog(level, message), delay),
    )

    window.setTimeout(() => {
      const size = `${(Math.random() * 60 + 5).toFixed(1)} MB`
      setBackups((prev) => [
        {
          id,
          timestamp: timestamp(),
          database: db,
          size,
          encryption: "AES-256",
          status: "success",
        },
        ...prev,
      ])
      pushLog("INFO", `Backup ${id} completed — ${size}`)
      setIsBackingUp(false)
      showToast(`Backup ${id} completed successfully`)
    }, 3400)
  }

  function handleTestRestore() {
    if (isTesting) return
    setIsTesting(true)
    pushLog("INFO", "Starting sandbox restore verification")
    window.setTimeout(
      () => pushLog("SEC", "Decrypting latest snapshot in isolated volume"),
      900,
    )
    window.setTimeout(
      () => pushLog("S3", "Streaming snapshot from secure-backups bucket"),
      1700,
    )
    window.setTimeout(() => {
      pushLog("INFO", "Restore verification passed — integrity OK")
      setIsTesting(false)
      showToast("Test restore verified — backups are recoverable")
    }, 2600)
  }

  function handleConfirmRestore() {
    if (!restoreTarget) return
    setIsRestoring(true)
    pushLog("SEC", `Fetching AES-256 key to restore ${restoreTarget.id}`)
    window.setTimeout(
      () =>
        pushLog(
          "S3",
          `Downloading ${restoreTarget.id} from secure-backups bucket`,
        ),
      900,
    )
    window.setTimeout(() => {
      pushLog(
        "INFO",
        `Restored ${restoreTarget.database} from ${restoreTarget.id}`,
      )
      setIsRestoring(false)
      showToast(`Restored ${restoreTarget.database} successfully`)
      setRestoreTarget(null)
    }, 2100)
  }

  return (
    <div className="min-h-svh bg-background text-foreground">
      <DashboardHeader />

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6 md:py-8">
        <QuickActions
          isBackingUp={isBackingUp}
          isTesting={isTesting}
          onTriggerBackup={handleTriggerBackup}
          onTestRestore={handleTestRestore}
        />

        <MetricsGrid
          totalBackups={backups.length}
          storageUsed={storageUsed}
          lastStatus={lastStatus}
        />

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <BackupsTable backups={backups} onRestore={setRestoreTarget} />
          </div>
          <div className="min-h-[420px] xl:col-span-1">
            <LogsPanel logs={logs} />
          </div>
        </div>
      </main>

      <RestoreDialog
        backup={restoreTarget}
        isRestoring={isRestoring}
        onConfirm={handleConfirmRestore}
        onClose={() => !isRestoring && setRestoreTarget(null)}
      />

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-success/25 bg-card px-4 py-2.5 text-sm shadow-xl">
          <CheckCircle2 className="size-4 text-success" />
          <span>{toast}</span>
        </div>
      )}
    </div>
  )
}
