/**
 * GET /api/admin/businesses — list all business organizations with search & filter
 */
import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireCapability } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { connectDB } from "@/lib/db";
import BusinessOrganization from "@/models/BusinessOrganization";

import { checkRateLimit } from "@/lib/rateLimit";
export const GET = withHandler(async (req: NextRequest) => {
  const admin = await requireUser();
  requireCapability(admin, "manage_businesses");
  const rl = await checkRateLimit(`admin:${admin.userId}`, { windowMs: 60_000, max: 200 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  await connectDB();

  const { searchParams } = new URL(req.url);
  const page       = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit      = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));
  const search     = searchParams.get("search")?.trim() ?? "";
  const plan       = searchParams.get("plan") ?? undefined;
  const planStatus = searchParams.get("planStatus") ?? undefined;

  const filter: Record<string, unknown> = {};
  if (plan)       filter.plan       = plan;
  if (planStatus) filter.planStatus = planStatus;
  if (search)     filter.name       = { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };

  const [orgs, total] = await Promise.all([
    BusinessOrganization.find(filter, "name type logo plan planStatus ownerId locations defaultMonthlyBudget createdAt")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("ownerId", "name email isSuspended isVerified accountType")
      .lean(),
    BusinessOrganization.countDocuments(filter),
  ]);

  return NextResponse.json({ orgs, total, page, limit });
});
