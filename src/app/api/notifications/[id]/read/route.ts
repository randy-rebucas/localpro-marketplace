import { NextRequest, NextResponse } from "next/server";
import { notificationService } from "@/services";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { assertObjectId } from "@/lib/errors";

export const PATCH = withHandler(async (
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await requireUser();
  const { id } = await params;
  assertObjectId(id, "notificationId");
  await notificationService.markRead(id, user.userId);
  return NextResponse.json({ success: true });
});
