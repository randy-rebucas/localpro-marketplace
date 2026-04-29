import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { connectDB } from "@/lib/db";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rateLimit";
import AgencyProfile from "@/models/AgencyProfile";
import AgencyStaffPayout from "@/models/AgencyStaffPayout";

const OID_RE = /^[a-f\d]{24}$/i;
const ALLOWED_PAYOUT_STATUSES = new Set(["pending", "paid"]);

const PAGE_SIZE = 20;

/**
 * GET /api/provider/agency/payouts
 * Query: ?workerId=<userId>&status=pending|paid&page=1
 *
 * Returns the payout split ledger for the agency owner.
 * Staff workers can also call this to see their own payouts (filtered to their userId).
 */
export const GET = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  if (user.role !== "provider") throw new ForbiddenError();

  const rl = await checkRateLimit(`agency-payouts:${user.userId}`, { windowMs: 60_000, max: 60 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  await connectDB();

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const rawStatus = searchParams.get("status") ?? "";
  const status = ALLOWED_PAYOUT_STATUSES.has(rawStatus) ? rawStatus : undefined;
  const rawWorkerId = searchParams.get("workerId") ?? "";
  const workerIdParam = rawWorkerId && OID_RE.test(rawWorkerId) ? rawWorkerId : undefined;

  const agency = await AgencyProfile.findOne({ providerId: user.userId }, "_id staff").lean();

  // If this user is not the agency owner, check if they're a staff member and scope to self
  const isOwner = !!agency;

  if (!isOwner) {
    // Staff worker viewing their own payouts
    const payouts = await AgencyStaffPayout.find(
      {
        workerId: user.userId,
        ...(status ? { status } : {}),
      },
      "jobId grossAmount workerAmount agencyAmount workerSharePct status paidAt createdAt"
    )
      .sort({ createdAt: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .populate("jobId", "title category")
      .lean();

    const total = await AgencyStaffPayout.countDocuments({
      workerId: user.userId,
      ...(status ? { status } : {}),
    });

    return NextResponse.json({ payouts, total, page, pageSize: PAGE_SIZE });
  }

  // Agency owner — can filter by workerId
  const filter: Record<string, unknown> = { agencyOwnerId: user.userId };
  if (status) filter.status = status;
  if (workerIdParam) filter.workerId = workerIdParam;

  const payouts = await AgencyStaffPayout.find(
    filter,
    "workerId jobId grossAmount workerAmount agencyAmount workerSharePct status paidAt createdAt"
  )
    .sort({ createdAt: -1 })
    .skip((page - 1) * PAGE_SIZE)
    .limit(PAGE_SIZE)
    .populate("workerId", "name email avatar")
    .populate("jobId", "title category")
    .lean();

  const total = await AgencyStaffPayout.countDocuments(filter);

  // Aggregate totals for the owner
  const [agg] = await AgencyStaffPayout.aggregate([
    { $match: { agencyOwnerId: agency._id, ...(status ? { status } : {}) } },
    {
      $group: {
        _id: null,
        totalGross:  { $sum: "$grossAmount" },
        totalWorker: { $sum: "$workerAmount" },
        totalAgency: { $sum: "$agencyAmount" },
      },
    },
  ]);

  return NextResponse.json({
    payouts,
    total,
    page,
    pageSize: PAGE_SIZE,
    summary: agg
      ? { totalGross: agg.totalGross, totalWorker: agg.totalWorker, totalAgency: agg.totalAgency }
      : { totalGross: 0, totalWorker: 0, totalAgency: 0 },
  });
});

const MarkPaidSchema = z.object({
  payoutIds: z.array(z.string().regex(OID_RE, "Invalid payoutId")).min(1).max(50),
});

const UpdateShareSchema = z.object({
  staffId:        z.string().regex(OID_RE, "Invalid staffId"),
  workerSharePct: z.number().min(0).max(100),
});

/**
 * PATCH /api/provider/agency/payouts  body: { payoutIds: string[] }
 * Agency owner marks one or more payout records as "paid" (i.e., worker received their share).
 */
export const PATCH = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  if (user.role !== "provider") throw new ForbiddenError();

  const body = await req.json().catch(() => ({}));
  const parsed = MarkPaidSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  await connectDB();

  const agency = await AgencyProfile.findOne({ providerId: user.userId }, "_id").lean();
  if (!agency) throw new NotFoundError("AgencyProfile");

  const result = await AgencyStaffPayout.updateMany(
    {
      _id: { $in: parsed.data.payoutIds },
      agencyOwnerId: user.userId,
      status: "pending",
    },
    { $set: { status: "paid", paidAt: new Date() } }
  );

  return NextResponse.json({ updated: result.modifiedCount });
});

/**
 * PUT /api/provider/agency/payouts  body: { staffId, workerSharePct }
 * Update the worker share % for a specific staff member.
 */
export const PUT = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  if (user.role !== "provider") throw new ForbiddenError();

  const body = await req.json().catch(() => ({}));
  const parsed = UpdateShareSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  const { staffId, workerSharePct } = parsed.data;

  await connectDB();

  const agency = await AgencyProfile.findOne({ providerId: user.userId });
  if (!agency) throw new NotFoundError("AgencyProfile");

  const member = agency.staff.find((s) => String(s._id) === staffId);
  if (!member) throw new NotFoundError("Staff member");

  member.workerSharePct = workerSharePct;
  await agency.save();

  return NextResponse.json({ message: "Worker share updated.", workerSharePct });
});
