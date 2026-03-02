import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withHandler } from "@/lib/utils";
import { requireUser } from "@/lib/auth";
import { loyaltyService } from "@/services/loyalty.service";
import { ValidationError } from "@/lib/errors";

const RedeemSchema = z.object({
  points: z.number().int().min(500),
});

export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();

  const body = await req.json();
  const parsed = RedeemSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  const account = await loyaltyService.redeemPoints(user.userId, parsed.data.points);

  return NextResponse.json({ account });
});
