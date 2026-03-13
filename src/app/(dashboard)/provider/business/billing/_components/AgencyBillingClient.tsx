"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  ReceiptText, RefreshCw, TrendingUp, CheckCircle2, XCircle,
  Sparkles, Zap, BarChart3, CalendarClock, Headphones,
  Users, Wrench, ShieldCheck, ArrowUpRight,
  Loader2, AlertTriangle, Building2, Star,
} from "lucide-react";
import { fetchClient } from "@/lib/fetchClient";
import { formatCurrency } from "@/lib/utils";
import toast from "react-hot-toast";

// ─── Plan definitions ─────────────────────────────────────────────────────────
type PlanKey = "starter" | "growth" | "pro" | "enterprise";

interface PlanDef {
  key:         PlanKey;
  label:       string;
  tagline:     string;
  price:       number | null;
  priceLabel:  string;
  color:       string;
  textColor:   string;
  borderColor: string;
  staff:       string;
  services:    string;
  equipment:   string;
  commission:  string;
  analytics:   boolean;
  priorityList:boolean;
  bulkOnboard: boolean;
  scheduler:   boolean;
  support:     boolean;
  popular:     boolean;
}

const PLANS: PlanDef[] = [
  {
    key: "starter",
    label: "Starter", tagline: "For solo providers & micro-agencies",
    price: 0, priceLabel: "Free",
    color: "bg-slate-50", textColor: "text-slate-700", borderColor: "border-slate-200",
    staff: "5", services: "10", equipment: "10", commission: "15%",
    analytics: false, priorityList: false, bulkOnboard: false, scheduler: false, support: false,
    popular: false,
  },
  {
    key: "growth",
    label: "Growth", tagline: "For growing local agencies",
    price: 999, priceLabel: "₱999 / mo",
    color: "bg-blue-50", textColor: "text-blue-700", borderColor: "border-blue-200",
    staff: "15", services: "30", equipment: "50", commission: "12%",
    analytics: true, priorityList: false, bulkOnboard: false, scheduler: false, support: false,
    popular: false,
  },
  {
    key: "pro",
    label: "Pro", tagline: "For established agencies scaling up",
    price: 2499, priceLabel: "₱2,499 / mo",
    color: "bg-violet-50", textColor: "text-violet-700", borderColor: "border-violet-300",
    staff: "50", services: "Unlimited", equipment: "Unlimited", commission: "10%",
    analytics: true, priorityList: true, bulkOnboard: true, scheduler: true, support: false,
    popular: true,
  },
  {
    key: "enterprise",
    label: "Enterprise", tagline: "For large organizations & franchises",
    price: 4999, priceLabel: "₱4,999 / mo",
    color: "bg-amber-50", textColor: "text-amber-700", borderColor: "border-amber-200",
    staff: "Unlimited", services: "Unlimited", equipment: "Unlimited", commission: "8%",
    analytics: true, priorityList: true, bulkOnboard: true, scheduler: true, support: true,
    popular: false,
  },
];

// ─── Add-on definitions ───────────────────────────────────────────────────────
const ADD_ONS = [
  {
    key: "analytics",
    label: "AI Analytics Dashboard",
    description: "AI-powered earnings insights, staff performance scoring, revenue forecasting and category trends.",
    icon: <BarChart3 className="h-5 w-5" />,
    includedIn: ["growth", "pro", "enterprise"] as PlanKey[],
  },
  {
    key: "priorityList",
    label: "Priority Marketplace Placement",
    description: "Your agency appears at the top of client search results and is featured on the job board.",
    icon: <Zap className="h-5 w-5" />,
    includedIn: ["pro", "enterprise"] as PlanKey[],
  },
  {
    key: "bulkOnboard",
    label: "Bulk Staff Onboarding",
    description: "Invite and onboard multiple workers at once via CSV import — no manual form-filling.",
    icon: <Users className="h-5 w-5" />,
    includedIn: ["pro", "enterprise"] as PlanKey[],
  },
  {
    key: "equipment",
    label: "Equipment Tracking",
    description: "Full equipment lifecycle management with assignment tracking, status logs and maintenance records.",
    icon: <Wrench className="h-5 w-5" />,
    includedIn: ["growth", "pro", "enterprise"] as PlanKey[],
  },
  {
    key: "scheduler",
    label: "Recurring Job Scheduler",
    description: "Auto-post recurring jobs and manage repeating service contracts on weekly or monthly cadences.",
    icon: <CalendarClock className="h-5 w-5" />,
    includedIn: ["pro", "enterprise"] as PlanKey[],
  },
  {
    key: "support",
    label: "Priority Support & SLA",
    description: "Dedicated account manager, 4-hour response SLA, phone support and white-glove onboarding.",
    icon: <Headphones className="h-5 w-5" />,
    includedIn: ["enterprise"] as PlanKey[],
  },
];

