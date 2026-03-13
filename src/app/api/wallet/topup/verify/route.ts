import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError } from "@/lib/errors";
import { walletService } from "@/services/wallet.service";

const VerifySchema = z.object({
  sessionId: z.string().min(1, "sessionId is required"),
});

/**
 * POST /api/wallet/topup/verify
 *
 * Idempotent. Fetches the PayMongo checkout session, verifies it's paid,
 * and credits the wallet if not already done.
 * Called by the client immediately on the success-redirect page.
 */
export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();

  const body = await req.json().catch(() => ({}));
  const parsed = VerifySchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  const result = await walletService.topUpVerifyAndConfirm(
    user.userId,
    parsed.data.sessionId
  );

  return NextResponse.json({ result });
});
