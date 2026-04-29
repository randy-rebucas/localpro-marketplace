import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { connectDB } from "@/lib/db";
import { ForbiddenError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rateLimit";
import Quote from "@/models/Quote";
import AgencyProfile from "@/models/AgencyProfile";

const ALLOWED_STATUSES = new Set(["pending", "accepted", "rejected", "withdrawn", "countered", "expired"]);

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** GET /api/provider/agency/quotations?status=<status>&search=<q>&limit=<n>&page=<n>
 *  Returns all quotes submitted by this provider (owner + all agency staff).
 */
export const GET = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  if (user.role !== "provider") throw new ForbiddenError();

  const rl = await checkRateLimit(`agency-quotations:${user.userId}`, { windowMs: 60_000, max: 60 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  await connectDB();

  const agency = await AgencyProfile.findOne({ ownerId: user.userId }).lean() as { _id: unknown; staff?: { userId: unknown }[] } | null;
  const staffObjectIds = [
    new mongoose.Types.ObjectId(user.userId),
    ...(agency?.staff?.map((s) => new mongoose.Types.ObjectId(String(s.userId))) ?? []),
  ];

  const { searchParams } = new URL(req.url);
  const rawStatus = searchParams.get("status") ?? "";
  const status    = ALLOWED_STATUSES.has(rawStatus) ? rawStatus : "";
  const search    = (searchParams.get("search") ?? "").trim().slice(0, 100);
  const page      = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit     = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  const skip      = (page - 1) * limit;

  const baseMatch: Record<string, unknown> = { providerId: { $in: staffObjectIds } };
  if (status) baseMatch.status = status;

  const searchRegex = search ? escapeRegex(search) : null;

  const pipeline: mongoose.PipelineStage[] = [
    { $match: baseMatch },
    {
      $lookup: {
        from: "jobs",
        localField: "jobId",
        foreignField: "_id",
        as: "jobArr",
      },
    },
    { $addFields: { jobDoc: { $arrayElemAt: ["$jobArr", 0] } } },
    {
      $lookup: {
        from: "users",
        localField: "jobDoc.clientId",
        foreignField: "_id",
        as: "clientArr",
      },
    },
    { $addFields: { clientDoc: { $arrayElemAt: ["$clientArr", 0] } } },
    ...(searchRegex
      ? [{
          $match: {
            $or: [
              { "jobDoc.title":    { $regex: searchRegex, $options: "i" } },
              { "clientDoc.name":  { $regex: searchRegex, $options: "i" } },
              { "clientDoc.email": { $regex: searchRegex, $options: "i" } },
            ],
          },
        } as mongoose.PipelineStage]
      : []),
    { $sort: { createdAt: -1 } },
    {
      $facet: {
        data: [
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              _id: 1,
              proposedAmount: 1,
              status: 1,
              message: 1,
              createdAt: 1,
              jobId: {
                _id: "$jobDoc._id",
                title: "$jobDoc.title",
                category: "$jobDoc.category",
                status: "$jobDoc.status",
                budget: "$jobDoc.budget",
                clientId: {
                  _id: "$clientDoc._id",
                  name: "$clientDoc.name",
                  email: "$clientDoc.email",
                  avatar: "$clientDoc.avatar",
                },
              },
            },
          },
        ],
        total: [{ $count: "n" }],
      },
    },
  ];

  const [result] = await Quote.aggregate(pipeline);
  const quotes = (result?.data ?? []) as unknown[];
  const total  = (result?.total?.[0] as { n?: number } | undefined)?.n ?? 0;

  // Lightweight stats scan — 2 fields only
  const allOwnerQuotes = await Quote.find(
    { providerId: { $in: staffObjectIds } },
    "status proposedAmount"
  ).lean() as Array<{ status: string; proposedAmount: number }>;

  const stats = {
    total:      allOwnerQuotes.length,
    pending:    allOwnerQuotes.filter((q) => q.status === "pending").length,
    accepted:   allOwnerQuotes.filter((q) => q.status === "accepted").length,
    rejected:   allOwnerQuotes.filter((q) => q.status === "rejected").length,
    totalValue: allOwnerQuotes.reduce((s, q) => s + (q.proposedAmount ?? 0), 0),
  };

  return NextResponse.json({ quotes, total, page, pages: Math.ceil(total / limit), stats });
});
