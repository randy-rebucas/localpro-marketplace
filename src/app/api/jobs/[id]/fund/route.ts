import { NextRequest, NextResponse } from "next/server";
import { escrowService } from "@/services";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";

/**
 * PATCH /api/jobs/[id]/fund
 *
 * Initiates escrow funding via a PayMongo Checkout Session.
 *
 * Live (PAYMONGO_SECRET_KEY set):
 *   Returns { simulated: false, checkoutUrl, checkoutSessionId, referenceNumber, amountPHP }
 *   — redirect the user to checkoutUrl to complete payment.
 *   — escrow is funded when PayMongo fires the webhook, or when the
 *     success-redirect page calls pollCheckoutSession.
 *
 * Dev / simulation (no key set):
 *   Returns { simulated: true, message }
 *   — escrow is funded immediately in MongoDB.
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
