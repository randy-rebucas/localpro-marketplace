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
  const raw = (body as { afterPhotos?: string[] }).afterPhotos;
  const photos = Array.isArray(raw) ? raw.filter(Boolean) : [];
  if (photos.length === 0) throw new UnprocessableError("At least one after photo is required to mark the job as completed");
  if (photos.length > 3) throw new UnprocessableError("Maximum 3 after photos allowed");

  const result = await escrowService.markJobComplete(user, id, photos);
  return NextResponse.json({ ...result, message: "Job marked as completed" });
});
