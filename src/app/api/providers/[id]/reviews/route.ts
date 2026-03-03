import { NextRequest, NextResponse } from "next/server";
import { withHandler } from "@/lib/utils";
import { reviewRepository } from "@/repositories";

/** GET /api/providers/:id/reviews?page=1&limit=10 */
export const GET = withHandler(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const page  = Math.max(1, parseInt(searchParams.get("page")  ?? "1", 10));
  const limit = Math.min(20, Math.max(1, parseInt(searchParams.get("limit") ?? "10", 10)));

  const all = await reviewRepository.findWithPopulation({ providerId: id } as never);
  const total = all.length;
  const reviews = all.slice((page - 1) * limit, page * limit);

  return NextResponse.json({ reviews, total, page, limit });
});
