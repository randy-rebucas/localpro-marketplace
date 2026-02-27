import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCheckoutSession } from "@/lib/paymongo";
import { paymentRepository } from "@/repositories";
import { paymentService } from "@/services";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { NotFoundError, ForbiddenError, ValidationError } from "@/lib/errors";

const PollSchema = z.object({ jobId: z.string().optional() });

/**
 * GET /api/payments/[id]
 * [id] = checkout session id
 * Optional ?jobId= query param triggers escrow confirmation if session is paid.
 */
export const GET = withHandler(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await requireUser();
  requireRole(user, "client");

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get("jobId") ?? undefined;

  const payment = await paymentRepository.findByPaymentIntentId(id);
  if (!payment) throw new NotFoundError("Payment");

  if ((payment as { clientId: { toString(): string } }).clientId.toString() !== user.userId) {
    throw new ForbiddenError();
  }

  // Fetch live checkout session status from PayMongo
  let liveStatus: string | undefined;
  if (process.env.PAYMONGO_SECRET_KEY) {
    try {
      const session = await getCheckoutSession(id);
      liveStatus = session.status;

      // PayMongo session status is never "paid" — check the payment intent status.
      // paymentIntentStatus is "succeeded" when the PI is expanded on the session.
      if (session.paymentIntentStatus === "succeeded" && jobId) {
        await paymentService.confirmEscrowFunding(
          id,
          session.paymentIntentId ?? "",
          "checkout"
        );
        liveStatus = "paid";
      }
    } catch {
      // silently ignore transient PayMongo errors
    }
  }

  return NextResponse.json({ payment, liveStatus });
});