// ─── API types ────────────────────────────────────────────────────────────────
type PlanStatus = "active" | "past_due" | "cancelled";

interface CommissionRow {
  month:      string;
  gross:      number;
  commission: number;
  net:        number;
}

interface BillingData {
  agencyName:          string;
  staffCount:          number;
  serviceCount:        number;
  plan:                PlanKey;
  planStatus:          PlanStatus;
  planActivatedAt:     string | null;
  planExpiresAt:       string | null;
  pendingPlan:         string | null;
  commissionRate:      number;
  totalGrossEarned:    number;
  totalCommissionPaid: number;
  totalNetEarned:      number;
  totalJobsCompleted:  number;
  thisMonthGross:      number;
  thisMonthCommission: number;
  commissionHistory:   CommissionRow[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function monthLabel(ym: string) {
  const [y, m] = ym.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-PH", {
    month: "short", year: "numeric",
  });
}

const PLAN_STATUS_BADGE: Record<PlanStatus, string> = {
  active:    "bg-emerald-100 text-emerald-700",
  past_due:  "bg-amber-100 text-amber-700",
  cancelled: "bg-red-100 text-red-700",
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function AgencyBillingClient() {
  const searchParams = useSearchParams();
  const [data,    setData]    = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying,  setPaying]  = useState<PlanKey | null>(null);

  const isConfirmFlow = searchParams.get("plan_success") === "1";

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetchClient<BillingData>("/api/provider/agency/billing", { cache: "no-store" });
      setData(res);
    } catch {
      toast.error("Failed to load billing data.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => { if (!isConfirmFlow) load(); }, [load, isConfirmFlow]);

  // Handle redirect-back from PayPal
  useEffect(() => {
    if (searchParams.get("plan_success") !== "1") {
      if (searchParams.get("plan_cancelled") === "1") {
        toast("Payment cancelled — your plan was not changed.", { icon: "ℹ️" });
        window.history.replaceState({}, "", window.location.pathname);
      }
      return;
    }

    window.history.replaceState({}, "", window.location.pathname);

    const confirm = async () => {
      try {
        const paypalOrderId = searchParams.get("token");
        if (!paypalOrderId) { load(); return; }

        const res = await fetchClient<{
          activated:      boolean;
          alreadyActive?: boolean;
          plan?:          string;
          planStatus?:    string;
          planExpiresAt?: string | null;
        }>("/api/provider/agency/billing/confirm", {
          method: "POST",
          body:   JSON.stringify({ orderId: paypalOrderId }),
        });

        if (res.activated || res.alreadyActive) {
          if (res.plan) {
            setData((prev) =>
              prev
                ? {
                    ...prev,
                    plan:          res.plan as PlanKey,
                    planStatus:    (res.planStatus ?? "active") as PlanStatus,
                    planExpiresAt: res.planExpiresAt ?? prev.planExpiresAt,
                    pendingPlan:   null,
                  }
                : prev
            );
          }
          toast.success("🎉 Plan activated! Your subscription is now live.");
        } else {
          toast("Payment received — plan activation in progress.", { icon: "⏳" });
        }
      } catch {
        toast("Payment received — plan activation in progress.", { icon: "⏳" });
      } finally {
        load(true);
      }
    };

    confirm();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Upgrade via PayPal (or dev simulation) ────────────────────────────────
  async function handleUpgrade(plan: PlanKey) {
    if (paying || plan === "starter") return;
    setPaying(plan);
    try {
      const res = await fetchClient<{
        checkoutUrl?:  string;
        simulated?:    boolean;
        plan?:         string;
        planStatus?:   string;
        planExpiresAt?: string | null;
      }>("/api/provider/agency/billing/checkout", {
        method: "POST",
        body:   JSON.stringify({ plan }),
      });

      // Dev mode — plan activated immediately in DB, reload silently to reflect it
      if (res.simulated) {
        toast.success(`🎉 Upgraded to ${res.plan ?? plan} (dev mode — no payment required).`);
        setPaying(null);
        await load(true);
        return;
      }

      // Live — redirect to PayPal approval page
      if (res.checkoutUrl) {
        window.location.href = res.checkoutUrl;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start checkout.");
      setPaying(null);
    }
  }

  const currentPlanKey: PlanKey = data?.plan ?? "starter";
  const currentPlan              = PLANS.find((p) => p.key === currentPlanKey)!;
  const planStatus: PlanStatus   = data?.planStatus ?? "active";
  const rate                     = data ? Math.round(data.commissionRate * 100) : 10;

  // ─── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-6 space-y-6 animate-pulse">
        <div className="h-8 w-64 bg-slate-200 rounded" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-28 bg-slate-200 rounded-xl" />)}
        </div>
        <div className="h-64 bg-slate-200 rounded-xl" />
        <div className="h-52 bg-slate-200 rounded-xl" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-10 text-center text-slate-500">
        <Building2 className="mx-auto mb-3 h-10 w-10 text-slate-300" />
        <p className="font-medium">No agency profile found.</p>
        <p className="text-sm mt-1">Set up your agency profile first.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5">

      {/* ── Past-due / cancelled banner ─────────────────────────────────── */}
      {planStatus !== "active" && (
        <div className={`rounded-2xl border px-5 py-4 flex items-center gap-3 ${
          planStatus === "past_due"
            ? "bg-amber-50 border-amber-200"
            : "bg-red-50 border-red-200"
        }`}>
          <AlertTriangle className={`h-5 w-5 shrink-0 ${planStatus === "past_due" ? "text-amber-500" : "text-red-500"}`} />
          <div>
            <p className="text-sm font-semibold text-slate-800">
              {planStatus === "past_due"
                ? "Your subscription payment is past due."
                : "Your subscription has been cancelled."}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {planStatus === "past_due"
                ? "Please renew to avoid losing access to premium features."
                : "You are currently on the limited free Starter plan."}
            </p>
          </div>
          <button
            onClick={() => document.getElementById("plans")?.scrollIntoView({ behavior: "smooth" })}
            className="ml-auto text-xs font-semibold text-violet-600 hover:underline shrink-0"
          >
            Renew plan →
          </button>
        </div>
      )}

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-5 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-violet-100 dark:bg-violet-900/30">
            <ReceiptText className="h-5 w-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800 dark:text-white">Subscription &amp; Billing</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">{data.agencyName}</p>
          </div>
        </div>
        <button
          onClick={() => load()}
          className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          title="Refresh"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* ── Current Plan + KPI strip ────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">

        {/* Current plan card */}
        <div className={`rounded-2xl p-5 ${currentPlan.color} border ${currentPlan.borderColor} col-span-1`}>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Current Plan</p>
          <div className="flex items-center gap-2 flex-wrap">
            <p className={`text-2xl font-extrabold ${currentPlan.textColor}`}>{currentPlan.label}</p>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${PLAN_STATUS_BADGE[planStatus]}`}>
              {planStatus === "active" ? "Active" : planStatus === "past_due" ? "Past Due" : "Cancelled"}
            </span>
          </div>
          <p className="text-sm font-semibold text-slate-700 mt-0.5">{currentPlan.priceLabel}</p>
          <p className="text-xs text-slate-400 mt-0.5">{currentPlan.tagline}</p>
          <ul className="mt-3 text-xs text-slate-600 space-y-1">
            <li>👥 Up to {currentPlan.staff} staff</li>
            <li>🔧 {currentPlan.services} services</li>
            <li>🏗️ {currentPlan.equipment} equipment slots</li>
          </ul>
          {data.planExpiresAt && currentPlanKey !== "starter" && (
            <p className="mt-2 text-xs text-slate-400">
              Renews {new Date(data.planExpiresAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
            </p>
          )}
          {data.pendingPlan && data.pendingPlan !== currentPlanKey && (
            <p className="mt-2 text-xs text-amber-600 font-medium">
              ⏳ Activating {data.pendingPlan} plan…
            </p>
          )}
          {currentPlanKey !== "enterprise" && (
            <button
              onClick={() => document.getElementById("plans")?.scrollIntoView({ behavior: "smooth" })}
              className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-violet-700 hover:underline"
            >
              Upgrade plan <ArrowUpRight className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* KPI cards */}
        {[
          {
            label: "This Month Earnings",
            value: formatCurrency(data.thisMonthGross),
            sub:   `After commission: ${formatCurrency(data.thisMonthGross - data.thisMonthCommission)}`,
            icon:  <TrendingUp className="h-5 w-5 text-blue-500" />,
            bg:    "bg-blue-50",
          },
          {
            label: "Total Net Earned",
            value: formatCurrency(data.totalNetEarned),
            sub:   `Across ${data.totalJobsCompleted} completed job${data.totalJobsCompleted !== 1 ? "s" : ""}`,
            icon:  <ShieldCheck className="h-5 w-5 text-emerald-500" />,
            bg:    "bg-emerald-50",
          },
          {
            label: "Total Commission Paid",
            value: formatCurrency(data.totalCommissionPaid),
            sub:   `Platform fee at ${rate}% of gross`,
            icon:  <Sparkles className="h-5 w-5 text-amber-500" />,
            bg:    "bg-amber-50",
          },
        ].map((kpi) => (
          <div key={kpi.label} className={`rounded-2xl p-5 ${kpi.bg} border border-slate-200`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{kpi.label}</p>
              {kpi.icon}
            </div>
            <p className="text-2xl font-extrabold text-slate-800">{kpi.value}</p>
            <p className="text-xs text-slate-500 mt-1">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Commission History table ─────────────────────────────────────── */}
      <section>
        <h2 className="text-base font-semibold text-slate-800 mb-3">
          Commission Breakdown
          <span className="text-slate-400 font-normal text-sm ml-1">(last 12 months)</span>
        </h2>
        <div className="rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {["Month", "Gross Earned", `Commission (${rate}%)`, "Net Earned"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.commissionHistory.filter((r) => r.gross > 0).length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-400 text-sm">
                    No earnings history yet.
                  </td>
                </tr>
              ) : [...data.commissionHistory].reverse().filter((r) => r.gross > 0).map((row) => (
                <tr key={row.month} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-700">{monthLabel(row.month)}</td>
                  <td className="px-4 py-3 text-slate-700">{formatCurrency(row.gross)}</td>
                  <td className="px-4 py-3 text-rose-600 font-medium">− {formatCurrency(row.commission)}</td>
                  <td className="px-4 py-3 text-emerald-700 font-semibold">{formatCurrency(row.net)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Plan Comparison ──────────────────────────────────────────────── */}
      <section id="plans">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-slate-800">Compare Plans</h2>
          <p className="text-xs text-slate-400 mt-0.5">All plans include marketplace access. Upgrade anytime, cancel monthly.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLANS.map((plan) => {
            const isCurrent    = plan.key === currentPlanKey;
            const planIdx      = PLANS.findIndex((p) => p.key === plan.key);
            const currentIdx   = PLANS.findIndex((p) => p.key === currentPlanKey);
            const isDowngrade  = planIdx < currentIdx;
            const isFree       = plan.price === 0;
            const isProcessing = paying === plan.key;

            return (
              <div
                key={plan.key}
                className={`relative rounded-2xl border-2 p-5 flex flex-col gap-3 ${
                  isCurrent
                    ? "border-violet-500 shadow-md"
                    : plan.popular
                      ? "border-violet-300"
                      : "border-slate-200"
                }`}
              >
                {/* Popular badge */}
                {plan.popular && !isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1 bg-violet-600 text-white text-xs font-bold px-3 py-0.5 rounded-full shadow">
                      <Star className="h-3 w-3 fill-white" /> Most Popular
                    </span>
                  </div>
                )}

                <div className="mt-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full ${plan.color} ${plan.textColor}`}>
                      {plan.label}
                    </span>
                    {isCurrent && (
                      <span className="text-xs font-semibold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full">
                        Current
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{plan.tagline}</p>
                </div>

                <div>
                  <p className="text-2xl font-extrabold text-slate-800">{plan.priceLabel}</p>
                  {plan.price !== null && plan.price > 0 && (
                    <p className="text-xs text-slate-400">billed monthly</p>
                  )}
                </div>

                {/* Limits */}
                <ul className="text-xs text-slate-600 space-y-1 border-t border-slate-100 pt-3">
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>Up to <strong>{plan.staff}</strong> staff</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span><strong>{plan.services}</strong> services</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span><strong>{plan.equipment}</strong> equipment slots</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    <span><strong>{plan.commission}</strong> commission rate</span>
                  </li>
                </ul>

                {/* Feature toggles */}
                <ul className="text-xs space-y-1.5 flex-1">
                  {(["analytics", "priorityList", "bulkOnboard", "scheduler", "support"] as const).map((feat) => (
                    <li key={feat} className="flex items-center gap-1.5">
                      {plan[feat]
                        ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        : <XCircle      className="h-3.5 w-3.5 text-slate-200 shrink-0" />}
                      <span className={plan[feat] ? "text-slate-700" : "text-slate-300"}>
                        {feat === "analytics"    && "AI Analytics"}
                        {feat === "priorityList" && "Priority Listings"}
                        {feat === "bulkOnboard"  && "Bulk Onboarding"}
                        {feat === "scheduler"    && "Recurring Scheduler"}
                        {feat === "support"      && "Priority Support"}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                {isCurrent ? (
                  <div className="mt-1 w-full text-xs font-semibold rounded-xl py-2 text-center bg-violet-50 text-violet-600 border border-violet-200">
                    Current Plan
                  </div>
                ) : (
                  <button
                    disabled={isDowngrade || isFree || !!paying}
                    className={`mt-1 w-full text-xs font-semibold rounded-xl py-2 transition-colors flex items-center justify-center gap-1.5 ${
                      isDowngrade || isFree
                        ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                        : paying
                          ? "bg-violet-400 text-white cursor-not-allowed"
                          : plan.popular
                            ? "bg-violet-600 hover:bg-violet-700 text-white shadow"
                            : "bg-slate-800 hover:bg-slate-900 text-white"
                    }`}
                    onClick={() => handleUpgrade(plan.key)}
                  >
                    {isProcessing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {isDowngrade
                      ? "Lower tier"
                      : isFree
                        ? "Free (default)"
                        : isProcessing
                          ? "Redirecting…"
                          : `Upgrade to ${plan.label}`}
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-slate-400 text-center">
          Payments processed securely via PayPal. Debit and credit cards accepted. Cancel anytime.
        </p>
      </section>

      {/* ── Add-ons & Features ────────────────────────────────────────────── */}
      <section>
        <div className="mb-4">
          <h2 className="text-base font-semibold text-slate-800">Add-ons &amp; Features</h2>
          <p className="text-xs text-slate-400 mt-0.5">Features included in your current plan are shown as enabled.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {ADD_ONS.map((addon) => {
            const enabled      = addon.includedIn.includes(currentPlanKey);
            const firstPlanKey = addon.includedIn[0];
            const firstPlan    = PLANS.find((p) => p.key === firstPlanKey);

            return (
              <div
                key={addon.key}
                className={`rounded-2xl border p-5 flex gap-4 items-start transition-colors ${
                  enabled ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"
                }`}
              >
                <div className={`p-2 rounded-lg shrink-0 ${enabled ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>
                  {addon.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="text-sm font-semibold text-slate-800">{addon.label}</p>
                    {enabled ? (
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full">
                        Included
                      </span>
                    ) : firstPlan ? (
                      <span className="text-xs font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">
                        From {firstPlan.label}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">{addon.description}</p>
                  {!enabled && (
                    <button
                      onClick={() => document.getElementById("plans")?.scrollIntoView({ behavior: "smooth" })}
                      className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-violet-600 hover:underline"
                    >
                      Upgrade to unlock <ArrowUpRight className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

    </div>
  );
}
