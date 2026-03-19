/**
 * GET  /api/admin/feature-flags  — list all feature flags (keys starting with ff_)
 * PUT  /api/admin/feature-flags  — update a single feature flag
 *
 * Admin-only.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { getAllFlags, setFlag } from "@/lib/featureFlags";

export const GET = withHandler(async () => {
  const user = await requireUser();
  requireRole(user, "admin");

  const flags = await getAllFlags();
  return NextResponse.json(flags);
});

export const PUT = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  requireRole(user, "admin");

  const body = await req.json();
  const { key, value } = body as { key: string; value: boolean };

  if (!key || typeof key !== "string" || !key.startsWith("ff_")) {
    return NextResponse.json(
      { error: "Key must be a string starting with 'ff_'" },
      { status: 400 },
    );
  }
  if (typeof value !== "boolean") {
    return NextResponse.json(
      { error: "Value must be a boolean" },
      { status: 400 },
    );
  }

  await setFlag(key, value);
  return NextResponse.json({ key, value });
});
