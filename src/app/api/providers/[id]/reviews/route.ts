import { NextRequest, NextResponse } from "next/server";
import { withHandler } from "@/lib/utils";
import { assertObjectId } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rateLimit";
import { connectDB } from "@/lib/db";
import Review from "@/models/Review";

/** GET /api/providers/:id/reviews?page=1&limit=10 */
export const GET = withHandler(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const rl = await checkRateLimit(`prov-reviews:${req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"}`, { windowMs: 60_000, max: 60 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { id } = await params;
  assertObjectId(id, "providerId");

  const { searchParams } = new URL(req.url);
  const page  = Math.max(1, parseInt(searchParams.get("page")  ?? "1", 10) || 1);
  const limit = Math.min(20, Math.max(1, parseInt(searchParams.get("limit") ?? "10", 10) || 10));

  await connectDB();
  const [reviews, total] = await Promise.all([
    Review.find({ providerId: id, isHidden: { $ne: true } })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("clientId", "name avatar")
      .lean(),
    Review.countDocuments({ providerId: id, isHidden: { $ne: true } }),
  ]);

  return NextResponse.json({ reviews, total, page, limit });
});
