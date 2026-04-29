import { NextRequest, NextResponse } from "next/server";
import { escrowService } from "@/services";
import { requireUser, requireRole, requireCsrfToken } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { UnprocessableError, assertObjectId } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rateLimit";

export const PATCH = withHandler(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await requireUser();
  requireRole(user, "client");
  requireCsrfToken(req, user);

  const { id } = await params;
  assertObjectId(id, "jobId");

  const rl = await checkRateLimit(`job-complete:${user.userId}`, { windowMs: 60_000, max: 10 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const result = await escrowService.releaseEscrow(user, id);
  return NextResponse.json({ ...result, message: "Escrow released to provider" });
});
