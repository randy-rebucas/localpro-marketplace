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
  const { beforePhoto } = body as { beforePhoto?: string };
  if (!beforePhoto) throw new UnprocessableError("A before photo is required to start the job");

  const result = await escrowService.startJob(user, id, beforePhoto);
  return NextResponse.json({ ...result, message: "Job started" });
});
