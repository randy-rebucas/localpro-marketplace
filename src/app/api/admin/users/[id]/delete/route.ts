import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { NotFoundError } from "@/lib/errors";
import { userRepository } from "@/repositories";
import { cascadeService } from "@/services/cascade.service";

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

  const { id } = await params;
  if (id === admin.userId) {
    return NextResponse.json({ error: "You cannot delete your own account." }, { status: 400 });
  }

  // Verify the user exists before cascading
  const user = await userRepository.findById(id);
  if (!user) throw new NotFoundError("User");

  const { affected } = await cascadeService.cascadeSoftDelete(id);

  return NextResponse.json({ ok: true, affected });
});
