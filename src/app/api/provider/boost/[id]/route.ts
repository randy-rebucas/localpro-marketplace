import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
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
  await connectDB();

  const { id } = await context.params;
  const result = await featuredListingService.cancel(user, id);
  return NextResponse.json(result);
});
