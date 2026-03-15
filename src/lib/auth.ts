import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { StaffCapability, UserRole } from "@/types";
import { getRedis } from "@/lib/redis";
import { randomUUID } from "crypto";

const ACCESS_SECRET = process.env.JWT_SECRET as string;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET as string;

if (!ACCESS_SECRET || !REFRESH_SECRET) {
  throw new Error("JWT secrets must be defined in environment variables");
}

export const STAFF_CAPABILITIES: StaffCapability[] = [
  "manage_jobs",
  "manage_kyc",
  "manage_disputes",
  "manage_users",
  "manage_agencies",
  "manage_businesses",
  "view_revenue",
  "manage_payouts",
  "manage_categories",
  "manage_support",
  "manage_courses",
];

export interface TokenPayload {
  userId: string;
  role: UserRole;
  capabilities?: string[];
  /** Unique token ID — used for revocation deny-listing */
  jti?: string;
  iat?: number;
  exp?: number;
}

export function signAccessToken(userId: string, role: UserRole, capabilities?: string[]): string {
  const payload: Record<string, unknown> = { userId, role, jti: randomUUID() };
  if (capabilities?.length) payload.capabilities = capabilities;
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: "15m" });
}

export function signRefreshToken(userId: string): string {
  return jwt.sign({ userId }, REFRESH_SECRET, { expiresIn: "7d" });
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, ACCESS_SECRET) as TokenPayload;
}

export function verifyRefreshToken(token: string): { userId: string } {
  return jwt.verify(token, REFRESH_SECRET) as { userId: string };
}

export function setAuthCookies(
  response: NextResponse,
  accessToken: string,
  refreshToken: string
): void {
  const isProd = process.env.NODE_ENV === "production";

  // SECURITY NOTE — JWT revocation gap:
  // Access tokens are stateless and cannot be individually revoked before they
  // expire (15 min). If a token must be invalidated immediately (e.g. account
  // ban, password change), the only current mitigation is the short lifetime.
  // TODO: implement a Redis-backed token deny-list checked in `requireUser`
  // to enable instant revocation when needed.

  // L2: secure is always true in production. Set to false only in local dev
  //     over plain HTTP (e.g., http://localhost). In staging and prod, HTTPS
  //     is enforced so secure:true is always safe.
  const isSecure = isProd || process.env.ALLOW_INSECURE_COOKIES !== "true";

  response.cookies.set("access_token", accessToken, {
    httpOnly: true,
    secure: isSecure,
    // "lax" sends the cookie on top-level cross-site navigations (e.g. redirect
    // back from PayMongo / PayPal checkout) while still blocking it on cross-site
    // sub-requests (fetch, img, form POST) — preventing CSRF.
    // "strict" was causing logout after external payment redirects because the
    // browser withholds strict cookies on any cross-site navigation.
    sameSite: "lax",
    maxAge: 60 * 15, // 15 minutes
    path: "/",
  });

  response.cookies.set("refresh_token", refreshToken, {
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax", // same rationale as access_token above
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });
}

export function clearAuthCookies(response: NextResponse): void {
  response.cookies.set("access_token", "", { maxAge: 0, path: "/" });
  response.cookies.set("refresh_token", "", { maxAge: 0, path: "/" });
}

export async function getTokenFromCookies(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get("access_token")?.value;
}

export async function getCurrentUser(): Promise<TokenPayload | null> {
  try {
    const token = await getTokenFromCookies();
    if (!token) return null;
    const payload = verifyAccessToken(token);

    // ── Deny-list check (Redis-backed revocation) ─────────────────────────
    const redis = getRedis();
    if (redis && payload.jti) {
      const revoked = await redis.get(`jwt:denied:${payload.jti}`);
      if (revoked) return null;
    }
    // ── Per-user revocation (password change / ban) ───────────────────────
    if (redis && payload.userId) {
      const revokedAt = await redis.get<number>(`jwt:revoke-user:${payload.userId}`);
      if (revokedAt && payload.iat && payload.iat <= revokedAt) return null;
    }

    return payload;
  } catch {
    return null;
  }
}

// ─── Route-level auth guards ───────────────────────────────────────────────────
import { UnauthorizedError, ForbiddenError } from "@/lib/errors";

// ─── Token revocation helpers ─────────────────────────────────────────────────

/** Adds a single token's jti to the Redis deny-list (TTL = 15 min). */
export async function revokeToken(jti: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.set(`jwt:denied:${jti}`, "1", { ex: 15 * 60 });
}

/**
 * Marks all access tokens for a user as revoked by storing a "revoked at"
 * timestamp. Any token with iat <= this timestamp will be rejected.
 * TTL = 15 min (access token lifetime).
 */
export async function revokeAllUserTokens(userId: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.set(`jwt:revoke-user:${userId}`, Math.floor(Date.now() / 1000), { ex: 15 * 60 });
}

/** Throws UnauthorizedError if no valid session. */
export async function requireUser(): Promise<TokenPayload> {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError();
  return user;
}

/** Throws ForbiddenError if user's role is not in the allowed list. */
export function requireRole(user: TokenPayload, ...roles: UserRole[]): void {
  if (!roles.includes(user.role)) throw new ForbiddenError();
}

/**
 * Throws ForbiddenError unless the user is an admin OR has the given capability.
 * Use this on routes that staff members may access based on their assigned capabilities.
 */
export function requireCapability(user: TokenPayload, capability: StaffCapability): void {
  if (user.role === "admin") return;
  if (user.capabilities?.includes(capability)) return;
  throw new ForbiddenError();
}
