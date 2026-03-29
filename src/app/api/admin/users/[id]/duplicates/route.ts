import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireCapability } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { NotFoundError } from "@/lib/errors";
import { userRepository } from "@/repositories";

/**
 * GET /api/admin/users/[id]/duplicates
 *
 * Returns users that might be duplicates of [id] based on:
 *  - Identical phone number (exact)
 *  - Prefix of the normalised email local-part (first 5 chars)
 *  - Name similarity (first word of name, case-insensitive)
 *
 * Excludes the user themselves and soft-deleted accounts.
 */
export const GET = withHandler(async (
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const admin = await requireUser();
  requireCapability(admin, "manage_users");

  const { id } = await params;

  const user = await userRepository.findById(id) as {
    _id: { toString(): string };
    name: string;
    email: string;
    phone?: string | null;
  } | null;
  if (!user) throw new NotFoundError("User");

  const orClauses: Record<string, unknown>[] = [];

  // 1. Same phone
  if (user.phone) {
    orClauses.push({ phone: user.phone });
  }

  // 2. Email local prefix (first 5 chars)
  const emailLocal = user.email.split("@")[0].slice(0, 5);
  if (emailLocal.length >= 3) {
    const escapedEmail = emailLocal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    orClauses.push({ email: { $regex: `^${escapedEmail}`, $options: "i" } });
  }

  // 3. First word of name (case-insensitive) — only if at least 3 chars
  const firstNameWord = user.name.split(" ")[0];
  if (firstNameWord.length >= 3) {
    const escapedName = firstNameWord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    orClauses.push({ name: { $regex: `^${escapedName}`, $options: "i" } });
  }

  if (orClauses.length === 0) {
    return NextResponse.json({ duplicates: [] });
  }

  const duplicates = await userRepository.findPotentialDuplicates(id, orClauses);

  return NextResponse.json({
    duplicates: duplicates.map((u) => ({
      ...u,
      _id: (u._id as { toString(): string }).toString(),
    })),
  });
});
