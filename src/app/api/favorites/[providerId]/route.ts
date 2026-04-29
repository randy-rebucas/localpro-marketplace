import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireCsrfToken } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ForbiddenError, assertObjectId } from "@/lib/errors";
import { favoriteProviderRepository } from "@/repositories/favoriteProvider.repository";
import { checkRateLimit } from "@/lib/rateLimit";

/** DELETE /api/favorites/[providerId] — remove a provider from favorites */
export const DELETE = withHandler(async (
  req: NextRequest,
  { params }: { params: Promise<{ providerId: string }> }
) => {
  const user = await requireUser();
  if (user.role !== "client") throw new ForbiddenError();
  requireCsrfToken(req, user);

  const { providerId } = await params;
  assertObjectId(providerId, "providerId");

  const rl = await checkRateLimit(`favorites-delete:${user.userId}`, { windowMs: 60_000, max: 20 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  await favoriteProviderRepository.removeFavorite(user.userId, providerId);
  return NextResponse.json({ favorited: false });
});
