import { NextRequest, NextResponse } from "next/server";
import { notificationService } from "@/services";
import { requireUser, requireCsrfToken } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { assertObjectId } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rateLimit";

export const PATCH = withHandler(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await requireUser();
  requireCsrfToken(req, user);

  const rl = await checkRateLimit(`notif-read:${user.userId}`, { windowMs: 60_000, max: 60 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { id } = await params;
  assertObjectId(id, "notificationId");
  await notificationService.markRead(id, user.userId);
  return NextResponse.json({ success: true });
});
