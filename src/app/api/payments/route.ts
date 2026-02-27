import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { paymentService } from "@/services";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError } from "@/lib/errors";

const InitiatePaymentSchema = z.object({
  jobId: z.string().min(1),
});

/** POST /api/payments — initiate escrow payment intent */
export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  requireRole(user, "client");

  const body = await req.json();
  const parsed = InitiatePaymentSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  const result = await paymentService.initiateEscrowPayment(user, parsed.data.jobId);
  return NextResponse.json(result, { status: 201 });
});
