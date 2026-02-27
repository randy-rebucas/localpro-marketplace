import { NextRequest, NextResponse } from "next/server";
import { escrowService } from "@/services";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";

/**
 * PATCH /api/jobs/[id]/fund
 *
 * Initiates escrow funding via PayMongo.
 * If PAYMONGO_SECRET_KEY is set: returns { clientKey, paymentIntentId }
 *   — frontend must attach a payment method using clientKey.
 *   — escrow is funded when the PayMongo webhook fires.
 *
 * If not set (dev/simulation): funds escrow immediately.
 */
export const PATCH = withHandler(async (
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await requireUser();
  requireRole(user, "client");

  const { id } = await params;
  const result = await escrowService.fundEscrow(user, id);
  return NextResponse.json(result);
});
