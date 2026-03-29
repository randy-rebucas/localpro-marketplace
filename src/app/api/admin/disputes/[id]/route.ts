import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { disputeService } from "@/services";
import { requireUser, requireCapability } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError, assertObjectId } from "@/lib/errors";

const UpdateDisputeSchema = z.object({
  status: z.enum(["investigating", "resolved"]),
  resolutionNotes: z.string().min(10).optional(),
  escrowAction: z.enum(["release", "refund"]).optional(),
  /** When true and dispute was escalated, charge the case handling fee to `handlingFeeChargedTo`. */
  chargeHandlingFee: z.boolean().optional(),
  /** Who pays the case handling fee. Required when chargeHandlingFee is true. */
  handlingFeeChargedTo: z.enum(["client", "provider", "both"]).optional(),
});

export const GET = withHandler(async (
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await requireUser();
  requireCapability(user, "manage_disputes");

  const { id } = await params;
  assertObjectId(id, "disputeId");
  const dispute = await disputeService.getDispute(id);
  return NextResponse.json(dispute);
});

export const PATCH = withHandler(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await requireUser();
  requireCapability(user, "manage_disputes");

  const { id } = await params;
  assertObjectId(id, "disputeId");
  const body = await req.json();
  const parsed = UpdateDisputeSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  const dispute = await disputeService.resolveDispute(user.userId, id, parsed.data);
  return NextResponse.json({ dispute, message: "Dispute updated" });
});
