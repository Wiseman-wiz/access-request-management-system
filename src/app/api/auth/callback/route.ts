import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens, fetchUserInfo } from "@/lib/oauth";
import { createSession } from "@/lib/session";

/**
 * GET /api/auth/callback?code=...&state=...
 *
 * OAuth2 callback handler. Nextcloud redirects here after the user authorizes.
 * Exchanges the authorization code for tokens, fetches user info, and creates a session.
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const storedState = request.cookies.get("oauth_state")?.value;

  // Validate state to prevent CSRF
  if (!state || state !== storedState) {
    return NextResponse.json(
      { error: "Invalid OAuth state. Please try logging in again." },
      { status: 400 }
    );
  }

  if (!code) {
    return NextResponse.json(
      { error: "Missing authorization code." },
      { status: 400 }
    );
  }

  try {
    const origin = request.nextUrl.origin;
    const redirectUri = `${origin}/api/auth/callback`;

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code, redirectUri);

    // Fetch user profile from Nextcloud
    const userInfo = await fetchUserInfo(tokens.access_token);

    // Create encrypted session cookie
    await createSession({
      username: userInfo.username,
      displayName: userInfo.displayName,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: Date.now() + tokens.expires_in * 1000,
    });

    // Clear the oauth_state cookie and redirect to home
    const response = NextResponse.redirect(new URL("/", request.url));
    response.cookies.delete("oauth_state");

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("OAuth callback error:", message);
    return NextResponse.json(
      { error: "Authentication failed", details: message },
      { status: 500 }
    );
  }
}
