import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { NotFoundError } from "@/lib/errors";
import { userRepository, activityRepository } from "@/repositories";
import { cascadeService } from "@/services/cascade.service";
import { checkRateLimit } from "@/lib/rateLimit";

/**
 * DELETE /api/admin/users/[id]
 *
 * Soft-deletes the user and cascades side-effects (cancel open jobs, reject
 * pending quotes, mark provider profile unavailable).
 * Only super-admins (role=admin) can soft-delete users; staff cannot.
 * An admin cannot soft-delete themselves.
 */
export const DELETE = withHandler(async (
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const admin = await requireUser();
  requireRole(admin, "admin");  // only full admins
  const rl = await checkRateLimit(`admin:${admin.userId}`, { windowMs: 60_000, max: 200 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { id } = await params;
  if (id === admin.userId) {
    return NextResponse.json({ error: "You cannot delete your own account." }, { status: 400 });
  }

  // Verify the user exists before cascading
  const user = await userRepository.findById(id);
  if (!user) throw new NotFoundError("User");

  const { affected } = await cascadeService.cascadeSoftDelete(id);

  // Log the admin action for audit trail
  try {
    await activityRepository.log({
      userId: admin.userId,
      eventType: "user_deleted",
      metadata: {
        action: "admin_soft_delete_user",
        deletedUserId: id,
        deletedUserEmail: user.email,
        deletedUserRole: user.role,
        affected,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error("[AUDIT] Failed to log user deletion:", err);
    // Don't fail the request if logging fails
  }

  return NextResponse.json({ ok: true, affected });
});
