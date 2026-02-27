import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ForbiddenError } from "@/lib/errors";
import { favoriteProviderRepository } from "@/repositories/favoriteProvider.repository";

/** DELETE /api/favorites/[providerId] — remove a provider from favorites */
export const DELETE = withHandler(async (
  _req: NextRequest,
  { params }: { params: Promise<{ providerId: string }> }
) => {
  const user = await requireUser();
  if (user.role !== "client") throw new ForbiddenError();

  const { providerId } = await params;
  await favoriteProviderRepository.removeFavorite(user.userId, providerId);
  return NextResponse.json({ favorited: false });
});
