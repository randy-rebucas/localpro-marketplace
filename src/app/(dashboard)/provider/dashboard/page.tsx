import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import {
  KpiSkeleton,
  RecentActivitySkeleton,
  SidebarSkeleton,
} from "./_components/skeletons";
import { DashboardKpis } from "./_components/DashboardKpis";
import { RecentActivity } from "./_components/RecentActivity";
import { TierWidget } from "./_components/TierWidget";
import { QuickActions } from "./_components/QuickActions";
import { TodaySchedule } from "./_components/TodaySchedule";
import { DashboardHeader } from "./_components/DashboardHeader";
import DashboardCustomizer from "./_components/DashboardCustomizer";
import { PerformanceReport } from "./_components/PerformanceReport";

export const metadata: Metadata = { title: "Dashboard" };

export default async function ProviderDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <DashboardCustomizer
      header={
        <Suspense fallback={<div className="h-14 rounded-xl bg-slate-100 animate-pulse" />}>
          <DashboardHeader userId={user.userId} />
        </Suspense>
      }
      kpis={
        <Suspense fallback={<KpiSkeleton />}>
          <DashboardKpis userId={user.userId} />
        </Suspense>
      }
      performanceReport={
        <Suspense fallback={<div className="h-48 rounded-xl bg-slate-100 animate-pulse" aria-hidden />}>
          <PerformanceReport userId={user.userId} />
        </Suspense>
      }
      activity={
        <Suspense fallback={<RecentActivitySkeleton />}>
          <RecentActivity userId={user.userId} />
        </Suspense>
      }
      tier={
        <Suspense fallback={<SidebarSkeleton />}>
          <TierWidget userId={user.userId} />
        </Suspense>
      }
      schedule={
        <Suspense fallback={<div className="h-40 rounded-xl bg-slate-100 animate-pulse" />}>
          <TodaySchedule userId={user.userId} />
        </Suspense>
      }
      actions={<QuickActions />}
    />
  );
}
