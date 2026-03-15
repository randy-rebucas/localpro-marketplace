import type { NextRequest } from "next/server";

/**
 * Verifies the Vercel Cron auth header.
 * Vercel injects: Authorization: Bearer <CRON_SECRET>
 * Returns false (denies) when CRON_SECRET is not set.
 * L-9: Emits a console.error at module load time if CRON_SECRET is missing,
 * so the gap is visible immediately in deployment logs.
 */
const _secret = process.env.CRON_SECRET ?? "";
if (!_secret && process.env.NODE_ENV === "production") {
  console.error("[CRON] CRON_SECRET is not set — all cron routes will return 401. Set CRON_SECRET in Vercel environment variables.");
}

export function verifyCronSecret(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET ?? "";
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}
