import { NextResponse } from "next/server";
import { messageRepository } from "@/repositories";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";

/** List all threads the current user participates in (unread counts per thread). */
export const GET = withHandler(async () => {
  const user = await requireUser();
  const unreadCount = await messageRepository.countUnreadForUser(user.userId);
  return NextResponse.json({ unreadCount });
});
