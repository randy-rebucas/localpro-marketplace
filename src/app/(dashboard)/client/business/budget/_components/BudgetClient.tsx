"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Wallet, MapPin, AlertTriangle, CheckCircle, XCircle,
  Settings, TrendingDown, Layers, TrendingUp, Download, FileText,
} from "lucide-react";
import { fetchClient } from "@/lib/fetchClient";
import type { IBusinessOrganization, MonthlyExpenseRow, BudgetAlertRow } from "@/types";
import { formatCurrency } from "@/lib/utils";
import toast from "react-hot-toast";

const TOP_CATEGORIES = 5;

const CAT_COLORS = [
  "bg-blue-500", "bg-violet-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500",
];

export default function BudgetClient() {
  const t = useTranslations("clientPages");
  const [org, setOrg]           = useState<IBusinessOrganization | null>(null);
  const [expenses, setExpenses] = useState<MonthlyExpenseRow[]>([]);
  const [alerts, setAlerts]     = useState<BudgetAlertRow[]>([]);
  const [loading, setLoading]   = useState(true);
  const [editThresholdId, setEditThresholdId] = useState<string | null>(null);
  const [thresholdInput, setThresholdInput]   = useState(80);
  const [savingThreshold, setSavingThreshold] = useState(false);
  const [months, setMonths] = useState(6);
  const [orgId, setOrgId]   = useState("");

  const load = useCallback(async (m = months) => {
    setLoading(true);
    try {
      const orgData = await fetchClient<{ org: IBusinessOrganization | null }>("/api/business/org");
      if (!orgData.org) { setLoading(false); return; }
      setOrg(orgData.org);
      const id = orgData.org._id.toString();
      setOrgId(id);
      const [expData, alertData] = await Promise.all([
        fetchClient<{ rows: MonthlyExpenseRow[] }>(
          `/api/business/analytics/expenses?orgId=${id}&months=${m}`
        ),
        fetchClient<{ alerts: BudgetAlertRow[] }>(
          `/api/business/analytics/budget-alerts?orgId=${id}`
        ),
      ]);
      setExpenses(expData.rows);
      setAlerts(alertData.alerts);
    } catch {
      toast.error("Failed to load budget data.");
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { load(); }, [load]);

  function handleMonthsChange(m: number) {
    setMonths(m);
    load(m);
  }

  const currentMonth   = new Date().toISOString().slice(0, 7);
  const thisMonthRows  = expenses.filter((r) => r.month === currentMonth);
  const thisMonthSpend = thisMonthRows.reduce((s, r) => s + r.totalSpend, 0);
  const totalBudget    = org?.locations.reduce((s, l) => s + l.monthlyBudget, 0) ?? 0;
  const budgetPct      = totalBudget > 0 ? Math.min(100, (thisMonthSpend / totalBudget) * 100) : 0;
  const remaining      = Math.max(0, totalBudget - thisMonthSpend);

  const catMap: Record<string, number> = {};
  for (const r of thisMonthRows) {
    for (const [cat, amt] of Object.entries(r.categoryBreakdown ?? {})) {
      catMap[cat] = (catMap[cat] ?? 0) + amt;
    }
  }
  const topCats   = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, TOP_CATEGORIES);
  const maxCatAmt = topCats[0]?.[1] ?? 1;

  const criticalAlerts  = alerts.filter((a) => a.status === "critical");
  const warningAlerts   = alerts.filter((a) => a.status === "warning");
  const currentMonthLabel = new Date().toLocaleString("default", { month: "long", year: "numeric" });
  // Lowest alert threshold across active locations (for marker on overall bar)
  const lowestThreshold = org
    ? Math.min(
        ...org.locations
          .filter((l) => l.isActive && l.monthlyBudget > 0)
          .map((l) => l.alertThreshold ?? 80)
      )
    : 80;

  async function saveThreshold(locationId: string) {
    if (!org) return;
    setSavingThreshold(true);
    try {
      await fetchClient("/api/business/locations", {
        method: "PATCH",
        body: JSON.stringify({ orgId: org._id, locationId, alertThreshold: thresholdInput }),
      });
      toast.success("Alert threshold updated.");
      setEditThresholdId(null);
      await load();
    } catch {
      toast.error("Failed to update threshold.");
    } finally {
      setSavingThreshold(false);
    }
  }

  // ── forecast helpers (used in sidebar) ──────────────────────────────────
  const forecastData = useMemo(() => {
    if (expenses.length < 2) return null;
    const sorted = [...expenses].sort((a, b) => a.month.localeCompare(b.month));
    const last3  = sorted.slice(-3);
    const avgSp  = last3.reduce((s, r) => s + r.totalSpend, 0) / last3.length;
    const trend  = last3.length >= 2
      ? (last3[last3.length - 1].totalSpend - last3[0].totalSpend) / Math.max(1, last3.length - 1)
      : 0;
    const forecast = Math.max(0, avgSp + trend);
    const nd = new Date(); nd.setMonth(nd.getMonth() + 1);
    return {
      forecast, avgSp, trend,
      nextLabel:   nd.toISOString().slice(0, 7),
      last3,
      overBudget:  totalBudget > 0 && forecast > totalBudget,
      trendDir:    trend > 50 ? "up" : trend < -50 ? "down" : "flat",
    };
  }, [expenses, totalBudget]);

  if (loading) {
    return (
      <div className="space-y-5 animate-pulse">
        <div className="h-9 w-48 bg-slate-200 rounded-lg" />
        <div className="grid sm:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-slate-200 rounded-2xl" />)}
        </div>
        <div className="h-48 bg-slate-200 rounded-2xl" />
        <div className="h-64 bg-slate-200 rounded-2xl" />
      </div>
    );
  }

  if (!org) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
        <Wallet className="h-10 w-10 text-slate-300" />
        <p className="text-slate-500">
          {t("bizBudget_noOrg")}{" "}
          <a href="/client/business" className="text-primary underline">{t("bizAnalytics_createFirst")}</a>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* ══ Row 1 — Header ══════════════════════════════════════════════════ */}
      <div className="flex items-center justify-between gap-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-5 py-4 shadow-sm flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
            <Wallet className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800 dark:text-white">{t("bizBudget_heading")}</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">{org.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full">
            {currentMonthLabel}
          </span>
          <select
            className="input text-sm"
            value={months}
            onChange={(e) => handleMonthsChange(Number(e.target.value))}
          >
            <option value={3}>{t("bizBudget_last3mo")}</option>
            <option value={6}>{t("bizBudget_last6mo")}</option>
            <option value={12}>{t("bizBudget_last12mo")}</option>
          </select>
        </div>
      </div>

      {/* ══ Row 2 — Alert banners (full width, conditional) ════════════════ */}
      {criticalAlerts.length > 0 && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl p-4">
          <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-800 text-sm">{t("bizBudget_critical")}</p>
            <ul className="mt-1 space-y-0.5 text-xs text-red-700">
              {criticalAlerts.map((a) => (
                <li key={a.locationId}>
                  <strong>{a.locationLabel}</strong> — {a.pct.toFixed(0)}% used{" "}
                  <span className="opacity-70">({formatCurrency(a.spentThisMonth)} of {formatCurrency(a.budgetTotal)})</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      {warningAlerts.length > 0 && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-800 text-sm">{t("bizBudget_warning")}</p>
            <ul className="mt-1 space-y-0.5 text-xs text-amber-700">
              {warningAlerts.map((a) => (
                <li key={a.locationId}>
                  <strong>{a.locationLabel}</strong> — {a.pct.toFixed(0)}% used
                  <span className="opacity-70"> (threshold {a.threshold}%)</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      {alerts.length > 0 && criticalAlerts.length === 0 && warningAlerts.length === 0 && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
          <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0" />
          <p className="text-sm font-medium text-emerald-800">{t("bizBudget_allWithin")}</p>
        </div>
      )}

      {/* ══ Row 3 — KPI strip (3 cards, full width) ════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            label: t("bizBudget_monthlyBudget"),
            value: formatCurrency(totalBudget),
            sub: t("bizBudget_totalAcross"),
            icon: Wallet,
            color: "text-blue-600", bg: "bg-blue-50", ring: "ring-blue-100",
          },
          {
            label: t("bizBudget_monthSpend"),
            value: formatCurrency(thisMonthSpend),
            sub: t("bizBudget_percentUsed", { n: budgetPct.toFixed(0) }),
            icon: TrendingDown,
            color: budgetPct >= 90 ? "text-red-600" : budgetPct >= 70 ? "text-amber-600" : "text-emerald-600",
            bg:    budgetPct >= 90 ? "bg-red-50"    : budgetPct >= 70 ? "bg-amber-50"    : "bg-emerald-50",
            ring:  budgetPct >= 90 ? "ring-red-100" : budgetPct >= 70 ? "ring-amber-100" : "ring-emerald-100",
          },
          {
            label: t("bizBudget_remaining"),
            value: formatCurrency(remaining),
            sub: t("bizBudget_leftThisMonth"),
            icon: Layers,
            color: "text-violet-600", bg: "bg-violet-50", ring: "ring-violet-100",
          },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4">
            <div className={`${kpi.bg} ring-4 ${kpi.ring} p-3 rounded-xl flex-shrink-0`}>
              <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{kpi.label}</p>
              <p className="text-2xl font-bold text-slate-900 leading-tight">{kpi.value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{kpi.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ══ Row 4 — Overall bar (full width) ═══════════════════════════════ */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-slate-700">Overall Budget Usage</span>
          <span className={`font-bold tabular-nums ${
            budgetPct >= 90 ? "text-red-600" : budgetPct >= 70 ? "text-amber-600" : "text-emerald-600"
          }`}>{budgetPct.toFixed(1)}%</span>
        </div>
        <div className="relative h-3">
          <div className="h-full bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                budgetPct >= 90 ? "bg-red-500" : budgetPct >= 70 ? "bg-amber-500" : "bg-emerald-500"
              }`}
              style={{ width: `${budgetPct}%` }}
            />
          </div>
          {totalBudget > 0 && lowestThreshold < 100 && (
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-slate-400/60"
              style={{ left: `${lowestThreshold}%` }}
              title={`Alert threshold: ${lowestThreshold}%`}
            />
          )}
        </div>
        <div className="flex justify-between text-xs text-slate-400 tabular-nums">
          <span>{formatCurrency(thisMonthSpend)} spent</span>
          {totalBudget > 0 && lowestThreshold < 100 && (
            <span className="text-slate-300">threshold at {lowestThreshold}%</span>
          )}
          <span>{formatCurrency(remaining)} remaining</span>
        </div>
      </div>

      {/* ══ Row 5 — Two-column content zone ════════════════════════════════
           Left (lg:col-span-2)  : Branches
           Right (lg:col-span-1) : Category + Forecast + Reports
      ═══════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">

        {/* ── LEFT: Branches ── */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">Branches</h2>
            <span className="text-xs text-slate-400">{org.locations.filter((l) => l.isActive).length} active</span>
          </div>
          {org.locations.filter((l) => l.isActive).length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
              <MapPin className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">
                No active branches.{" "}
                <a href="/client/business/locations" className="text-primary underline">Add one.</a>
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {org.locations.filter((l) => l.isActive).map((loc) => {
                const al        = alerts.find((a) => a.locationId === loc._id.toString());
                const pct       = al?.pct ?? 0;
                const locStatus = al?.status ?? "ok";
                const threshold = loc.alertThreshold ?? 80;
                const isEditing = editThresholdId === loc._id.toString();

                return (
                  <div key={loc._id.toString()} className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className={`mt-0.5 p-1.5 rounded-lg flex-shrink-0 ${
                          locStatus === "critical" ? "bg-red-100" :
                          locStatus === "warning"  ? "bg-amber-100" :
                          "bg-emerald-100"
                        }`}>
                          <MapPin className={`h-3.5 w-3.5 ${
                            locStatus === "critical" ? "text-red-600" :
                            locStatus === "warning"  ? "text-amber-600" :
                            "text-emerald-600"
                          }`} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-slate-800 leading-tight">{loc.label}</p>
                          <p className="text-xs text-slate-400 truncate mt-0.5">{loc.address}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {locStatus === "critical" && (
                          <span className="text-[10px] font-semibold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                            {t("bizBudget_critical")}
                          </span>
                        )}
                        {locStatus === "warning" && (
                          <span className="text-[10px] font-semibold bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full">
                            {t("bizBudget_warning")}
                          </span>
                        )}
                        <button
                          onClick={() => {
                            setEditThresholdId(isEditing ? null : loc._id.toString());
                            setThresholdInput(threshold);
                          }}
                          className={`p-1.5 rounded-lg transition-colors ${
                            isEditing ? "bg-primary/10 text-primary" : "hover:bg-slate-100 text-slate-400"
                          }`}
                          title="Set alert threshold"
                        >
                          <Settings className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {loc.monthlyBudget > 0 && (
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-baseline text-xs tabular-nums">
                          <span className="font-semibold text-slate-800">
                            {al ? formatCurrency(al.spentThisMonth) : "—"}
                            <span className="text-slate-400 font-normal"> / {formatCurrency(loc.monthlyBudget)}</span>
                          </span>
                          <span className={`font-bold text-sm ${
                            locStatus === "critical" ? "text-red-600" :
                            locStatus === "warning"  ? "text-amber-600" :
                            "text-emerald-600"
                          }`}>{pct.toFixed(0)}%</span>
                        </div>
                        <div className="relative h-2">
                          <div className="h-full bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                locStatus === "critical" ? "bg-red-500" :
                                locStatus === "warning"  ? "bg-amber-500" :
                                "bg-emerald-500"
                              }`}
                              style={{ width: `${Math.min(100, pct)}%` }}
                            />
                          </div>
                          <div
                            className="absolute top-0 bottom-0 w-0.5 bg-slate-400/50"
                            style={{ left: `${threshold}%` }}
                            title={`Alert threshold: ${threshold}%`}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400">
                          <span>Alert at {threshold}%</span>
                          <span>{formatCurrency(Math.max(0, loc.monthlyBudget - (al?.spentThisMonth ?? 0)))} left</span>
                        </div>
                      </div>
                    )}

                    {loc.monthlyBudget === 0 && (
                      <p className="text-xs text-slate-400">
                        {t("bizBudget_noBudget")}{" "}
                        <a href="/client/business/locations" className="text-primary underline">{t("bizBudget_setInLocations")}</a>
                      </p>
                    )}

                    {isEditing && (
                      <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                        <label className="text-xs text-slate-500 flex-shrink-0">{t("bizBudget_alertAtLabel")}</label>
                        <input
                          type="number"
                          min={1} max={99}
                          className="border border-slate-200 rounded-lg px-2 py-1 text-sm w-16 text-center focus:outline-none focus:ring-2 focus:ring-primary/30"
                          value={thresholdInput}
                          onChange={(e) => setThresholdInput(Number(e.target.value))}
                        />
                        <span className="text-xs text-slate-400">{t("bizBudget_percentSuffix")}</span>
                        <button
                          onClick={() => saveThreshold(loc._id.toString())}
                          disabled={savingThreshold}
                          className="text-xs bg-primary text-white px-3 py-1 rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
                        >
                          {savingThreshold ? t("bizBudget_savingButton") : t("bizBudget_saveButton")}
                        </button>
                        <button
                          onClick={() => setEditThresholdId(null)}
                          className="text-xs text-slate-400 hover:text-slate-600"
                        >
                          {t("bizBudget_cancelButton")}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── RIGHT sidebar ── */}
        <div className="lg:col-span-1 space-y-4">

          {/* Category breakdown */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-slate-800">{t("bizBudget_byCategory")}</h2>
              <span className="text-xs text-slate-400">{currentMonthLabel}</span>
            </div>
            {topCats.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">{t("bizBudget_noData")}</p>
            ) : (
              <div className="space-y-3">
                {topCats.map(([cat, amt], i) => (
                  <div key={cat} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`h-2 w-2 rounded-full flex-shrink-0 ${CAT_COLORS[i]}`} />
                        <span className="text-slate-600 truncate font-medium">{cat}</span>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                        <span className="text-slate-400 tabular-nums">
                          {thisMonthSpend > 0 ? `${((amt / thisMonthSpend) * 100).toFixed(0)}%` : "—"}
                        </span>
                        <span className="font-bold text-slate-800 tabular-nums">{formatCurrency(amt)}</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${CAT_COLORS[i]}`}
                        style={{ width: `${(amt / maxCatAmt) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cost Forecast */}
          {forecastData && (
            <div className={`bg-white rounded-2xl border p-5 space-y-3 ${forecastData.overBudget ? "border-amber-300" : "border-slate-200"}`}>
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4 text-violet-500" />
                  {t("bizBudget_forecast")}
                </h2>
                <span className="text-xs text-slate-400">{forecastData.nextLabel}</span>
              </div>
              <p className="text-3xl font-bold text-slate-900 tabular-nums">{formatCurrency(forecastData.forecast)}</p>
              <div className="flex flex-wrap gap-1.5">
                {forecastData.overBudget ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-md">
                    <AlertTriangle className="h-3 w-3" /> {t("bizBudget_forecastExceeds")}
                  </span>
                ) : totalBudget > 0 ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-md">
                    <CheckCircle className="h-3 w-3" /> {t("bizBudget_forecastWithin")}
                  </span>
                ) : null}
                <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-md border ${
                  forecastData.trendDir === "up"   ? "text-red-600 bg-red-50 border-red-200" :
                  forecastData.trendDir === "down" ? "text-emerald-600 bg-emerald-50 border-emerald-200" :
                  "text-slate-500 bg-slate-50 border-slate-200"
                }`}>
                  {forecastData.trendDir === "up" ? t("bizBudget_forecastRising") : forecastData.trendDir === "down" ? t("bizBudget_forecastFalling") : t("bizBudget_forecastStable")}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                3-mo rolling avg{" "}
                <span className="font-medium text-slate-600">{formatCurrency(forecastData.avgSp)}/mo</span>
                {" "}({forecastData.last3[0]?.month}–{forecastData.last3[forecastData.last3.length - 1]?.month})
              </p>
            </div>
          )}

          {/* Download Reports */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
            <div>
              <h2 className="font-semibold text-slate-800">{t("bizBudget_reportsTitle")}</h2>
              <p className="text-xs text-slate-400 mt-0.5">{t("bizBudget_reportsSub")}</p>
            </div>
            <div className="space-y-2">
              {[
                { title: "Monthly Expense",     desc: "This month",      href: `/api/business/analytics/report?orgId=${orgId}&months=1`,                      icon: FileText, color: "text-blue-600",    bg: "bg-blue-50"    },
                { title: "Quarterly Expense",   desc: "Last 3 months",   href: `/api/business/analytics/report?orgId=${orgId}&months=3`,                      icon: FileText, color: "text-violet-600",  bg: "bg-violet-50"  },
                { title: "Annual Expense",      desc: "Last 12 months",  href: `/api/business/analytics/report?orgId=${orgId}&months=12`,                     icon: Download, color: "text-emerald-600", bg: "bg-emerald-50" },
                { title: "Provider Performance",desc: "Metrics & scores", href: `/api/business/analytics/report?orgId=${orgId}&type=providers&months=12`,     icon: Download, color: "text-amber-600",   bg: "bg-amber-50"   },
              ].map((r) => (
                <a
                  key={r.title}
                  href={r.href}
                  className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-100 hover:bg-slate-50 hover:border-slate-200 transition-all group"
                >
                  <div className={`${r.bg} p-2 rounded-lg flex-shrink-0`}>
                    <r.icon className={`h-3.5 w-3.5 ${r.color}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-slate-700 leading-tight">{r.title}</p>
                    <p className="text-[11px] text-slate-400">{r.desc}</p>
                  </div>
                  <Download className="h-3.5 w-3.5 text-slate-300 group-hover:text-slate-500 flex-shrink-0 transition-colors" />
                </a>
              ))}
            </div>
          </div>

        </div>{/* end right sidebar */}
      </div>{/* end two-column zone */}

      {/* ══ Row 6 — Expense History (full width) ════════════════════════════ */}
      {expenses.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">Expense History</h2>
            <span className="text-xs text-slate-400">Last {months} months</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[500px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="text-left px-5 py-3">Month</th>
                  <th className="text-right px-5 py-3">Jobs</th>
                  <th className="text-right px-5 py-3">Spend</th>
                  <th className="text-right px-5 py-3">vs Budget</th>
                  <th className="text-right px-5 py-3">vs Prior Mo.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {[...expenses].reverse().map((row) => {
                  const pct = totalBudget > 0
                    ? `${((row.totalSpend / totalBudget) * 100).toFixed(0)}%`
                    : "—";
                  const momLabel =
                    row.momChange === null ? "—" :
                    row.momChange > 0      ? `▲ ${row.momChange.toFixed(1)}%` :
                    row.momChange < 0      ? `▼ ${Math.abs(row.momChange).toFixed(1)}%` :
                    "—";
                  const momColor =
                    row.momChange === null ? "text-slate-400" :
                    row.momChange > 0      ? "text-red-500"    :
                    row.momChange < 0      ? "text-emerald-600" :
                    "text-slate-400";
                  return (
                    <tr key={row.month} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3.5 font-medium text-slate-700 tabular-nums">{row.month}</td>
                      <td className="px-5 py-3.5 text-right text-slate-500 tabular-nums">{row.jobCount}</td>
                      <td className="px-5 py-3.5 text-right font-semibold text-slate-900 tabular-nums">
                        {formatCurrency(row.totalSpend)}
                      </td>
                      <td className="px-5 py-3.5 text-right text-slate-400 tabular-nums">{pct}</td>
                      <td className={`px-5 py-3.5 text-right font-semibold tabular-nums ${momColor}`}>{momLabel}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}

