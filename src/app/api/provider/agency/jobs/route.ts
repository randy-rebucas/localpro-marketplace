import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { connectDB } from "@/lib/db";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rateLimit";
import AgencyProfile from "@/models/AgencyProfile";
import Job from "@/models/Job";

const ALLOWED_JOB_STATUSES = new Set(["open", "assigned", "in_progress", "completed", "cancelled", "disputed"]);

/** GET /api/provider/agency/jobs?status=<>&search=<>&page=<>&limit=<> */
export const GET = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  if (user.role !== "provider") throw new ForbiddenError();

  const rl = await checkRateLimit(`agency-jobs:${user.userId}`, { windowMs: 60_000, max: 60 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  await connectDB();

  const { searchParams } = new URL(req.url);
  const rawStatus = searchParams.get("status") ?? "";
  const status    = ALLOWED_JOB_STATUSES.has(rawStatus) ? rawStatus : "";
  const search   = searchParams.get("search")?.trim() || "";
  const page     = Math.max(1, Number(searchParams.get("page") || "1"));
  const limit    = Math.min(50, Math.max(1, Number(searchParams.get("limit") || "20")));
  const skip     = (page - 1) * limit;

  const agency = await AgencyProfile.findOne({ providerId: user.userId }).lean();
  if (!agency) throw new NotFoundError("AgencyProfile");

  const staffUserIds = [user.userId, ...agency.staff.map((s) => s.userId)];

  const filter: Record<string, unknown> = { providerId: { $in: staffUserIds } };
  if (status) filter.status = status;
  if (search) filter.title = { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };

  const [rawJobs, total] = await Promise.all([
    Job.find(filter)
      .populate<{ providerId: { _id: string; name: string; avatar?: string } | null }>("providerId", "name avatar")
      .populate("clientId", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Job.countDocuments(filter),
  ]);

  const jobs = rawJobs.map((j) => {
    const p = j.providerId as { _id: string; name: string; avatar?: string } | null;
    return {
      _id:           String(j._id),
      title:         j.title,
      category:      j.category,
      status:        j.status,
      budget:        j.budget,
      location:      j.location,
      scheduleDate:  j.scheduleDate,
      description:   j.description,
      assignedStaff: p ? { _id: String(p._id), name: p.name, avatar: p.avatar ?? null } : null,
    };
  });

  return NextResponse.json({ jobs, total, pages: Math.ceil(total / limit) });
});
