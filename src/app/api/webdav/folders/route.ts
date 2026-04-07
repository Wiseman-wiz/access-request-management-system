import { NextRequest, NextResponse } from "next/server";
import { createFolder } from "@/lib/webdav/client";
import { logFileAccess } from "@/lib/audit/logger";
import { requireAuth } from "@/lib/auth";

/**
 * POST /api/webdav/folders?path=/Documents/NewFolder
 */
export async function POST(request: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const path = request.nextUrl.searchParams.get("path");
  if (!path) {
    return NextResponse.json({ error: "Missing 'path' query parameter" }, { status: 400 });
  }

  try {
    await createFolder(user, path);

    await logFileAccess({
      action: "create_folder",
      filePath: path,
      userId: user.username,
      userName: user.displayName,
      ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0] || null,
      userAgent: request.headers.get("user-agent"),
    });

    return NextResponse.json({ message: "Folder created successfully", path });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
