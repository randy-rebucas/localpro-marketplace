import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireCapability } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { NotFoundError } from "@/lib/errors";
import { userRepository } from "@/repositories";

export const POST = withHandler(async (
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await requireUser();
  requireCapability(user, "manage_users");

  const { id } = await params;

  const updated = await userRepository.updateById(id, {
    failedLoginAttempts: 0,
    lockedUntil: null,
  });
  if (!updated) throw new NotFoundError("User");

  return NextResponse.json({ message: "Account unlocked successfully." });
});
