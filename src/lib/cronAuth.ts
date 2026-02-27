import type { NextRequest } from "next/server";

/**
 * Verifies the Vercel Cron auth header.
 * Vercel injects: Authorization: Bearer <CRON_SECRET>
 * In development (no CRON_SECRET set) all requests are allowed.
 */
export function verifyCronSecret(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV === "development";
  return req.headers.get("authorization") === `Bearer ${secret}`;
}
