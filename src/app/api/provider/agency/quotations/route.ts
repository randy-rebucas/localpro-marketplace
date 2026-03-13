import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { connectDB } from "@/lib/db";
import { ForbiddenError } from "@/lib/errors";
import Quote from "@/models/Quote";
import AgencyProfile from "@/models/AgencyProfile";

/** GET /api/provider/agency/quotations?status=<status>&search=<q>&limit=<n>&page=<n>
 *  Returns all quotes submitted by this provider (owner + all agency staff).
 */
export const GET = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  if (user.role !== "provider") throw new ForbiddenError();

  await connectDB();

  // Build staff user-id list (owner + agency staff)
  const agency = await AgencyProfile.findOne({ ownerId: user.userId }).lean() as { staff?: { userId: unknown }[] } | null;
  const staffUserIds = [
    user.userId,
    ...(agency?.staff?.map((s) => s.userId) ?? []),
  ];

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const search = searchParams.get("search")?.trim();
  const page   = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit  = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  const skip   = (page - 1) * limit;

  const filter: Record<string, unknown> = { providerId: { $in: staffUserIds } };
  if (status) filter.status = status;

  // Fetch all matching (with populate) then filter by search if needed
  const allQuotes = await Quote.find(filter)
    .populate({
      path: "jobId",
      select: "title category status budget clientId",
      populate: { path: "clientId", select: "name email avatar" },
    })
    .sort({ createdAt: -1 })
    .lean() as Array<{
      _id: unknown;
      proposedAmount: number;
      status: string;
      message: string;
      createdAt: Date;
      jobId: {
        _id: unknown;
        title: string;
        category: string;
        status: string;
        budget: number;
        clientId: { _id: unknown; name: string; email: string; avatar?: string } | null;
      } | null;
    }>;

  const filtered = search
    ? allQuotes.filter((q) => {
        const hay = `${q.jobId?.title ?? ""} ${q.jobId?.clientId?.name ?? ""} ${q.jobId?.clientId?.email ?? ""}`.toLowerCase();
        return hay.includes(search.toLowerCase());
      })
    : allQuotes;

  const total  = filtered.length;
  const quotes = filtered.slice(skip, skip + limit);

  // Aggregate summary stats from all (unfiltered-by-search, unfiltered-by-status) for KPIs
  const allOwnerQuotes = await Quote.find({ providerId: { $in: staffUserIds } }).select("status proposedAmount").lean() as Array<{ status: string; proposedAmount: number }>;
  const stats = {
    total:      allOwnerQuotes.length,
    pending:    allOwnerQuotes.filter((q) => q.status === "pending").length,
    accepted:   allOwnerQuotes.filter((q) => q.status === "accepted").length,
    rejected:   allOwnerQuotes.filter((q) => q.status === "rejected").length,
    totalValue: allOwnerQuotes.reduce((s, q) => s + (q.proposedAmount ?? 0), 0),
  };

  return NextResponse.json({ quotes, total, page, pages: Math.ceil(total / limit), stats });
});
