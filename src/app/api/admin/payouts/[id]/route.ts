import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, requireCapability } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError, assertObjectId } from "@/lib/errors";
import { payoutService } from "@/services/payout.service";

import { checkRateLimit } from "@/lib/rateLimit";
const UpdatePayoutSchema = z.object({
  status: z.enum(["processing", "completed", "rejected"]),
  notes: z.string().optional(),
});

export const PATCH = withHandler(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await requireUser();
  requireCapability(user, "manage_payouts");
  const rl = await checkRateLimit(`admin:${user.userId}`, { windowMs: 60_000, max: 200 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { id } = await params;
  assertObjectId(id, "payoutId");
  const body = await req.json();
  const parsed = UpdatePayoutSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  const payout = await payoutService.updatePayoutStatus(user, id, parsed.data);
  return NextResponse.json({ payout, message: "Payout status updated" });
});
