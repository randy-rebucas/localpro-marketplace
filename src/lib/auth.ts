import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const ACCESS_SECRET = process.env.JWT_SECRET as string;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET as string;

if (!ACCESS_SECRET || !REFRESH_SECRET) {
  throw new Error("JWT secrets must be defined in environment variables");
}

export interface TokenPayload {
  userId: string;
  role: "client" | "provider" | "admin";
  iat?: number;
  exp?: number;
}

export function signAccessToken(userId: string, role: "client" | "provider" | "admin"): string {
  return jwt.sign({ userId, role }, ACCESS_SECRET, { expiresIn: "15m" });
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

  response.cookies.set("access_token", accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "strict",
    maxAge: 60 * 15, // 15 minutes
    path: "/",
  });

  response.cookies.set("refresh_token", refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "strict",
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
    return verifyAccessToken(token);
  } catch {
    return null;
  }
}

// ─── Route-level auth guards ───────────────────────────────────────────────────
import { UnauthorizedError, ForbiddenError } from "@/lib/errors";
import type { UserRole } from "@/types";

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
