import { NextRequest, NextResponse } from "next/server";
import { moveFile, copyFile } from "@/lib/webdav/client";
import { logFileAccess } from "@/lib/audit/logger";
import { requireAuth } from "@/lib/auth";

interface MoveRequestBody {
  source: string;
  destination: string;
  overwrite?: boolean;
}

/**
 * POST /api/webdav/move
 * Body: { source: "/old/path", destination: "/new/path", overwrite?: false }
 */
export async function POST(request: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;

  try {
    const body = (await request.json()) as MoveRequestBody;

    if (!body.source || !body.destination) {
      return NextResponse.json(
        { error: "Missing 'source' or 'destination' in request body" },
        { status: 400 }
      );
    }

    await moveFile(user, body.source, body.destination, body.overwrite ?? false);

    await logFileAccess({
      action: "move",
      filePath: `${body.source} -> ${body.destination}`,
      userId: user.username,
      userName: user.displayName,
      ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0] || null,
      userAgent: request.headers.get("user-agent"),
    });

    return NextResponse.json({
      message: "Moved successfully",
      source: body.source,
      destination: body.destination,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PUT /api/webdav/move
 * Body: { source: "/old/path", destination: "/copy/path", overwrite?: false }
 */
export async function PUT(request: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;

  try {
    const body = (await request.json()) as MoveRequestBody;

    if (!body.source || !body.destination) {
      return NextResponse.json(
        { error: "Missing 'source' or 'destination' in request body" },
        { status: 400 }
      );
    }

    await copyFile(user, body.source, body.destination, body.overwrite ?? false);

    await logFileAccess({
      action: "copy",
      filePath: `${body.source} -> ${body.destination}`,
      userId: user.username,
      userName: user.displayName,
      ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0] || null,
      userAgent: request.headers.get("user-agent"),
    });

    return NextResponse.json({
      message: "Copied successfully",
      source: body.source,
      destination: body.destination,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
