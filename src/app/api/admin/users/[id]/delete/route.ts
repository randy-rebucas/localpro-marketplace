import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { NotFoundError } from "@/lib/errors";
import User from "@/models/User";
import { connectDB } from "@/lib/db";

/**
 * DELETE /api/admin/users/[id]
 *
 * Soft-deletes the user (sets isDeleted=true, deletedAt=now, isSuspended=true).
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

  await connectDB();
  const user = await User.findByIdAndUpdate(
    id,
    { $set: { isDeleted: true, deletedAt: new Date(), isSuspended: true } },
    { new: true }
  );
  if (!user) throw new NotFoundError("User");

  return NextResponse.json({ ok: true });
});
