import type { NextRequest } from "next/server";

/**
 * Verifies the Vercel Cron auth header.
 * Vercel injects: Authorization: Bearer <CRON_SECRET>
 * Returns false (denies) when CRON_SECRET is not set.
 * To test locally: set CRON_SECRET in .env.local and pass the same value in the Authorization header.
 */
export function verifyCronSecret(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET ?? "";
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}
