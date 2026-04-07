import { NextRequest, NextResponse } from "next/server";
import { listFiles, uploadFile, deleteFile } from "@/lib/webdav/client";
import { logFileAccess } from "@/lib/audit/logger";
import { requireAuth } from "@/lib/auth";

/**
 * GET /api/webdav/files?path=/Documents
 */
export async function GET(request: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const path = request.nextUrl.searchParams.get("path") || "/";

  try {
    const result = await listFiles(user, path);

    await logFileAccess({
      action: "view",
      filePath: path,
      userId: user.username,
      userName: user.displayName,
      ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0] || null,
      userAgent: request.headers.get("user-agent"),
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/webdav/files?path=/Documents/report.pdf
 */
export async function POST(request: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const path = request.nextUrl.searchParams.get("path");
  if (!path) {
    return NextResponse.json({ error: "Missing 'path' query parameter" }, { status: 400 });
  }

  try {
    const contentType = request.headers.get("content-type") || "application/octet-stream";
    const body = Buffer.from(await request.arrayBuffer());

    await uploadFile(user, path, body, contentType);

    await logFileAccess({
      action: "upload",
      filePath: path,
      userId: user.username,
      userName: user.displayName,
      ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0] || null,
      userAgent: request.headers.get("user-agent"),
    });

    return NextResponse.json({ message: "File uploaded successfully", path });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/webdav/files?path=/Documents/old-file.txt
 */
export async function DELETE(request: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const path = request.nextUrl.searchParams.get("path");
  if (!path) {
    return NextResponse.json({ error: "Missing 'path' query parameter" }, { status: 400 });
  }

  try {
    await deleteFile(user, path);

    await logFileAccess({
      action: "delete",
      filePath: path,
      userId: user.username,
      userName: user.displayName,
      ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0] || null,
      userAgent: request.headers.get("user-agent"),
    });

    return NextResponse.json({ message: "Deleted successfully", path });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
