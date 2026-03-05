"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Wallet, Clock, CheckCircle, Download, CreditCard, ChevronRight,
  RefreshCw, AlertTriangle, ArrowUpRight, Layers, FileText, User,
} from "lucide-react";
import { fetchClient } from "@/lib/fetchClient";
import type { IBusinessOrganization } from "@/types";
import { formatCurrency } from "@/lib/utils";
import toast from "react-hot-toast";

// ─── Types ────────────────────────────────────────────────────────────────────
interface PendingRelease {
  jobId: string;
  title: string;
  amount: number;
  status: string;
  escrowStatus: string;
  scheduleDate: string;
  provider: { id: string; name: string; avatar: string | null } | null;
  milestones: { _id: string; title: string; amount: number; status: string }[];
}

interface PaymentRow {
  paymentId: string;
  amount: number;
  status: string;
  method: string;
  createdAt: string;
  job: { id: string; title: string; category: string } | null;
  provider: { id: string; name: string } | null;
}

interface EscrowData {
  escrowBalance: number;
  pendingReleases: PendingRelease[];
  paymentHistory: PaymentRow[];
  historyTotal: number;
  historyPage: number;
  historyLimit: number;
}

const STATUS_BADGE: Record<string, string> = {
  in_progress: "bg-blue-100 text-blue-700",
  completed:   "bg-emerald-100 text-emerald-700",
  assigned:    "bg-violet-100 text-violet-700",
};

