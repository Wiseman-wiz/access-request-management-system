import { NextRequest, NextResponse } from "next/server";
import { downloadFile } from "@/lib/webdav/client";
import { requireAuth } from "@/lib/auth";

/**
 * GET /api/webdav/example?path=/Sample/sammy.md
 *
 * Demonstrates downloading a file using the logged-in user's OAuth2 session.
 */
export async function GET(request: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const path = request.nextUrl.searchParams.get("path");

  if (!path) {
    return NextResponse.json({
      usage: "GET /api/webdav/example?path=/Sample/sammy.md",
      loggedInAs: user.displayName,
    });
  }

  try {
    const response = await downloadFile(user, path);

    const filename = path.split("/").pop() || "download";
    const contentType =
      response.headers.get("content-type") || "application/octet-stream";

    return new NextResponse(response.body, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("WebDAV download error:", message);
    return NextResponse.json({ error: "Download failed", details: message }, { status: 500 });
  }
}
