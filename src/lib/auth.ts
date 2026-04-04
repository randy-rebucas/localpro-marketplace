import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import type { StaffCapability, UserRole } from "@/types";
import { getRedis } from "@/lib/redis";
import { randomUUID, createHmac, timingSafeEqual } from "crypto";

const ACCESS_SECRET = process.env.JWT_SECRET as string;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET as string;

if (!ACCESS_SECRET || ACCESS_SECRET.length < 32) {
  throw new Error("JWT_SECRET must be at least 32 characters");
}
if (!REFRESH_SECRET || REFRESH_SECRET.length < 32) {
  throw new Error("JWT_REFRESH_SECRET must be at least 32 characters");
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
  return jwt.sign({ userId, jti: randomUUID() }, REFRESH_SECRET, { expiresIn: "7d" });
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, ACCESS_SECRET) as TokenPayload;
}

export function verifyRefreshToken(token: string): { userId: string; jti?: string } {
  return jwt.verify(token, REFRESH_SECRET) as { userId: string; jti?: string };
}

/**
 * Adds a refresh token's jti to the Redis deny-list (TTL = 7 days).
 * Called on rotation so the old token cannot be reused.
 */
export async function revokeRefreshToken(jti: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.set(`jwt:refresh-denied:${jti}`, "1", { ex: 7 * 24 * 60 * 60 });
}

/**
 * Returns true if the given refresh token jti has been revoked (i.e. already rotated).
 */
export async function isRefreshTokenRevoked(jti: string): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;
  const revoked = await redis.get(`jwt:refresh-denied:${jti}`);
  return !!revoked;
}

export function setAuthCookies(
  response: NextResponse,
  accessToken: string,
  refreshToken: string
): void {
  const isProd = process.env.NODE_ENV === "production";

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

    // ── Stamp lastSeenAt (throttled to once per 5 min via Redis) ─────────
    void (async () => {
      try {
        if (redis && payload.userId) {
          const seenKey = `seen:5m:${payload.userId}`;
          const already = await redis.get(seenKey);
          if (!already) {
            await redis.set(seenKey, "1", { ex: 5 * 60 });
            const { connectDB } = await import("@/lib/db");
            const { default: User } = await import("@/models/User");
            await connectDB();
            await User.updateOne({ _id: payload.userId }, { $set: { lastSeenAt: new Date() } });
          }
        }
      } catch { /* non-critical */ }
    })();

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
 * Marks all tokens (access + refresh) for a user as revoked by storing a
 * "revoked at" timestamp. Any token with iat <= this timestamp will be
 * rejected. TTL = 7 days (refresh token lifetime — the longer of the two).
 */
export async function revokeAllUserTokens(userId: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.set(`jwt:revoke-user:${userId}`, Math.floor(Date.now() / 1000), { ex: 7 * 24 * 60 * 60 });
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

// ─── CSRF Token Helpers ───────────────────────────────────────────────────────

/**
 * Generates an HMAC-based CSRF token for the given userId.
 * The token encodes the current 1-hour window so it is naturally time-bounded.
 * Two consecutive windows are accepted to avoid edge-case expiry at window boundaries.
 */
export function generateCsrfToken(userId: string): string {
  const window = Math.floor(Date.now() / (60 * 60 * 1000)); // current 1-hour bucket
  const mac = createHmac("sha256", ACCESS_SECRET)
    .update(`${userId}:${window}`)
    .digest("hex");
  return `${window}.${mac}`;
}

/**
 * Validates a CSRF token previously issued by generateCsrfToken.
 * Accepts tokens from the current and previous 1-hour windows.
 */
export function verifyCsrfToken(token: string, userId: string): boolean {
  if (!token) return false;
  const currentWindow = Math.floor(Date.now() / (60 * 60 * 1000));

  for (const w of [currentWindow, currentWindow - 1]) {
    const expected = `${w}.${createHmac("sha256", ACCESS_SECRET).update(`${userId}:${w}`).digest("hex")}`;
    try {
      if (timingSafeEqual(Buffer.from(token), Buffer.from(expected))) return true;
    } catch {
      // Buffer lengths differ — not a match
    }
  }
  return false;
}

/**
 * Extracts and validates the X-CSRF-Token header for the authenticated user.
 * Throws ForbiddenError if missing or invalid.
 */
export function requireCsrfToken(req: NextRequest, user: TokenPayload): void {
  const token = req.headers.get("x-csrf-token") ?? "";
  if (!verifyCsrfToken(token, user.userId)) {
    throw new ForbiddenError("Invalid or missing CSRF token");
  }
}
