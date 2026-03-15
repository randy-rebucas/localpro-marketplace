import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { featuredListingService } from "@/services/featured-listing.service";
import { walletRepository } from "@/repositories/wallet.repository";
import { getPaymentSettings } from "@/lib/appSettings";
import BoostClient from "./_components/BoostClient";

export const metadata: Metadata = { title: "Boost & Featured Listings" };

export default async function BoostPage() {
  const user = await getCurrentUser();
  if (!user) return null;

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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Boost &amp; Featured Listings</h2>
        <p className="text-slate-500 text-sm mt-1">
          Pay to increase your visibility and attract more clients — instant activation, 7 days duration.
        </p>
      </div>
      <BoostClient
        activeBoosts={JSON.parse(JSON.stringify(activeBoosts))}
        history={JSON.parse(JSON.stringify(history))}
        walletBalance={balance}
        prices={prices}
      />
    </div>
  );
}
