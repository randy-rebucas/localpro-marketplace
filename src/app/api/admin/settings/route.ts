/**
 * GET  /api/admin/settings       — list all app settings
 * PATCH /api/admin/settings      — upsert one or many settings
 *
 * Admin-only.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { appSettingRepository } from "@/repositories";

export const GET = withHandler(async () => {
  const user = await requireUser();
  requireRole(user, "admin", "staff");

  const settings = await appSettingRepository.findAllAsMap();
  return NextResponse.json(settings);
});

export const PATCH = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  requireRole(user, "admin");

  const body: Record<string, unknown> = await req.json();
  const updated = await appSettingRepository.upsertMany(body, user.userId);
  return NextResponse.json(updated);
});
