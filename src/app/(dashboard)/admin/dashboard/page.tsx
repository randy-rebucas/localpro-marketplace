import type { Metadata } from "next";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";
import { jobRepository } from "@/repositories/job.repository";
import { transactionRepository } from "@/repositories/transaction.repository";
import { disputeRepository } from "@/repositories/dispute.repository";
import { userRepository } from "@/repositories/user.repository";
import { activityRepository } from "@/repositories/activity.repository";
import KpiCard from "@/components/ui/KpiCard";
import { formatCurrency } from "@/lib/utils";
import AdminJobsChart from "./AdminJobsChart";
import AdminRevenueChart from "./AdminRevenueChart";
import Link from "next/link";
import {
  CircleDollarSign, BarChart3, Lock, AlertTriangle, ClipboardCheck,
  Users, ShieldAlert, ShieldCheck, TrendingUp, Activity,
  Briefcase, FileText, Flag, CreditCard, ChevronRight, LayoutDashboard,
  MessageSquare, Eye,
} from "lucide-react";
import TourGuide from "@/components/shared/TourGuide";
import type { JobStatus } from "@/types";

export const metadata: Metadata = { title: "Admin Dashboard" };

// ─── Data ─────────────────────────────────────────────────────────────────────

async function getAdminStats() {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [
    jobStatusCounts,
    txnTotals,
    escrowBalance,
    openDisputes,
    userStats,
    activityCounts,
    monthlyRevenue,
  ] = await Promise.all([
    jobRepository.countByStatus(),
    transactionRepository.getAdminTotals(),
    jobRepository.sumFundedEscrowBalance(),
    disputeRepository.countOpen(),
    userRepository.getUserStats(startOfMonth),
    activityRepository.countRecent(),
    transactionRepository.getMonthlyRevenue(sixMonthsAgo),
  ]);

  const { totalUsers, pendingKyc, newUsersSince: newUsersThisMonth } = userStats;

  const jobsByStatus = Object.fromEntries(
    jobStatusCounts.map((s) => [s._id, s.count])
  ) as Record<JobStatus, number>;

  const { gmv: totalGMV, commission: totalCommission } = txnTotals;
  const activeJobs =
    (jobsByStatus.open ?? 0) + (jobsByStatus.assigned ?? 0) + (jobsByStatus["in_progress" as JobStatus] ?? 0);
  const pendingJobs = jobsByStatus["pending_validation" as JobStatus] ?? 0;

  // Format monthly revenue for chart (fill gaps so every month appears)
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const revenueChartData = monthlyRevenue.map((r) => ({
    label: `${MONTHS[r._id.month - 1]} ${String(r._id.year).slice(2)}`,
    gmv: r.gmv,
    commission: r.commission,
  }));

  return {
    totalGMV, totalCommission, escrowBalance, activeJobs,
    openDisputes, totalUsers, jobsByStatus, pendingJobs,
    pendingKyc, newUsersThisMonth, activityCounts,
    revenueChartData,
  };
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function AdminDashboardSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-10 bg-slate-100 dark:bg-slate-700 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="h-20 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-800" />
        <div className="h-20 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-800" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 h-64 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-[72px] bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700" />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Quick action card ────────────────────────────────────────────────────────

function QuickAction({
  href, icon, label, count, countColor = "slate",
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  count?: number;
  countColor?: "amber" | "red" | "rose" | "indigo" | "slate";
}) {
  const colorMap = {
    amber:  "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
    red:    "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
    rose:   "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400",
    indigo: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400",
    slate:  "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300",
  };

  return (
    <Link
      href={href}
      className="group flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:border-primary/30 dark:hover:border-primary/40 hover:shadow-md transition-all"
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:text-primary group-hover:bg-primary/5 dark:group-hover:bg-primary/10 transition-colors">
          {icon}
        </div>
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 group-hover:text-primary transition-colors">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {count !== undefined && count > 0 && (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${colorMap[countColor]}`}>
            {count}
          </span>
        )}
        <ChevronRight className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600 group-hover:text-primary transition-colors" />
      </div>
    </Link>
  );
}

// ─── Stat pill ────────────────────────────────────────────────────────────────

