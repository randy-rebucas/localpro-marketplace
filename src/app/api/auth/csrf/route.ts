import { NextResponse } from "next/server";
import { requireUser, generateCsrfToken } from "@/lib/auth";
import { withHandler } from "@/lib/utils";

/**
 * GET /api/auth/csrf
 *
 * Returns a short-lived CSRF token for the authenticated user.
 * Clients must include this token in the X-CSRF-Token header when calling
 * high-value mutation endpoints (payouts, disputes, password change).
 */
export const GET = withHandler(async () => {
  const user = await requireUser();
  const token = generateCsrfToken(user.userId);
  return NextResponse.json({ token });
});
