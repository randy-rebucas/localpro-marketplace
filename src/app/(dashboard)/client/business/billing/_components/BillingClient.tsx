"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  ReceiptText, RefreshCw, TrendingUp, CheckCircle2, XCircle,
  Sparkles, Zap, BarChart3, CalendarClock, Headphones,
  MapPin, Users, Building2, ShieldCheck, ArrowUpRight,
  Loader2, AlertTriangle,
} from "lucide-react";
import { fetchClient } from "@/lib/fetchClient";
import type { IBusinessOrganization } from "@/types";
import { formatCurrency } from "@/lib/utils";
import toast from "react-hot-toast";

// ─── Plan definitions ─────────────────────────────────────────────────────────
type PlanKey = "starter" | "growth" | "pro" | "enterprise";

interface PlanDef {
  key:         PlanKey;
  label:       string;
  price:       number | null; // null = contact sales
  priceLabel:  string;
  color:       string;       // tailwind bg token
  textColor:   string;
  branches:    string;
  members:     string;
  jobs:        string;
  analytics:   boolean;
  bulkUpload:  boolean;
  recurring:   boolean;
  priority:    boolean;
}

const PLANS: PlanDef[] = [
  {
    key: "starter", label: "Starter", price: 0,    priceLabel: "Free",
    color: "bg-slate-100",   textColor: "text-slate-700",
    branches: "2", members: "5",   jobs: "10 / mo",
    analytics: false, bulkUpload: false, recurring: false, priority: false,
  },
  {
    key: "growth",  label: "Growth",  price: 999,  priceLabel: "₱999 / mo",
    color: "bg-blue-100",    textColor: "text-blue-700",
    branches: "5", members: "15",  jobs: "50 / mo",
    analytics: true,  bulkUpload: false, recurring: false, priority: false,
  },
  {
    key: "pro",     label: "Pro",     price: 2499, priceLabel: "₱2,499 / mo",
    color: "bg-violet-100",  textColor: "text-violet-700",
    branches: "15", members: "50",  jobs: "Unlimited",
    analytics: true,  bulkUpload: true,  recurring: true,  priority: false,
  },
  {
    key: "enterprise", label: "Enterprise", price: 4999, priceLabel: "₱4,999 / mo",
    color: "bg-amber-100",   textColor: "text-amber-700",
    branches: "Unlimited", members: "Unlimited", jobs: "Unlimited",
    analytics: true,  bulkUpload: true,  recurring: true,  priority: true,
  },
];

// ─── Add-on definitions ───────────────────────────────────────────────────────
interface AddOn {
  key:         string;
  label:       string;
  description: string;
  icon:        React.ReactNode;
  includedIn:  PlanKey[];
}

const ADD_ONS: AddOn[] = [
  {
    key: "branches",
    label: "Multi-Branch Management",
    description: "Manage unlimited branch locations with per-branch budgets, managers and job controls.",
    icon: <MapPin className="h-5 w-5" />,
    includedIn: ["growth", "pro", "enterprise"],
  },
  {
    key: "analytics",
    label: "AI Analytics",
    description: "AI-powered spend insights, provider performance scoring and predictive budget alerts.",
    icon: <BarChart3 className="h-5 w-5" />,
    includedIn: ["growth", "pro", "enterprise"],
  },
  {
    key: "bulk",
    label: "Bulk Job Upload (CSV)",
    description: "Upload dozens of jobs at once via CSV. Perfect for scheduled maintenance batches.",
    icon: <Zap className="h-5 w-5" />,
    includedIn: ["pro", "enterprise"],
  },
  {
    key: "recurring",
    label: "Recurring Scheduler",
    description: "Auto-post recurring jobs on weekly, monthly or custom cadences.",
    icon: <CalendarClock className="h-5 w-5" />,
    includedIn: ["pro", "enterprise"],
  },
  {
    key: "members",
    label: "Team Members & Roles",
    description: "Invite managers, supervisors and finance staff with granular branch-level permissions.",
    icon: <Users className="h-5 w-5" />,
    includedIn: ["growth", "pro", "enterprise"],
  },
  {
    key: "support",
    label: "Priority Support",
    description: "Dedicated account manager, 4-hour SLA and white-glove onboarding.",
    icon: <Headphones className="h-5 w-5" />,
    includedIn: ["enterprise"],
  },
];

