import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError } from "@/lib/errors";
import { walletService } from "@/services/wallet.service";

const WithdrawSchema = z.object({
  amount:        z.number().min(100, "Minimum withdrawal is ₱100"),
  bankName:      z.string().min(2, "Bank name is required"),
  accountNumber: z.string().min(4, "Account number is required"),
  accountName:   z.string().min(2, "Account name is required"),
});

/** POST /api/wallet/withdraw */
export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  const body = await req.json().catch(() => ({}));
  const parsed = WithdrawSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  const withdrawal = await walletService.requestWithdrawal(user, parsed.data);
  return NextResponse.json({ message: "Withdrawal request submitted", withdrawal }, { status: 201 });
});
