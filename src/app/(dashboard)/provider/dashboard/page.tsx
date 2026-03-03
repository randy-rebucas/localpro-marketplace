import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import {
  HeaderSkeleton,
  KpiSkeleton,
  RecentActivitySkeleton,
  SidebarSkeleton,
} from "./_components/skeletons";
import { DashboardKpis } from "./_components/DashboardKpis";
import { RecentActivity } from "./_components/RecentActivity";
import { TierWidget } from "./_components/TierWidget";
import { QuickActions } from "./_components/QuickActions";

export const metadata: Metadata = { title: "Dashboard" };

export default async function ProviderDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="space-y-6">
      <Suspense fallback={<><HeaderSkeleton /><KpiSkeleton /></>}>
        <DashboardKpis userId={user.userId} />
      </Suspense>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2">
          <Suspense fallback={<RecentActivitySkeleton />}>
            <RecentActivity userId={user.userId} />
          </Suspense>
        </div>
        <div className="space-y-4">
          <Suspense fallback={<SidebarSkeleton />}>
            <TierWidget userId={user.userId} />
          </Suspense>
          <QuickActions />
        </div>
      </div>
    </div>
  );
}
