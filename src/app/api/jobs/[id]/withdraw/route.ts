import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { escrowService } from "@/services";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError } from "@/lib/errors";

const WithdrawSchema = z.object({
  reason: z.string().min(5, "Please provide a reason (at least 5 characters)"),
});

/**
 * POST /api/jobs/:id/withdraw
 *
 * Allows an assigned provider to withdraw from a funded job before it is
 * started.  The job reverts to "open" status (re-appears on the job board)
 * while the escrow stays "funded" — the client does NOT need to pay again.
 */
export const POST = withHandler(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await requireUser();
  requireRole(user, "provider");

  const { id } = await params;

  const body = await req.json().catch(() => ({}));
  const parsed = WithdrawSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  const result = await escrowService.withdrawJob(user, id, parsed.data.reason);

  return NextResponse.json({
    ...result,
    message: "You have withdrawn from the job. It has been re-opened for other providers.",
  });
});
