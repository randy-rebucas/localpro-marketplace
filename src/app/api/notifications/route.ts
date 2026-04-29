import { NextRequest, NextResponse } from "next/server";
import { notificationService } from "@/services";
import { requireUser, requireCsrfToken } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { checkRateLimit } from "@/lib/rateLimit";

export const GET = withHandler(async (req: NextRequest) => {
  const user = await requireUser();

  const rl = await checkRateLimit(`notifications-list:${user.userId}`, { windowMs: 60_000, max: 30 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const [notifications, unreadCount] = await Promise.all([
    notificationService.listForUser(user.userId),
    notificationService.countUnread(user.userId),
  ]);
  return NextResponse.json({ notifications, unreadCount });
});

/** Mark all notifications as read */
export const PATCH = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  requireCsrfToken(req, user);

  const rl = await checkRateLimit(`notifications-mark-all:${user.userId}`, { windowMs: 60_000, max: 10 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  await notificationService.markAllRead(user.userId);
  return NextResponse.json({ success: true });
});
