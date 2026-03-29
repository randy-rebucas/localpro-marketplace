import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError, assertObjectId } from "@/lib/errors";
import { walletService } from "@/services/wallet.service";

const Schema = z.object({
  amount: z.number().positive("Amount must be positive").optional(),
});

/**
 * POST /api/jobs/:id/fund-wallet
 * Fund escrow using the client's platform wallet balance.
 */
export const POST = withHandler(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await requireUser();
  const { id } = await params;
  assertObjectId(id, "jobId");
  const body = await req.json().catch(() => ({}));
  const parsed = Schema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  const result = await walletService.fundEscrowFromWallet(user, id, parsed.data.amount);
  return NextResponse.json(result);
});