// ─── API types ────────────────────────────────────────────────────────────────
type PlanStatus = "active" | "past_due" | "cancelled";

interface CommissionRow {
  month:      string;   // "YYYY-MM"
  gross:      number;
  commission: number;
  jobs:       number;
}

interface BillingData {
  commissionRate:       number;
  commissionHistory:    CommissionRow[];
  totalGrossSpend:      number;
  totalCommissionPaid:  number;
  totalJobsCompleted:   number;
  thisMonthGross:       number;
  thisMonthCommission:  number;
  branchCount:          number;
  memberCount:          number;
  orgName:              string;
  // subscription
  plan:             PlanKey;
  planStatus:       PlanStatus;
  planActivatedAt:  string | null;
  planExpiresAt:    string | null;
  pendingPlan:      string | null;
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
export default function BillingClient() {
  const searchParams  = useSearchParams();
  const [org,     setOrg]     = useState<IBusinessOrganization | null>(null);
  const [orgId,   setOrgId]   = useState("");
  const [data,    setData]    = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying,  setPaying]  = useState<PlanKey | null>(null);

  // True when we arrived back from PayPal — the confirm effect owns the first load
  const isConfirmFlow = searchParams.get("plan_success") === "1";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const orgData = await fetchClient<{ org: IBusinessOrganization | null }>("/api/business/org", { cache: "no-store" });
      if (!orgData.org) { setLoading(false); return; }
      setOrg(orgData.org);
      const id = orgData.org._id.toString();
      setOrgId(id);

