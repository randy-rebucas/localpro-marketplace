import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireUser, requireRole } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";
import { withHandler } from "@/lib/utils";
import {
  buildProviderPerformanceReport,
  loadProviderPerformanceReportInput,
} from "@/lib/provider-performance-report";

/** GET /api/provider/performance-report — aggregated marketplace performance JSON */
export const GET = withHandler(async (_req: NextRequest) => {
  const user = await requireUser();
  requireRole(user, "provider");

  const rl = await checkRateLimit(`provider:performance-report:${user.userId}`, {
    windowMs: 60_000,
    max: 30,
  });
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const input = await loadProviderPerformanceReportInput(user.userId);
  const report = buildProviderPerformanceReport(input);

  return NextResponse.json({
    generatedAt: report.generatedAt,
    metrics: report.metrics,
    tier: report.tier,
    recommendations: report.recommendations,
  });
});
