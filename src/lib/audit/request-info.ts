import { NextRequest } from "next/server";

/**
 * Extract user identity and request metadata from the incoming request.
 *
 * User identity is expected via headers — set these from your auth layer
 * (e.g. middleware that validates a session/token and injects headers).
 *
 * Headers used:
 *   x-user-id    — unique user identifier
 *   x-user-name  — display name
 */
export function getUserFromRequest(request: NextRequest) {
  return {
    userId: request.headers.get("x-user-id") || "anonymous",
    userName: request.headers.get("x-user-name") || "Anonymous User",
    ipAddress:
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      null,
    userAgent: request.headers.get("user-agent") || null,
  };
}
