import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireCapability } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { NotFoundError } from "@/lib/errors";
import { userRepository, activityRepository } from "@/repositories";

import { checkRateLimit } from "@/lib/rateLimit";
export const POST = withHandler(async (
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await requireUser();
  requireCapability(user, "manage_users");
  const rl = await checkRateLimit(`admin:${user.userId}`, { windowMs: 60_000, max: 200 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { id } = await params;

  const updated = await userRepository.updateById(id, {
    failedLoginAttempts: 0,
    lockedUntil: null,
  });
  if (!updated) throw new NotFoundError("User");

  // Audit log: record the unlock action
  try {
    await activityRepository.log({
      userId: user.userId,
      eventType: "user_unlocked",
      metadata: {
        action: "admin_unlock_account",
        unlockedUserId: id,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error("[AUDIT] Failed to log account unlock:", err);
  }

  return NextResponse.json({ message: "Account unlocked successfully." });
});
