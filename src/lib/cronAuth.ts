import type { NextRequest } from "next/server";

/**
 * Verifies the Vercel Cron auth header.
 * Vercel injects: Authorization: Bearer <CRON_SECRET>
 * Falls back to "dev-cron-secret" in development when CRON_SECRET is unset,
 * so you can test cron routes locally with: Authorization: Bearer dev-cron-secret
 */
export function verifyCronSecret(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
    ?? (process.env.NODE_ENV === "development" ? "dev-cron-secret" : "");
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}
