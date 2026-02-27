import { NextResponse } from "next/server";
import { notificationService } from "@/services";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";

export const GET = withHandler(async () => {
  const user = await requireUser();
  const [notifications, unreadCount] = await Promise.all([
    notificationService.listForUser(user.userId),
    notificationService.countUnread(user.userId),
  ]);
  return NextResponse.json({ notifications, unreadCount });
});

/** Mark all notifications as read */
export const PATCH = withHandler(async () => {
  const user = await requireUser();
  await notificationService.markAllRead(user.userId);
  return NextResponse.json({ success: true });
});
