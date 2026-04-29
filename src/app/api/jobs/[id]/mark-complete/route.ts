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
  requireRole(user, "provider");
  await requireCsrfToken(req, user);
  const rl = await checkRateLimit(`jobs:mark-complete:${user.userId}`, { windowMs: 60_000, max: 20 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { id } = await params;
  assertObjectId(id, "jobId");
  const body = await req.json().catch(() => ({}));
  const raw = (body as { afterPhotos?: string[] }).afterPhotos;
  const photos = Array.isArray(raw) ? raw.filter(Boolean) : [];
  if (photos.length === 0) throw new UnprocessableError("At least one after photo is required to mark the job as completed");
  if (photos.length > 3) throw new UnprocessableError("Maximum 3 after photos allowed");

  const result = await escrowService.markJobComplete(user, id, photos);
  return NextResponse.json({ ...result, message: "Job marked as completed" });
});
