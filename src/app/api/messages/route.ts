import { NextRequest, NextResponse } from "next/server";
import { messageRepository } from "@/repositories";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { checkRateLimit } from "@/lib/rateLimit";

/** List all threads the current user participates in (unread counts per thread). */
export const GET = withHandler(async (req: NextRequest) => {
  const user = await requireUser();

  const rl = await checkRateLimit(`messages-root:${user.userId}`, { windowMs: 60_000, max: 30 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const unreadCount = await messageRepository.countUnreadForUser(user.userId);
  return NextResponse.json({ unreadCount });
});
