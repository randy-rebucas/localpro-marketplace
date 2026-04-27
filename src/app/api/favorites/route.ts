import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireCsrfToken } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ForbiddenError, assertObjectId } from "@/lib/errors";
import { favoriteProviderRepository } from "@/repositories/favoriteProvider.repository";
import { providerProfileRepository } from "@/repositories";
import { checkRateLimit } from "@/lib/rateLimit";

/** GET /api/favorites — list client's favorite providers with profiles */
export const GET = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  if (user.role !== "client") throw new ForbiddenError();

  const rl = await checkRateLimit(`favorites-get:${user.userId}`, { windowMs: 60_000, max: 30 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const favorites = await favoriteProviderRepository.findByClient(user.userId);

  const providerIds = favorites.map(
    (f) =>
      (f as unknown as { providerId: { _id?: string; toString(): string } })
        .providerId?._id?.toString() ??
      (f as unknown as { providerId: { toString(): string } }).providerId?.toString()
  );

  const profiles = await providerProfileRepository.findByUserIds(providerIds.filter(Boolean) as string[]);

  const profileMap = new Map(
    profiles.map((p) => [
      (p as unknown as { userId: { toString(): string } }).userId.toString(),
      p,
    ])
  );

  const enriched = favorites.map((f) => {
    const fav = f as unknown as {
      _id: { toString(): string };
      providerId: { _id?: string; toString(): string; name?: string; email?: string };
      createdAt: Date;
    };
    const pid = fav.providerId?._id?.toString() ?? fav.providerId?.toString();
    return {
      _id: fav._id.toString(),
      provider: fav.providerId,
      profile: profileMap.get(pid ?? "") ?? null,
      createdAt: fav.createdAt,
    };
  });

  return NextResponse.json(enriched);
});

/** POST /api/favorites — add a provider to favorites */
export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  if (user.role !== "client") throw new ForbiddenError();
  requireCsrfToken(req, user);

  const rl = await checkRateLimit(`favorites-post:${user.userId}`, { windowMs: 60_000, max: 20 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { providerId } = await req.json();
  if (!providerId) {
    return NextResponse.json({ error: "providerId is required" }, { status: 400 });
  }
  assertObjectId(providerId, "providerId");

  await favoriteProviderRepository.addFavorite(user.userId, providerId);
  return NextResponse.json({ favorited: true });
});
