import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireCapability } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { NotFoundError, assertObjectId } from "@/lib/errors";
import { userRepository } from "@/repositories/user.repository";
import { sendPasswordResetEmail } from "@/lib/email";
import crypto from "crypto";

/**
 * POST /api/admin/users/[id]/reset-password
 *
 * Generates a password-reset token for the target user and sends them
 * the reset email.  Returns 200 once the email is dispatched.
 */
export const POST = withHandler(async (
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const admin = await requireUser();
  requireCapability(admin, "manage_users");

  const { id } = await params;
  assertObjectId(id, "userId");
  const user = await userRepository.findById(id);
  if (!user) throw new NotFoundError("User");

  const token  = crypto.randomBytes(32).toString("hex");
  const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  await userRepository.setResetPasswordToken(id, token, expiry);

  await sendPasswordResetEmail(
    (user as { email: string }).email,
    (user as { name: string }).name,
    token
  );

  return NextResponse.json({ ok: true, message: "Password reset email sent." });
});
