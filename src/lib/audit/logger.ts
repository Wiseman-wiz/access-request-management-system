import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import type { AuditAction, AuditLogEntry } from "./types";

const LOG_DIR = path.join(process.cwd(), "logs");
const LOG_FILE = path.join(LOG_DIR, "audit.jsonl");

async function ensureLogDir() {
  await fs.mkdir(LOG_DIR, { recursive: true });
}

/**
 * Write an audit log entry for a file access event.
 * Logs are stored as newline-delimited JSON (JSONL) in logs/audit.jsonl.
 */
export async function logFileAccess(params: {
  action: AuditAction;
  filePath: string;
  userId: string;
  userName: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<AuditLogEntry> {
  await ensureLogDir();

  const entry: AuditLogEntry = {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    action: params.action,
    filePath: params.filePath,
    userId: params.userId,
    userName: params.userName,
    ipAddress: params.ipAddress ?? null,
    userAgent: params.userAgent ?? null,
  };

  await fs.appendFile(LOG_FILE, JSON.stringify(entry) + "\n", "utf-8");
  console.log(`[AUDIT] ${entry.action} | ${entry.filePath} | by ${entry.userName} (${entry.userId})`);

  return entry;
}

/**
 * Read audit logs with optional filters.
 */
export async function getAuditLogs(filters?: {
  userId?: string;
  action?: AuditAction;
  filePath?: string;
  from?: string;
  to?: string;
  limit?: number;
}): Promise<AuditLogEntry[]> {
  await ensureLogDir();

  let content: string;
  try {
    content = await fs.readFile(LOG_FILE, "utf-8");
  } catch {
    return [];
  }

  let entries: AuditLogEntry[] = content
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));

  if (filters?.userId) {
    entries = entries.filter((e) => e.userId === filters.userId);
  }
  if (filters?.action) {
    entries = entries.filter((e) => e.action === filters.action);
  }
  if (filters?.filePath) {
    entries = entries.filter((e) => e.filePath.includes(filters.filePath!));
  }
  if (filters?.from) {
    entries = entries.filter((e) => e.timestamp >= filters.from!);
  }
  if (filters?.to) {
    entries = entries.filter((e) => e.timestamp <= filters.to!);
  }

  // Most recent first
  entries.reverse();

  if (filters?.limit) {
    entries = entries.slice(0, filters.limit);
  }

  return entries;
}
