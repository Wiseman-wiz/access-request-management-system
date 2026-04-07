const NEXTCLOUD_URL = process.env.NEXTCLOUD_URL!.replace(/\/+$/, "");
const CLIENT_ID = process.env.NEXTCLOUD_CLIENT_ID!;
const CLIENT_SECRET = process.env.NEXTCLOUD_CLIENT_SECRET!;

export const AUTHORIZE_URL = `${NEXTCLOUD_URL}/index.php/apps/oauth2/authorize`;
export const TOKEN_URL = `${NEXTCLOUD_URL}/index.php/apps/oauth2/api/v1/token`;
export const USER_INFO_URL = `${NEXTCLOUD_URL}/ocs/v2.php/cloud/user`;

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  user_id: string;
}

/**
 * Build the Nextcloud OAuth2 authorization URL.
 */
export function getAuthorizationUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: CLIENT_ID,
    redirect_uri: redirectUri,
    state,
  });

  return `${AUTHORIZE_URL}?${params.toString()}`;
}

/**
 * Exchange an authorization code for access and refresh tokens.
 */
export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string
): Promise<TokenResponse> {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Token exchange failed: ${response.status} — ${text}`);
  }

  return response.json();
}

/**
 * Refresh an expired access token using the refresh token.
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<TokenResponse> {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Token refresh failed: ${response.status} — ${text}`);
  }

  return response.json();
}

/**
 * Fetch the logged-in user's profile from Nextcloud using their access token.
 */
export async function fetchUserInfo(
  accessToken: string
): Promise<{ username: string; displayName: string }> {
  const response = await fetch(USER_INFO_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "OCS-APIRequest": "true",
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch user info: ${response.status}`);
  }

  const data = await response.json();
  const user = data.ocs?.data;

  return {
    username: user?.id || "",
    displayName: user?.["display-name"] || user?.displayname || user?.id || "",
  };
}
