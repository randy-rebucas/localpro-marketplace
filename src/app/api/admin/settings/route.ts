/**
 * GET  /api/admin/settings       — list all app settings
 * PATCH /api/admin/settings      — upsert one or many settings
 *
 * Admin-only.
 */

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import AppSetting from "@/models/AppSetting";

export const GET = withHandler(async () => {
  const user = await requireUser();
  requireRole(user, "admin", "staff");

  await connectDB();
  const settings = await AppSetting.find().lean();
  return NextResponse.json(
    settings.reduce<Record<string, unknown>>((acc, s) => {
      acc[s.key] = s.value;
      return acc;
    }, {})
  );
});

export const PATCH = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  requireRole(user, "admin");

  await connectDB();
  const body: Record<string, unknown> = await req.json();

  const ops = Object.entries(body).map(([key, value]) =>
    AppSetting.findOneAndUpdate(
      { key },
      { value, updatedBy: user.userId },
      { upsert: true, new: true }
    )
  );

  await Promise.all(ops);

  const updated = await AppSetting.find().lean();
  return NextResponse.json(
    updated.reduce<Record<string, unknown>>((acc, s) => {
      acc[s.key] = s.value;
      return acc;
    }, {})
  );
});
