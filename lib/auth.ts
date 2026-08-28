import { getDb, getUserById } from "./db";
import type { User } from "./types";

export const USER_COOKIE = "fc_user";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function userCookieHeader(userId: number): string {
  return `${USER_COOKIE}=${userId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${COOKIE_MAX_AGE}`;
}

export function clearUserCookieHeader(): string {
  return `${USER_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function currentUser(request: Request): User | null {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key !== USER_COOKIE) continue;
    const id = Number(rest.join("="));
    if (!Number.isInteger(id)) return null;
    return getUserById(id);
  }
  return null;
}

export function ensureDefaultFamily(): void {
  const db = getDb();
  const existing = db
    .prepare("SELECT id FROM users LIMIT 1")
    .get();
  if (existing) return;
  db.prepare(
    "INSERT INTO users (name, birthday, device_id) VALUES (?, ?, ?)"
  ).run("Familie", "01.01.2000", null);
}
