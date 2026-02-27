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
  const raw = (body as { beforePhotos?: string[] }).beforePhotos;
  const photos = Array.isArray(raw) ? raw.filter(Boolean) : [];
  if (photos.length === 0) throw new UnprocessableError("At least one before photo is required to start the job");
  if (photos.length > 3) throw new UnprocessableError("Maximum 3 before photos allowed");

  const result = await escrowService.startJob(user, id, photos);
  return NextResponse.json({ ...result, message: "Job started" });
});
