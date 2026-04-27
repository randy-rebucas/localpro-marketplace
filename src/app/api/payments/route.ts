import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { paymentService } from "@/services";
import { requireUser, requireRole, requireCsrfToken } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rateLimit";

const InitiatePaymentSchema = z.object({
  jobId: z.string().min(1),
});

/** POST /api/payments — initiate escrow payment intent */
export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  requireRole(user, "client");
  requireCsrfToken(req, user);

  const rl = await checkRateLimit(`payments-initiate:${user.userId}`, { windowMs: 60_000, max: 10 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const body = await req.json();
  const parsed = InitiatePaymentSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  const result = await paymentService.initiateEscrowPayment(user, parsed.data.jobId);
  return NextResponse.json(result, { status: 201 });
});
