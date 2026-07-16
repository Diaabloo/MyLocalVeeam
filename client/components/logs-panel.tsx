"use client"

import { useEffect, useRef } from "react"
import { Circle, Terminal } from "lucide-react"
import { cn } from "@/lib/utils"
import type { LogLevel, LogLine } from "@/lib/backup-data"

const levelClasses: Record<LogLevel, string> = {
  INFO: "text-primary",
  SEC: "text-success",
  S3: "text-warning",
  WARN: "text-warning",
  ERROR: "text-destructive",
}

export function LogsPanel({ logs }: { logs: LogLine[] }) {
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [logs])

  return (
    <section className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <Terminal className="size-4 text-primary" />
          <h2 className="text-base font-semibold tracking-tight">
            Security &amp; Logs
          </h2>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-success">
          <Circle className="size-2 fill-success text-success" />
          live
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-background/40 p-4 font-mono text-xs leading-relaxed">
        {logs.map((log) => (
          <div key={log.id} className="flex gap-2 py-0.5">
            <span className="shrink-0 text-muted-foreground/70">{log.time}</span>
            <span className={cn("shrink-0 font-semibold", levelClasses[log.level])}>
              [{log.level}]
            </span>
            <span className="text-foreground/90 break-all">{log.message}</span>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="flex items-center gap-2 border-t border-border px-4 py-2.5 font-mono text-xs text-muted-foreground">
        <span className="text-success">➜</span>
        <span>backup-agent</span>
        <span className="ml-auto inline-block h-3.5 w-1.5 animate-pulse bg-primary" />
      </div>
    </section>
  )
}
