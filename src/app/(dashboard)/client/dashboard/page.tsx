import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import MaintenanceReminder from "@/components/shared/MaintenanceReminder";
import { Suspense } from "react";
import TourGuide from "@/components/shared/TourGuide";
import { DashboardKpis } from "./_components/DashboardKpis";
import { RecentJobs } from "./_components/RecentJobs";
import { LoyaltyWidget } from "./_components/LoyaltyWidget";
import { QuickActions } from "./_components/QuickActions";
import { HeaderSkeleton, KpiSkeleton, RecentJobsSkeleton, SidebarSkeleton } from "./_components/skeletons";
import { getTranslations } from "next-intl/server";

export const metadata: Metadata = { title: "Dashboard" };

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ClientDashboardPage() {
  const [currentUser, t] = await Promise.all([
    getCurrentUser(),
    getTranslations("clientPages"),
  ]);
  if (!currentUser) redirect("/login");

  return (
    <div className="space-y-6">
      {/* ── Onboarding guide ── */}
      <TourGuide
        pageKey="client-dashboard"
        title={t("dash_tourTitle")}
        steps={[
          { icon: "📋", title: t("dash_tourStep1Title"), description: t("dash_tourStep1Desc") },
          { icon: "💬", title: t("dash_tourStep2Title"), description: t("dash_tourStep2Desc") },
          { icon: "🔒", title: t("dash_tourStep3Title"), description: t("dash_tourStep3Desc") },
          { icon: "✅", title: t("dash_tourStep4Title"), description: t("dash_tourStep4Desc") },
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
