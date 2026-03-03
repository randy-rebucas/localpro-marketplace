import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import MaintenanceReminder from "@/components/shared/MaintenanceReminder";
import { Suspense } from "react";
import PageGuide from "@/components/shared/PageGuide";
import { DashboardKpis } from "./_components/DashboardKpis";
import { RecentJobs } from "./_components/RecentJobs";
import { LoyaltyWidget } from "./_components/LoyaltyWidget";
import { QuickActions } from "./_components/QuickActions";
import { HeaderSkeleton, KpiSkeleton, RecentJobsSkeleton, SidebarSkeleton } from "./_components/skeletons";

export const metadata: Metadata = { title: "Dashboard" };

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ClientDashboardPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  return (
    <div className="space-y-6">
      {/* ── Onboarding guide ── */}
      <PageGuide
        pageKey="client-dashboard"
        title="How your Client Dashboard works"
        steps={[
          { icon: "📋", title: "Post a Job", description: "Click '+ Post a Job' to describe your service need, set a budget, and schedule a date." },
          { icon: "💬", title: "Review Quotes", description: "Providers will send you quotes. Open each job to compare quotes and accept the best one." },
          { icon: "🔒", title: "Fund Escrow", description: "After accepting a quote, fund escrow to secure your payment. Your money is held safely until the job is done." },
          { icon: "✅", title: "Release Payment", description: "Once the provider completes the job and you're satisfied, release payment from escrow." },
        ]}
      />

      {/* ── Greeting + KPI cards (stream together) ── */}
      <Suspense fallback={<><HeaderSkeleton /><KpiSkeleton /></>}>
        <DashboardKpis userId={currentUser.userId} />
      </Suspense>

      {/* ── Two-column content area ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* Main column: recent jobs */}
        <div className="lg:col-span-2">
          <Suspense fallback={<RecentJobsSkeleton />}>
            <RecentJobs userId={currentUser.userId} />
          </Suspense>
        </div>

        {/* Sidebar column: loyalty + quick actions + maintenance */}
        <div className="space-y-4">
          <Suspense fallback={<SidebarSkeleton />}>
            <LoyaltyWidget userId={currentUser.userId} />
          </Suspense>
          <MaintenanceReminder />
          <QuickActions />
        </div>

      </div>
    </div>
  );
}
