/**
 * GET  /api/admin/settings       — list all app settings (merged with defaults)
 * PATCH /api/admin/settings      — upsert one or many settings
 *
 * Admin-only.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { appSettingRepository } from "@/repositories";
import { pushSettingsUpdate } from "@/lib/events";

/** Server-side defaults — mirrors client DEFAULTS so GET always returns all keys. */
const DEFAULTS: Record<string, unknown> = {
  // General
  "platform.maintenanceMode": false,
  "platform.newRegistrations": true,
  "platform.kycRequired": false,
  // Job Board
  "board.activityFeed": false,
  "board.earningsWidget": false,
  "board.categoryDemand": false,
  "board.achievementsWidget": false,
  "board.urgentJobs": false,
  "board.trainingCta": false,
  "board.marketplaceStats": false,
  "board.priceGuide": false,
  "board.businessCta": false,
  "board.partners": false,
  "board.jobAlerts": false,
  // Payments
  "payments.baseCommissionRate": 15,
  "payments.highCommissionRate": 20,
  "payments.minJobBudget": 500,
  "payments.minPayoutAmount": 100,
  // Limits
  "limits.maxQuotesPerJob": 5,
  "limits.quoteValidityDays": 7,
  "limits.maxActiveJobsPerClient": 10,
};

export const GET = withHandler(async () => {
  const user = await requireUser();
  requireRole(user, "admin", "staff");

  const settings = await appSettingRepository.findAllAsMap();
  return NextResponse.json({ ...DEFAULTS, ...settings });
});

export const PATCH = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  requireRole(user, "admin");

  const body: Record<string, unknown> = await req.json();
  const updated = await appSettingRepository.upsertMany(body, user.userId);
  // Notify board / kiosk SSE listeners so they re-fetch immediately
  pushSettingsUpdate(updated);
  return NextResponse.json({ ...DEFAULTS, ...updated });
});