      const res = await fetchClient<BillingData>(`/api/business/billing?orgId=${id}`, { cache: "no-store" });
      setData(res);
    } catch {
      toast.error("Failed to load billing data.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Skip initial fetch when the confirm effect is about to run — it owns data loading
  useEffect(() => { if (!isConfirmFlow) load(); }, [load, isConfirmFlow]);

  // Handle redirect-back from PayPal checkout
  useEffect(() => {
    if (searchParams.get("plan_success") !== "1") {
      if (searchParams.get("plan_cancelled") === "1") {
        toast("Payment cancelled \u2014 your plan was not changed.", { icon: "\u2139\ufe0f" });
        window.history.replaceState({}, "", window.location.pathname);
      }
      return;
    }

    // Clean up URL right away so reloads don’t re-trigger
    window.history.replaceState({}, "", window.location.pathname);

    // Proactively confirm via PayPal capture — don't wait for webhook
    const confirm = async () => {
      try {
        const orgData = await fetchClient<{ org: { _id: string } | null }>("/api/business/org");
        if (!orgData.org) return;
        const oid = orgData.org._id.toString();

        const paypalOrderId = searchParams.get("token");
        if (!paypalOrderId) {
          load();
          return;
        }

        const res = await fetchClient<{
          activated:     boolean;
          alreadyActive?: boolean;
          plan?:         string;
          planStatus?:   string;
          planExpiresAt?: string | null;
        }>("/api/business/billing/confirm", {
          method: "POST",
          body: JSON.stringify({ orgId: oid, orderId: paypalOrderId }),
        });

        if (res.activated || res.alreadyActive) {
          // Apply immediately — don't let load() race overwrite the correct plan
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
          toast.success("\ud83c\udf89 Plan activated! Your subscription is now live.");
        } else {
          toast("Payment received \u2014 plan activation in progress.", { icon: "\u23f3" });
        }
      } catch {
        toast("Payment received \u2014 plan activation in progress.", { icon: "\u23f3" });
      } finally {
        load();
      }
    };

    confirm();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Upgrade handler via PayPal checkout ──────────────────────────────────
  async function handleUpgrade(plan: PlanKey) {
    if (!orgId || paying || plan === "starter") return;
    setPaying(plan);
    try {
      const res = await fetchClient<{ checkoutUrl: string }>("/api/business/billing/checkout", {
        method: "POST",
        body: JSON.stringify({ orgId, plan }),
      });
      window.location.href = res.checkoutUrl;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start checkout.");
      setPaying(null);
    }
  }

  const currentPlanKey: PlanKey = data?.plan ?? "starter";
  const currentPlan = PLANS.find((p) => p.key === currentPlanKey)!;
  const planStatus: PlanStatus  = data?.planStatus ?? "active";

  // ─── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-6 space-y-6 animate-pulse">
        <div className="h-8 w-60 bg-slate-200 rounded" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-slate-200 rounded-xl" />
          ))}
        </div>
        <div className="h-64 bg-slate-200 rounded-xl" />
        <div className="h-48 bg-slate-200 rounded-xl" />
      </div>
    );
  }

  if (!org) {
    return (
      <div className="p-10 text-center text-slate-500">
        <Building2 className="mx-auto mb-3 h-10 w-10 text-slate-300" />
        <p className="font-medium">No organisation found.</p>
        <p className="text-sm mt-1">Set up your business profile first.</p>
      </div>
    );
  }

  const rate = data ? Math.round(data.commissionRate * 100) : 20;

  return (
    <div className="p-6 space-y-8 max-w-6xl">

      {/* ── Past-due / cancelled banner ─────────────────────────────────────── */}
      {planStatus !== "active" && (
        <div className={`rounded-xl border px-5 py-4 flex items-center gap-3 ${
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
                : "You are currently on a limited Starter plan."}
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

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-5 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-violet-100 dark:bg-violet-900/30">
            <ReceiptText className="h-5 w-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800 dark:text-white">Subscription &amp; Billing</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">{org.name}</p>
          </div>
        </div>
        <button
          onClick={load}
          title="Refresh"
          aria-label="Refresh"
          className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* ── Current Plan + KPI strip ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">

        {/* Current plan card */}
        <div className={`rounded-xl p-5 ${currentPlan.color} border border-slate-200 col-span-1`}>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Current Plan</p>
          <div className="flex items-center gap-2 flex-wrap">
            <p className={`text-2xl font-extrabold ${currentPlan.textColor}`}>{currentPlan.label}</p>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${PLAN_STATUS_BADGE[planStatus]}`}>
              {planStatus === "active" ? "Active" : planStatus === "past_due" ? "Past Due" : "Cancelled"}
            </span>
          </div>
          <p className="text-sm font-medium text-slate-600 mt-0.5">{currentPlan.priceLabel}</p>
          <ul className="mt-3 text-xs text-slate-600 space-y-1">
            <li>🏢 {currentPlan.branches} branches</li>
            <li>👥 {currentPlan.members} members</li>
            <li>📋 {currentPlan.jobs}</li>
          </ul>
          {data?.planExpiresAt && currentPlanKey !== "starter" && (
            <p className="mt-2 text-xs text-slate-500">
              Renews {new Date(data.planExpiresAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
            </p>
          )}
          {data?.pendingPlan && data.pendingPlan !== currentPlanKey && (
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
            label: "This Month Spend",
            value: formatCurrency(data?.thisMonthGross ?? 0),
            sub:   `${rate}% commission = ${formatCurrency(data?.thisMonthCommission ?? 0)}`,
            icon: <TrendingUp className="h-5 w-5 text-blue-500" />,
            bg:   "bg-blue-50",
          },
          {
            label: "Total Gross Spend",
            value: formatCurrency(data?.totalGrossSpend ?? 0),
            sub:   `${data?.totalJobsCompleted ?? 0} jobs completed`,
            icon: <ShieldCheck className="h-5 w-5 text-emerald-500" />,
            bg:   "bg-emerald-50",
          },
          {
            label: "Total Commission Paid",
            value: formatCurrency(data?.totalCommissionPaid ?? 0),
            sub:   `Platform fee at ${rate}%`,
            icon: <Sparkles className="h-5 w-5 text-amber-500" />,
            bg:   "bg-amber-50",
          },
        ].map((kpi) => (
          <div key={kpi.label} className={`rounded-xl p-5 ${kpi.bg} border border-slate-200`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{kpi.label}</p>
              {kpi.icon}
            </div>
            <p className="text-2xl font-extrabold text-slate-800">{kpi.value}</p>
            <p className="text-xs text-slate-500 mt-1">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Commission History table ─────────────────────────────────────────── */}
      <section>
        <h2 className="text-base font-semibold text-slate-800 mb-3">
          Commission Breakdown <span className="text-slate-400 font-normal text-sm">(last 12 months)</span>
        </h2>
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {["Month", "Jobs", "Gross Spend", `Commission (${rate}%)`, "Net to Providers"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(data?.commissionHistory ?? []).length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400 text-sm">
                    No transaction history yet.
                  </td>
                </tr>
              ) : [...(data?.commissionHistory ?? [])].reverse().map((row) => (
                <tr key={row.month} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-700">{monthLabel(row.month)}</td>
                  <td className="px-4 py-3 text-slate-600">{row.jobs}</td>
                  <td className="px-4 py-3 text-slate-700">{formatCurrency(row.gross)}</td>
                  <td className="px-4 py-3 text-rose-600 font-medium">{formatCurrency(row.commission)}</td>
                  <td className="px-4 py-3 text-emerald-700 font-medium">
                    {formatCurrency(row.gross - row.commission)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Plan Comparison ──────────────────────────────────────────────────── */}
      <section id="plans">
        <h2 className="text-base font-semibold text-slate-800 mb-3">Compare Plans</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
                className={`rounded-xl border-2 p-5 flex flex-col gap-3 ${
                  isCurrent ? "border-violet-500 shadow-md" : "border-slate-200"
                }`}
              >
                <div>
                  <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full ${plan.color} ${plan.textColor}`}>
                    {plan.label}
                  </span>
                  {isCurrent && (
                    <span className="ml-2 text-xs font-semibold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full">
                      Current
                    </span>
                  )}
                </div>
                <p className="text-xl font-extrabold text-slate-800">{plan.priceLabel}</p>
                <ul className="text-xs text-slate-600 space-y-1.5 flex-1">
                  {[
                    `🏢 ${plan.branches} branches`,
                    `👥 ${plan.members} members`,
                    `📋 ${plan.jobs}`,
                  ].map((f) => <li key={f}>{f}</li>)}
                  {(["analytics", "bulkUpload", "recurring", "priority"] as const).map((feat) => (
                    <li key={feat} className="flex items-center gap-1">
                      {plan[feat]
                        ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        : <XCircle      className="h-3.5 w-3.5 text-slate-300 shrink-0" />}
                      <span className={plan[feat] ? "text-slate-700" : "text-slate-400"}>
                        {feat === "analytics"  && "AI Analytics"}
                        {feat === "bulkUpload" && "Bulk CSV Upload"}
                        {feat === "recurring"  && "Recurring Scheduler"}
                        {feat === "priority"   && "Priority Support"}
                      </span>
                    </li>
                  ))}
                </ul>
                {!isCurrent && (
                  <button
                    disabled={isDowngrade || isFree || !!paying}
                    className={`mt-2 w-full text-xs font-semibold rounded-lg py-2 transition-colors flex items-center justify-center gap-1.5 ${
                      isDowngrade || isFree
                        ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                        : paying
                          ? "bg-violet-400 text-white cursor-not-allowed"
                          : "bg-violet-600 hover:bg-violet-700 text-white"
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
          Payments processed securely via PayPal. Debit and credit cards accepted.
        </p>
      </section>

      {/* ── Add-ons ──────────────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-base font-semibold text-slate-800 mb-3">Add-ons &amp; Features</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ADD_ONS.map((addon) => {
            const enabled = addon.includedIn.includes(currentPlanKey);
            return (
              <div
                key={addon.key}
                className={`rounded-xl border p-5 flex gap-4 items-start transition-colors ${
                  enabled ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"
                }`}
              >
                <div className={`p-2 rounded-lg shrink-0 ${enabled ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>
                  {addon.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold text-slate-800">{addon.label}</p>
                    {enabled ? (
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full">
                        Enabled
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">
                        Not included
                      </span>
                    )}
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
