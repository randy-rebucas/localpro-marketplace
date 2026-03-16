import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import TourGuide from "@/components/shared/TourGuide";
import RealtimeRefresher from "@/components/shared/RealtimeRefresher";
import { FavoritesContent } from "./_components/FavoritesContent";
import { FavoritesSkeleton } from "./_components/skeletons";

export const metadata: Metadata = { title: "Favorite Providers" };

export default async function ClientFavoritesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="space-y-6">
      <TourGuide
        pageKey="client-favorites"
        title="How Favorite Providers works"
        steps={[
          { icon: "❤️", title: "Save providers",     description: "Heart any provider you trust to add them to your favorites for quick access." },
          { icon: "🔍", title: "Discover providers", description: "Browse all available providers, filter by availability, and find the right fit." },
          { icon: "⚡", title: "Post jobs directly",  description: "Use 'Post Job' on any card to send a job request straight to that provider." },
          { icon: "📡", title: "Live updates",        description: "Availability statuses reflect real-time changes — no need to refresh." },
        ]}
      />
      <RealtimeRefresher entity="job" />

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Favorite Providers</h2>
          <p className="text-slate-500 text-sm mt-1">
            Save providers you trust and post jobs directly to them.
          </p>
        </div>
      </div>

      <Suspense fallback={<FavoritesSkeleton />}>
        <FavoritesContent userId={user.userId} />
      </Suspense>
    </div>
  );
}
