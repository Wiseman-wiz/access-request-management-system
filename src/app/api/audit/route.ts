import { NextRequest, NextResponse } from "next/server";
import { getAuditLogs } from "@/lib/audit/logger";
import type { AuditAction } from "@/lib/audit/types";

/**
 * GET /api/audit
 * Query audit logs with optional filters.
 *
 * Query params:
 *   userId   — filter by user ID
 *   action   — filter by action (download, view, upload, delete, move, copy, create_folder)
 *   filePath — filter by file path (partial match)
 *   from     — filter from date (ISO string)
 *   to       — filter to date (ISO string)
 *   limit    — max entries to return (default: 100)
 */
export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;

    const logs = await getAuditLogs({
      userId: params.get("userId") || undefined,
      action: (params.get("action") as AuditAction) || undefined,
      filePath: params.get("filePath") || undefined,
      from: params.get("from") || undefined,
      to: params.get("to") || undefined,
      limit: parseInt(params.get("limit") || "100", 10),
    });

    return NextResponse.json({ logs, count: logs.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