function StatPill({ icon, label, value, href }: {
  icon: React.ReactNode; label: string; value: string | number; href?: string;
}) {
  const inner = (
    <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:border-primary/20 dark:hover:border-primary/30 transition-colors">
      <span className="text-slate-400 dark:text-slate-500">{icon}</span>
      <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
      <span className="text-xs font-bold text-slate-800 dark:text-white ml-auto">{value}</span>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

// ─── Dashboard content ────────────────────────────────────────────────────────

async function AdminDashboardContent({
  capabilities, isAdmin,
}: {
  capabilities: string[];
  isAdmin: boolean;
}) {
  const can = (cap: string) => isAdmin || capabilities.includes(cap);
  const stats = await getAdminStats();

  const jobsChartData = Object.entries(stats.jobsByStatus).map(([status, count]) => ({
    status: status.replace("_", " "),
    count,
  }));

  const kpis = [
    can("view_revenue") && (
      <KpiCard key="gmv" title="Total GMV" value={formatCurrency(stats.totalGMV)}
        subtitle="Gross marketplace volume"
        icon={<CircleDollarSign className="h-6 w-6" />}
      />
    ),
    can("view_revenue") && (
      <KpiCard key="commission" title="Commission" value={formatCurrency(stats.totalCommission)}
        subtitle="Platform revenue"
        icon={<BarChart3 className="h-6 w-6" />}
      />
    ),
    can("view_revenue") && (
      <KpiCard key="escrow" title="Escrow Balance" value={formatCurrency(stats.escrowBalance)}
        subtitle="Currently locked"
        icon={<Lock className="h-6 w-6" />}
      />
    ),
    can("manage_disputes") && (
      <KpiCard key="disputes" title="Open Disputes" value={stats.openDisputes}
        subtitle={`${stats.activeJobs} active jobs`}
        icon={<AlertTriangle className="h-6 w-6" />}
      />
    ),
  ].filter(Boolean);

  const showBanners =
    (can("manage_jobs")     && stats.pendingJobs   > 0) ||
    (can("manage_disputes") && stats.openDisputes  > 0) ||
    (can("manage_kyc")      && stats.pendingKyc    > 0);

  return (
    <>
      {/* ── Stat pills row ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <StatPill icon={<Users className="h-3.5 w-3.5" />}      label="Total users"       value={stats.totalUsers.toLocaleString()}         href="/admin/users" />
        <StatPill icon={<Briefcase className="h-3.5 w-3.5" />}  label="Active jobs"       value={stats.activeJobs.toLocaleString()} />
        <StatPill icon={<TrendingUp className="h-3.5 w-3.5" />} label="New users/month"   value={stats.newUsersThisMonth.toLocaleString()} />
        <StatPill icon={<Activity className="h-3.5 w-3.5" />}   label="Activity today"    value={stats.activityCounts.today.toLocaleString()} />
      </div>

      {/* ── Attention banners ──────────────────────────────────────────── */}
      {showBanners && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {can("manage_jobs") && stats.pendingJobs > 0 && (
            <Link href="/admin/jobs" className="group bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 flex items-center justify-between hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-200 dark:bg-amber-800/50 flex items-center justify-center flex-shrink-0">
                  <ClipboardCheck className="h-5 w-5 text-amber-700 dark:text-amber-400" />
                </div>
                <div>
                  <p className="font-semibold text-amber-800 dark:text-amber-300 text-sm">{stats.pendingJobs} job{stats.pendingJobs !== 1 ? "s" : ""} awaiting review</p>
                  <p className="text-amber-600 dark:text-amber-500 text-xs mt-0.5">Approve or reject submissions</p>
                </div>
              </div>
              <span className="text-amber-600 dark:text-amber-400 text-sm font-semibold group-hover:underline">Review →</span>
            </Link>
          )}
          {can("manage_disputes") && stats.openDisputes > 0 && (
            <Link href="/admin/disputes" className="group bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 flex items-center justify-between hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-red-200 dark:bg-red-800/50 flex items-center justify-center flex-shrink-0">
                  <ShieldAlert className="h-5 w-5 text-red-700 dark:text-red-400" />
                </div>
                <div>
                  <p className="font-semibold text-red-800 dark:text-red-300 text-sm">{stats.openDisputes} active dispute{stats.openDisputes !== 1 ? "s" : ""}</p>
                  <p className="text-red-600 dark:text-red-500 text-xs mt-0.5">Pending resolution</p>
                </div>
              </div>
              <span className="text-red-600 dark:text-red-400 text-sm font-semibold group-hover:underline">Resolve →</span>
            </Link>
          )}
          {can("manage_kyc") && stats.pendingKyc > 0 && (
            <Link href="/admin/kyc" className="group bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-2xl p-4 flex items-center justify-between hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-200 dark:bg-indigo-800/50 flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="h-5 w-5 text-indigo-700 dark:text-indigo-400" />
                </div>
                <div>
                  <p className="font-semibold text-indigo-800 dark:text-indigo-300 text-sm">{stats.pendingKyc} KYC submission{stats.pendingKyc !== 1 ? "s" : ""} pending</p>
                  <p className="text-indigo-600 dark:text-indigo-500 text-xs mt-0.5">Identity verification queue</p>
                </div>
              </div>
              <span className="text-indigo-600 dark:text-indigo-400 text-sm font-semibold group-hover:underline">Review →</span>
            </Link>
          )}
        </div>
      )}

      {/* ── KPI cards ─────────────────────────────────────────────────────── */}
      {kpis.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis}
        </div>
      )}

      {/* ── Charts + quick actions ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Chart panel */}
        {can("manage_jobs") && (
          <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Platform Insights</h3>
            </div>
            <div className="space-y-5">
              <div>
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Jobs by Status</p>
                <AdminJobsChart data={jobsChartData} />
              </div>
              {can("view_revenue") && stats.revenueChartData.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Revenue Trend — last 6 months</p>
                  <AdminRevenueChart data={stats.revenueChartData} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Right column: counters + quick actions */}
        <div className="space-y-3">
          {/* Counters */}
          <div className="grid grid-cols-3 gap-2">
            {can("manage_users") && (
              <Link
                href="/admin/users"
                className="col-span-3 flex items-center gap-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 hover:border-primary/30 dark:hover:border-primary/40 hover:shadow-md transition-all"
              >
                <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                  <Users className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                </div>
                <div className="flex-1">
                  <p className="text-xl font-bold text-slate-900 dark:text-white">{stats.totalUsers.toLocaleString()}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Total users</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-green-600 dark:text-green-400">+{stats.newUsersThisMonth} this month</p>
                </div>
              </Link>
            )}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-3 text-center">
              <p className="text-xl font-bold text-slate-900 dark:text-white">{stats.activeJobs}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Active</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-3 text-center">
              <p className="text-xl font-bold text-slate-900 dark:text-white">{stats.jobsByStatus.completed ?? 0}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Completed</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-3 text-center">
              <p className="text-xl font-bold text-slate-900 dark:text-white">{stats.activityCounts.week}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Events/wk</p>
            </div>
          </div>

          {/* Quick navigation */}
          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1 pt-1">Quick access</p>
          <div className="space-y-1.5">
            {can("manage_jobs")     && <QuickAction href="/admin/all-jobs"  icon={<Briefcase className="h-4 w-4" />}  label="All Jobs"         count={stats.pendingJobs} countColor="amber" />}
            {can("manage_users")    && <QuickAction href="/admin/users"     icon={<Users className="h-4 w-4" />}      label="Users" />}
            {can("manage_disputes") && <QuickAction href="/admin/disputes"  icon={<ShieldAlert className="h-4 w-4" />} label="Disputes"        count={stats.openDisputes} countColor="red" />}
            {can("manage_kyc")      && <QuickAction href="/admin/kyc"       icon={<ShieldCheck className="h-4 w-4" />} label="KYC Review"       count={stats.pendingKyc} countColor="indigo" />}
            {can("view_revenue")    && <QuickAction href="/admin/revenue"   icon={<TrendingUp className="h-4 w-4" />}  label="Revenue" />}
            {can("manage_payouts")  && <QuickAction href="/admin/payouts"   icon={<CreditCard className="h-4 w-4" />}  label="Payouts" />}
            {(isAdmin || can("view_logs")) && <QuickAction href="/admin/activity"  icon={<Activity className="h-4 w-4" />}  label="Activity Log" />}
            {isAdmin                && <QuickAction href="/admin/fraud"     icon={<Flag className="h-4 w-4" />}        label="Fraud Monitor" />}
            {isAdmin                && <QuickAction href="/admin/announcements" icon={<FileText className="h-4 w-4" />} label="Announcements" />}
            {can("manage_blogs")    && <QuickAction href="/admin/comments"  icon={<MessageSquare className="h-4 w-4" />} label="Comments" />}
            {can("manage_blogs")    && <QuickAction href="/admin/analytics" icon={<Eye className="h-4 w-4" />}          label="Analytics" />}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminDashboardPage() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "staff")) return null;

  const capabilities = user.capabilities ?? [];
  const isAdmin = user.role === "admin";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-5 py-4 shadow-sm">
        <div className="p-2 rounded-xl bg-violet-100 dark:bg-violet-900/30">
          <LayoutDashboard className="h-5 w-5 text-violet-600 dark:text-violet-400" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-800 dark:text-white">Admin Dashboard</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Platform overview and key metrics</p>
        </div>
      </div>

      <TourGuide
        pageKey="admin-dashboard"
        title="How the Admin Dashboard works"
        steps={[
          { icon: "📊", title: "Platform KPIs",    description: "Monitor real-time GMV, commission earned, escrow balance, and total active users at a glance." },
          { icon: "⚠️", title: "Action alerts",    description: "Pending validations, open disputes, and KYC submissions needing review are highlighted at the top." },
          { icon: "📈", title: "Job & revenue",    description: "The charts show job volume by status and monthly revenue trend so you can spot bottlenecks and growth." },
          { icon: "🔗", title: "Quick navigation", description: "Jump to Users, Jobs, Disputes, Revenue, Payouts, KYC, or Fraud directly from the right-side panel." },
        ]}
      />
      <Suspense fallback={<AdminDashboardSkeleton />}>
        <AdminDashboardContent capabilities={capabilities} isAdmin={isAdmin} />
      </Suspense>
    </div>
  );
}
