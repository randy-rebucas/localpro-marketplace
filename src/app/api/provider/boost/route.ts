import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { checkRateLimit } from "@/lib/rateLimit";
import { featuredListingService } from "@/services/featured-listing.service";
import { walletRepository } from "@/repositories/wallet.repository";
import { getPaymentSettings } from "@/lib/appSettings";
import type { FeaturedListingType } from "@/types";
import { connectDB } from "@/lib/db";

const VALID_TYPES: FeaturedListingType[] = [
  "featured_provider",
  "top_search",
  "homepage_highlight",
];

/**
 * GET /api/provider/boost
 * Returns active boosts for the requesting provider + prices + wallet balance.
 */
export const GET = withHandler(async (req: NextRequest) => {
  const user = await requireUser();

  const rl = await checkRateLimit(`boost-get:${user.userId}`, { windowMs: 60_000, max: 60 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  await connectDB();

  const [activeBoosts, history, balance, settings] = await Promise.all([
    featuredListingService.getActive(user.userId),
    featuredListingService.getHistory(user.userId),
    walletRepository.getBalance(user.userId),
    getPaymentSettings(),
  ]);

  const prices = {
    featured_provider:  settings["payments.featuredListingFeaturedProvider"] as number,
    top_search:         settings["payments.featuredListingTopSearch"] as number,
    homepage_highlight: settings["payments.featuredListingHomepage"] as number,
  };

  return NextResponse.json({ activeBoosts, history, balance, prices });
});

/**
 * POST /api/provider/boost
 * Body: { type: FeaturedListingType, payWith: "wallet" | "paymongo" }
 */
export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();

  const rl = await checkRateLimit(`boost-buy:${user.userId}`, { windowMs: 3_600_000, max: 10 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  await connectDB();

  const body = await req.json().catch(() => ({})) as { type?: string; payWith?: string };
  const type = body.type as FeaturedListingType;
  const payWith = body.payWith ?? "wallet";

  if (!VALID_TYPES.includes(type)) {
    return NextResponse.json({ error: "Invalid boost type." }, { status: 400 });
  }

  if (payWith === "paymongo") {
    const result = await featuredListingService.initiatePayMongoCheckout(user, type);
    return NextResponse.json(result);
  }

  // Default: wallet
  const result = await featuredListingService.purchaseFromWallet(user, type);
  return NextResponse.json(result, { status: 201 });
});
