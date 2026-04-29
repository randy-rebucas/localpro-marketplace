import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { assertObjectId } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rateLimit";
import { featuredListingService } from "@/services/featured-listing.service";
import { connectDB } from "@/lib/db";

/**
 * DELETE /api/provider/boost/[id]
 * Cancels an active boost. No refund is issued.
 */
export const DELETE = withHandler(async (
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) => {
  const user = await requireUser();

  const rl = await checkRateLimit(`boost-cancel:${user.userId}`, { windowMs: 60_000, max: 20 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  await connectDB();

  const { id } = await context.params;
  assertObjectId(id, "listingId");
  const result = await featuredListingService.cancel(user, id);
  return NextResponse.json(result);
});
