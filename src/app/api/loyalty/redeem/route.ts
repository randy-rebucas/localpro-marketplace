import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withHandler } from "@/lib/utils";
import { requireUser, requireCsrfToken } from "@/lib/auth";
import { loyaltyService } from "@/services/loyalty.service";
import { ValidationError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rateLimit";

const RedeemSchema = z.object({
  points: z.number().int().min(1),
});

export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  requireCsrfToken(req, user);

  const rl = await checkRateLimit(`loyalty-redeem:${user.userId}`, { windowMs: 60_000, max: 5 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const body = await req.json();
  const parsed = RedeemSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  const account = await loyaltyService.redeemPoints(user.userId, parsed.data.points);

  return NextResponse.json({ account });
});
