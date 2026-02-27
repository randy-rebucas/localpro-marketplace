import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError } from "@/lib/errors";
import { payoutService } from "@/services/payout.service";

const UpdatePayoutSchema = z.object({
  status: z.enum(["processing", "completed", "rejected"]),
  notes: z.string().optional(),
});

export const PATCH = withHandler(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await requireUser();
  requireRole(user, "admin");

  const { id } = await params;
  const body = await req.json();
  const parsed = UpdatePayoutSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  const payout = await payoutService.updatePayoutStatus(user, id, parsed.data);
  return NextResponse.json({ payout, message: "Payout status updated" });
});
