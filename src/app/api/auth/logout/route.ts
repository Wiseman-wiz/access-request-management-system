import { NextResponse } from "next/server";
import { destroySession } from "@/lib/session";

/**
 * POST /api/auth/logout
 * Destroys the session cookie.
 */
export async function POST() {
  await destroySession();
  return NextResponse.json({ message: "Logged out successfully" });
}
