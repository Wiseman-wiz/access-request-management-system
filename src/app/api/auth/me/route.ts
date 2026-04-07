import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

/**
 * GET /api/auth/me
 * Returns the currently logged-in user info (no password).
 */
export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      { error: "Not authenticated" },
      { status: 401 }
    );
  }

  return NextResponse.json({
    user: {
      username: session.username,
      displayName: session.displayName,
    },
  });
}
