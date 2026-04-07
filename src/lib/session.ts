import { cookies } from "next/headers";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const SESSION_COOKIE = "nc_session";
const SECRET = process.env.SESSION_SECRET || "default-secret-change-me-32chr!";

// Ensure 32-byte key for AES-256
const KEY = Buffer.from(SECRET.padEnd(32, "0").slice(0, 32), "utf-8");
const IV_LENGTH = 16;

export interface UserSession {
  username: string;
  displayName: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp in ms
}

function encrypt(text: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-cbc", KEY, iv);
  let encrypted = cipher.update(text, "utf-8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

function decrypt(text: string): string {
  const [ivHex, encrypted] = text.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const decipher = createDecipheriv("aes-256-cbc", KEY, iv);
  let decrypted = decipher.update(encrypted, "hex", "utf-8");
  decrypted += decipher.final("utf-8");
  return decrypted;
}

export async function createSession(session: UserSession): Promise<void> {
  const cookieStore = await cookies();
  const encrypted = encrypt(JSON.stringify(session));

  cookieStore.set(SESSION_COOKIE, encrypted, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8, // 8 hours
  });
}

export async function getSession(): Promise<UserSession | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(SESSION_COOKIE);

  if (!cookie?.value) return null;

  try {
    return JSON.parse(decrypt(cookie.value)) as UserSession;
  } catch {
    return null;
  }
}

export async function updateSession(
  updates: Partial<UserSession>
): Promise<void> {
  const session = await getSession();
  if (!session) return;
  await createSession({ ...session, ...updates });
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