export default function EscrowClient() {
  const [org, setOrg]           = useState<IBusinessOrganization | null>(null);
  const [orgId, setOrgId]       = useState("");
  const [data, setData]         = useState<EscrowData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [page, setPage]         = useState(1);
  const [selected, setSelected] = useState<PendingRelease | null>(null);
  const [releasing, setReleasing] = useState(false);
  const [partialJobId, setPartialJobId] = useState<string | null>(null);
  const [partialAmountInput, setPartialAmountInput] = useState("");

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const orgData = await fetchClient<{ org: IBusinessOrganization | null }>("/api/business/org");
      if (!orgData.org) { setLoading(false); return; }
      setOrg(orgData.org);
      const id = orgData.org._id.toString();
      setOrgId(id);

      const res = await fetchClient<EscrowData>(
        `/api/business/escrow?orgId=${id}&page=${p}&limit=20`
      );
      setData(res);
    } catch {
      toast.error("Failed to load escrow data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleRelease(jobId: string, partial?: number) {
    if (!orgId) return;
    setReleasing(true);
    try {
      await fetchClient(`/api/jobs/${jobId}/release-escrow`, {
        method: "POST",
        body: JSON.stringify({ partial }),
      });
      toast.success("Escrow release submitted for approval.");
      setSelected(null);
      await load(page);
    } catch {
      toast.error("Release failed. Finance approval may be required.");
    } finally {
      setReleasing(false);
    }
  }

  const totalPages = data ? Math.ceil(data.historyTotal / data.historyLimit) : 1;

  if (loading) {
    return (
      <div className="space-y-5 animate-pulse">
        <div className="h-9 w-48 bg-slate-200 rounded-lg" />
        <div className="grid sm:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-slate-200 rounded-2xl" />)}
        </div>
        <div className="h-64 bg-slate-200 rounded-2xl" />
      </div>
    );
  }

  if (!org || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
        <Wallet className="h-10 w-10 text-slate-300" />
        <p className="text-slate-500">
          No business profile found.{" "}
          <a href="/client/business" className="text-primary underline">Create one first.</a>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-start sm:items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Escrow &amp; Payments</h1>
          <p className="text-slate-500 text-sm mt-0.5">{org.name}</p>
        </div>
        <button
          onClick={() => load(page)}
          className="flex items-center gap-1.5 text-sm border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            label: "Escrow Wallet Balance",
            value: formatCurrency(data.escrowBalance),
            sub:   "funds held in escrow",
            icon:  Wallet,
            color: "text-blue-600", bg: "bg-blue-50", ring: "ring-blue-100",
          },
          {
            label: "Pending Releases",
            value: data.pendingReleases.length,
            sub:   "jobs awaiting escrow release",
            icon:  Clock,
            color: data.pendingReleases.length > 0 ? "text-amber-600" : "text-slate-400",
            bg:    data.pendingReleases.length > 0 ? "bg-amber-50"    : "bg-slate-50",
            ring:  data.pendingReleases.length > 0 ? "ring-amber-100" : "ring-slate-100",
          },
          {
            label: "Payment History",
            value: data.historyTotal,
            sub:   "completed payments",
            icon:  CreditCard,
            color: "text-emerald-600", bg: "bg-emerald-50", ring: "ring-emerald-100",
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

      {/* ── Main 2-col zone ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">

        {/* ── LEFT: Pending Releases ── */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="font-semibold text-slate-800">Pending Releases</h2>
          {data.pendingReleases.length === 0 ? (
            <div className="text-center py-14 bg-white rounded-2xl border border-slate-200">
              <CheckCircle className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No pending escrow releases.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.pendingReleases.map((rel) => (
                <div
                  key={rel.jobId}
                  className={`bg-white border rounded-2xl p-4 space-y-3 transition-all ${
                    selected?.jobId === rel.jobId ? "border-primary/40 shadow-sm" : "border-slate-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-800 leading-tight truncate">{rel.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {new Date(rel.scheduleDate).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_BADGE[rel.status] ?? "bg-slate-100 text-slate-600"}`}>
                        {rel.status.replace("_", " ")}
                      </span>
                      <p className="text-sm font-bold text-slate-900 tabular-nums">{formatCurrency(rel.amount)}</p>
                    </div>
                  </div>

                  {rel.provider && (
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      {rel.provider.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={rel.provider.avatar} alt="" className="h-5 w-5 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <div className="h-5 w-5 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                          <User className="h-3 w-3 text-slate-400" />
                        </div>
                      )}
                      <span>{rel.provider.name}</span>
                    </div>
                  )}

                  {/* Milestone list (if any) */}
                  {rel.milestones.length > 0 && (
                    <div className="space-y-1.5 pt-1 border-t border-slate-100">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Milestones</p>
                      {rel.milestones.map((ms) => (
                        <div key={ms._id} className="flex items-center justify-between text-xs">
                          <span className={`flex items-center gap-1.5 ${ms.status === "released" ? "text-slate-400 line-through" : "text-slate-700"}`}>
                            {ms.status === "released"
                              ? <CheckCircle className="h-3 w-3 text-emerald-500 flex-shrink-0" />
                              : <Clock className="h-3 w-3 text-amber-400 flex-shrink-0" />
                            }
                            {ms.title}
                          </span>
                          <span className={`font-semibold tabular-nums ${ms.status === "released" ? "text-slate-400" : "text-slate-700"}`}>
                            {formatCurrency(ms.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => setSelected(selected?.jobId === rel.jobId ? null : rel)}
                      className="text-xs px-3 py-1.5 rounded-lg border border-primary text-primary hover:bg-primary/10 transition-colors"
                    >
                      {selected?.jobId === rel.jobId ? "Cancel" : "Release Escrow"}
                    </button>
                    <a
                      href={`/client/jobs/${rel.jobId}`}
                      className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"
                    >
                      View Job <ChevronRight className="h-3 w-3" />
                    </a>
                  </div>

                  {/* Expand: Release controls */}
                  {selected?.jobId === rel.jobId && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-3">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-800">
                          Releasing escrow will transfer funds to the provider. Finance Officer approval may be required.
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => handleRelease(rel.jobId)}
                          disabled={releasing}
                          className="text-xs bg-primary text-white px-4 py-1.5 rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors font-medium"
                        >
                          {releasing ? "Submitting…" : "Full Release"}
                        </button>
                        {rel.milestones.length === 0 && (
                          partialJobId === rel.jobId ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min={1}
                                max={rel.amount}
                                value={partialAmountInput}
                                onChange={(e) => setPartialAmountInput(e.target.value)}
                                placeholder={`Max ${formatCurrency(rel.amount)}`}
                                className="input text-xs w-32"
                              />
                              <button
                                onClick={() => {
                                  const amt = parseFloat(partialAmountInput);
                                  if (amt > 0 && amt <= rel.amount) {
                                    setPartialJobId(null);
                                    setPartialAmountInput("");
                                    handleRelease(rel.jobId, amt);
                                  }
                                }}
                                disabled={releasing}
                                className="text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors font-medium"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => { setPartialJobId(null); setPartialAmountInput(""); }}
                                className="text-xs border border-slate-300 text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => { setPartialJobId(rel.jobId); setPartialAmountInput(""); }}
                              disabled={releasing}
                              className="text-xs border border-slate-300 text-slate-600 px-4 py-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-50 transition-colors"
                            >
                              Partial Release
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── RIGHT: Escrow info ── */}
        <div className="lg:col-span-1 space-y-4">
          {/* How it works */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
            <h2 className="font-semibold text-slate-800">How Escrow Works</h2>
            <ol className="space-y-3">
              {[
                { icon: Layers,       step: "1", title: "Job Funded",    desc: "Client funds escrow when job begins." },
                { icon: Clock,        step: "2", title: "Work Done",     desc: "Provider completes the job." },
                { icon: CheckCircle,  step: "3", title: "Release",       desc: "Finance approves fund release to provider." },
                { icon: ArrowUpRight, step: "4", title: "Payout",        desc: "Provider receives funds via payout." },
              ].map((s) => (
                <li key={s.step} className="flex items-start gap-3">
                  <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-xs font-bold text-primary">
                    {s.step}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-700">{s.title}</p>
                    <p className="text-[11px] text-slate-400">{s.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Approval note */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 space-y-1">
            <p className="text-xs font-semibold text-blue-800">Multi-Approval Release</p>
            <p className="text-[11px] text-blue-700 leading-relaxed">
              Full releases above ₱10,000 require Finance Officer approval before processing.
              Milestone releases can be done per-completion.
            </p>
          </div>

          {/* Invoice download */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
            <div>
              <h2 className="font-semibold text-slate-800">Invoices</h2>
              <p className="text-xs text-slate-400 mt-0.5">Download payment invoices for accounting.</p>
            </div>
            {[
              { label: "This Month", months: 1 },
              { label: "Last 3 Months", months: 3 },
              { label: "Last 12 Months", months: 12 },
            ].map((r) => (
              <a
                key={r.label}
                href={orgId ? `/api/business/analytics/report?orgId=${orgId}&months=${r.months}&type=payments` : "#"}
                className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-100 hover:bg-slate-50 hover:border-slate-200 transition-all group"
              >
                <div className="bg-blue-50 p-2 rounded-lg flex-shrink-0">
                  <FileText className="h-3.5 w-3.5 text-blue-600" />
                </div>
                <span className="text-sm text-slate-600 flex-1">{r.label}</span>
                <Download className="h-3.5 w-3.5 text-slate-300 group-hover:text-slate-500 transition-colors" />
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* ── Payment History ── */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">Payment History</h2>
          <span className="text-xs text-slate-400">{data.historyTotal} total</span>
        </div>

        {data.paymentHistory.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-10">No completed payments yet.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[560px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    <th className="text-left px-5 py-3">Date</th>
                    <th className="text-left px-5 py-3">Job</th>
                    <th className="text-left px-5 py-3">Provider</th>
                    <th className="text-left px-5 py-3">Method</th>
                    <th className="text-right px-5 py-3">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {data.paymentHistory.map((p) => (
                    <tr key={p.paymentId} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3.5 text-slate-500 tabular-nums whitespace-nowrap">
                        {new Date(p.createdAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="min-w-0">
                          <p className="font-medium text-slate-700 truncate max-w-[180px]">{p.job?.title ?? "—"}</p>
                          <p className="text-[11px] text-slate-400">{p.job?.category ?? ""}</p>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 truncate max-w-[140px]">{p.provider?.name ?? "—"}</td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full capitalize">
                          {p.method.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right font-semibold text-slate-900 tabular-nums">
                        {formatCurrency(p.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 text-xs text-slate-500">
                <span>Page {page} of {totalPages}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => { const p = page - 1; setPage(p); load(p); }}
                    disabled={page <= 1}
                    className="px-3 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                  >
                    Prev
                  </button>
                  <button
                    onClick={() => { const p = page + 1; setPage(p); load(p); }}
                    disabled={page >= totalPages}
                    className="px-3 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

    </div>
  );
}
