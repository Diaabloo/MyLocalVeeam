export type BackupStatus = "success" | "failed" | "running"

export type Backup = {
  id: string
  timestamp: string
  database: string
  size: string
  encryption: string
  status: BackupStatus
}

export type LogLevel = "INFO" | "SEC" | "S3" | "WARN" | "ERROR"

export type LogLine = {
  id: string
  level: LogLevel
  message: string
  time: string
}

export const DATABASES = ["postgres", "app_production", "analytics", "billing_svc"]

export const initialBackups: Backup[] = [
  {
    id: "bkp_8f2a91",
    timestamp: "2026-07-16 12:04:11",
    database: "app_production",
    size: "48.2 MB",
    encryption: "AES-256",
    status: "success",
  },
  {
    id: "bkp_7c1b40",
    timestamp: "2026-07-16 06:00:03",
    database: "postgres",
    size: "12.7 MB",
    encryption: "AES-256",
    status: "success",
  },
  {
    id: "bkp_6a9d22",
    timestamp: "2026-07-15 22:00:09",
    database: "analytics",
    size: "63.9 MB",
    encryption: "AES-256",
    status: "success",
  },
  {
    id: "bkp_5e3f18",
    timestamp: "2026-07-15 18:31:52",
    database: "billing_svc",
    size: "8.1 MB",
    encryption: "AES-256",
    status: "failed",
  },
  {
    id: "bkp_4d8c07",
    timestamp: "2026-07-15 12:00:00",
    database: "app_production",
    size: "47.5 MB",
    encryption: "AES-256",
    status: "success",
  },
  {
    id: "bkp_3b7a55",
    timestamp: "2026-07-15 06:00:02",
    database: "postgres",
    size: "12.4 MB",
    encryption: "AES-256",
    status: "success",
  },
]

export const initialLogs: LogLine[] = [
  { id: "l1", level: "INFO", message: "Scheduler tick — evaluating backup policies", time: "12:04:02" },
  { id: "l2", level: "INFO", message: "Dumping database app_production via pg_dump", time: "12:04:03" },
  { id: "l3", level: "SEC", message: "Fetching AES-256 data key from KMS Vault", time: "12:04:05" },
  { id: "l4", level: "SEC", message: "Encrypting dump with envelope encryption", time: "12:04:07" },
  { id: "l5", level: "S3", message: "Uploading to secure-backups bucket (MinIO)", time: "12:04:09" },
  { id: "l6", level: "INFO", message: "Backup bkp_8f2a91 completed — 48.2 MB", time: "12:04:11" },
]

export function randomHex(len: number) {
  const chars = "0123456789abcdef"
  let out = ""
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)]
  return out
}
