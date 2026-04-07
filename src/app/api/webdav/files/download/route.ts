import { NextRequest, NextResponse } from "next/server";
import { downloadFile } from "@/lib/webdav/client";
import { logFileAccess } from "@/lib/audit/logger";
import { requireAuth } from "@/lib/auth";

/**
 * GET /api/webdav/files/download?path=/Documents/report.pdf
 */
export async function GET(request: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const path = request.nextUrl.searchParams.get("path");
  if (!path) {
    return NextResponse.json({ error: "Missing 'path' query parameter" }, { status: 400 });
  }

  try {
    const response = await downloadFile(user, path);

    await logFileAccess({
      action: "download",
      filePath: path,
      userId: user.username,
      userName: user.displayName,
      ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0] || null,
      userAgent: request.headers.get("user-agent"),
    });

    const filename = path.split("/").pop() || "download";
    const contentType = response.headers.get("content-type") || "application/octet-stream";

    return new NextResponse(response.body, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
