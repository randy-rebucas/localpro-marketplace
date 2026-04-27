import { NextRequest, NextResponse } from "next/server";
import { escrowService } from "@/services";
import { requireUser, requireRole, requireCsrfToken } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { assertObjectId } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rateLimit";

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
 *
 * NOTE (H9): The request body is intentionally ignored. Escrow amount is always
 * driven by `job.budget`, which is set server-side during quote acceptance.
 * Accepting a client-supplied overrideAmount would allow underpayment attacks.
 */
export const PATCH = withHandler(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await requireUser();
  requireRole(user, "client");
  requireCsrfToken(req, user);

  const { id } = await params;
  assertObjectId(id, "jobId");

  const rl = await checkRateLimit(`job-fund:${user.userId}`, { windowMs: 60_000, max: 10 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const result = await escrowService.fundEscrow(user, id);
  return NextResponse.json(result);
});
