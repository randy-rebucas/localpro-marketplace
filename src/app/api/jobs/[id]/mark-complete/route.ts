import { NextRequest, NextResponse } from "next/server";
import { escrowService } from "@/services";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { UnprocessableError } from "@/lib/errors";

export const PATCH = withHandler(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await requireUser();
  requireRole(user, "provider");

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { afterPhoto } = body as { afterPhoto?: string };
  if (!afterPhoto) throw new UnprocessableError("An after photo is required to mark the job as completed");

  const result = await escrowService.markJobComplete(user, id, afterPhoto);
  return NextResponse.json({ ...result, message: "Job marked as completed" });
});
