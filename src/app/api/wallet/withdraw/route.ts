import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, requireCsrfToken } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError } from "@/lib/errors";
import { walletService } from "@/services/wallet.service";
import { getAppSetting } from "@/lib/appSettings";
import { checkRateLimit, SENSITIVE_LIMITS } from "@/lib/rateLimit";

const WithdrawSchema = z.object({
  amount:        z.number().positive("Amount must be positive"),
  bankName:      z.string().min(2, "Bank name is required"),
  accountNumber: z.string().regex(/^\d{8,20}$/, "Account number must be 8–20 digits"),
  accountName:   z.string().min(2, "Account name is required"),
});

/** POST /api/wallet/withdraw */
export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  await requireCsrfToken(req, user);
  const rl = await checkRateLimit(`wallet:withdraw:${user.userId}`, SENSITIVE_LIMITS.payment);
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const body = await req.json().catch(() => ({}));
  const parsed = WithdrawSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  const minPayout = await getAppSetting("payments.minPayoutAmount", 100);
  if (parsed.data.amount < (minPayout as number)) {
    throw new ValidationError(`Minimum withdrawal amount is ₱${(minPayout as number).toLocaleString()}`);
  }

  const withdrawal = await walletService.requestWithdrawal(user, parsed.data);
  return NextResponse.json({ message: "Withdrawal request submitted", withdrawal }, { status: 201 });
});
