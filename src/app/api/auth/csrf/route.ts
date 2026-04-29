import { NextResponse } from "next/server";
import { requireUser, generateCsrfToken } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { checkRateLimit } from "@/lib/rateLimit";

/**
 * GET /api/auth/csrf
 *
 * Returns a short-lived CSRF token for the authenticated user.
 */
export const GET = withHandler(async () => {
  const user = await requireUser();
  const rl = await checkRateLimit(`auth:csrf:${user.userId}`, { windowMs: 60_000, max: 30 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const token = generateCsrfToken(user.userId);
  return NextResponse.json({ token });
});
