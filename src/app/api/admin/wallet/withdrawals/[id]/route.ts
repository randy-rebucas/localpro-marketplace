import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError } from "@/lib/errors";
import { walletService } from "@/services/wallet.service";
import { walletRepository } from "@/repositories/wallet.repository";

const UpdateSchema = z.object({
  status: z.enum(["processing", "completed", "rejected"]),
  notes:  z.string().optional(),
});

/** PATCH /api/admin/wallet/withdrawals/[id] */
export const PATCH = withHandler(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await requireUser();
  requireRole(user, "admin");

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  const updated = await walletService.updateWithdrawal(user, id, parsed.data.status, parsed.data.notes);
  return NextResponse.json({ message: "Withdrawal updated", withdrawal: updated });
});

/** GET /api/admin/wallet/withdrawals/[id] — optional, for fetching single */
export const GET = withHandler(async (
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await requireUser();
  requireRole(user, "admin");

  const { id } = await params;
  const withdrawal = await walletRepository.findWithdrawalById(id);
  return NextResponse.json({ withdrawal });
});
