import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getAuthorizationUrl } from "@/lib/oauth";

/**
 * GET /api/auth/login
 *
 * Redirects the user to Nextcloud's OAuth2 authorization page.
 * After the user grants access, Nextcloud redirects back to /api/auth/callback.
 */
export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const redirectUri = `${origin}/api/auth/callback`;
  const state = randomUUID();

  const url = getAuthorizationUrl(redirectUri, state);

  const response = NextResponse.redirect(url);

  // Store state in a short-lived cookie to validate on callback
  response.cookies.set("oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10, // 10 minutes
  });

  return response;
}
