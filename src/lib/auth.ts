import { NextResponse } from "next/server";
import { getSession, updateSession } from "./session";
import { refreshAccessToken } from "./oauth";

export interface AuthenticatedUser {
  accessToken: string;
  username: string;
  displayName: string;
}

/**
 * Get the authenticated user from the session.
 * Automatically refreshes the access token if expired.
 * Returns the user or a 401 response if not logged in.
 */
export async function requireAuth(): Promise<
  | { user: AuthenticatedUser; error?: never }
  | { user?: never; error: NextResponse }
> {
  const session = await getSession();

  if (!session) {
    return {
      error: NextResponse.json(
        { error: "Not authenticated. Redirect to /api/auth/login to sign in." },
        { status: 401 }
      ),
    };
  }

  let { accessToken } = session;

  // Auto-refresh if token is expired (with 60s buffer)
  if (Date.now() >= session.expiresAt - 60_000) {
    try {
      const tokens = await refreshAccessToken(session.refreshToken);

      accessToken = tokens.access_token;

      await updateSession({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: Date.now() + tokens.expires_in * 1000,
      });
    } catch {
      return {
        error: NextResponse.json(
          { error: "Session expired. Please log in again." },
          { status: 401 }
        ),
      };
    }
  }

  return {
    user: {
      accessToken,
      username: session.username,
      displayName: session.displayName,
    },
  };
}
