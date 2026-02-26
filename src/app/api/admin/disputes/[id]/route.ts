import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { disputeService } from "@/services";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError } from "@/lib/errors";

const UpdateDisputeSchema = z.object({
  status: z.enum(["investigating", "resolved"]),
  resolutionNotes: z.string().min(10).optional(),
  escrowAction: z.enum(["release", "refund"]).optional(),
});

export const GET = withHandler(async (
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await requireUser();
  requireRole(user, "admin");

  const { id } = await params;
  const dispute = await disputeService.getDispute(id);
  return NextResponse.json(dispute);
});

export const PATCH = withHandler(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await requireUser();
  requireRole(user, "admin");

  const { id } = await params;
  const body = await req.json();
  const parsed = UpdateDisputeSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  const dispute = await disputeService.resolveDispute(user.userId, id, parsed.data);
  return NextResponse.json({ dispute, message: "Dispute updated" });
});
