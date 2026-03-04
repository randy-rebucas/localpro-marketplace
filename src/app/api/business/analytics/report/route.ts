import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ForbiddenError, ValidationError } from "@/lib/errors";
import { businessService } from "@/services/business.service";

/**
 * GET /api/business/analytics/report?orgId=xxx&months=12&format=csv|json
 * Returns expense data for download. Default format = csv.
 */
export const GET = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  if (user.role !== "client") throw new ForbiddenError();

  const { searchParams } = new URL(req.url);
  const orgId = searchParams.get("orgId");
  if (!orgId) throw new ValidationError("orgId query param required.");

  const months = Math.min(24, Math.max(1, parseInt(searchParams.get("months") ?? "12", 10) || 12));
  const format = searchParams.get("format") ?? "csv";

  const rows = await businessService.getExpenseReportRows(orgId, user.userId, months);

  if (format === "json") {
    return NextResponse.json({ rows });
  }

  // Build CSV
  const header = "Month,Category,Total Spend (PHP),Job Count";
  const lines = rows.map(
    (r) =>
      `${r.month},${JSON.stringify(r.category)},${r.totalSpend.toFixed(2)},${r.jobCount}`
  );
  const csv = [header, ...lines].join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="expense-report-${months}mo.csv"`,
    },
  });
});
