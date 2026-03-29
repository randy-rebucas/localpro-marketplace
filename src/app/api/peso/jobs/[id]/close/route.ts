import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { assertObjectId } from "@/lib/errors";
import { pesoService } from "@/services/peso.service";

export const PATCH = withHandler(async (
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await requireUser();
  requireRole(user, "peso");

  const { id } = await params;
  assertObjectId(id);

  const job = await pesoService.closePesoJob(user.userId, id);
  return NextResponse.json(job);
});
