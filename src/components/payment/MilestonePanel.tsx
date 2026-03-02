"use client";

import { useState } from "react";
import { CheckCircle, Clock, PlusCircle, ChevronDown, ChevronUp } from "lucide-react";
import { apiFetch } from "@/lib/fetchClient";
import type { IMilestone } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MilestonePanelProps {
  jobId: string;
  budget: number;
  jobStatus: string;
  escrowStatus: string;
  /** Whether the current user is the client who owns the job */
  isClient: boolean;
  initialMilestones: IMilestone[];
  onReleased?: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pct(amount: number, budget: number) {
  return Math.min(100, Math.round((amount / budget) * 100));
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MilestonePanel({
  jobId,
  budget,
  jobStatus,
  escrowStatus,
  isClient,
  initialMilestones,
  onReleased,
}: MilestonePanelProps) {
  const [milestones, setMilestones]   = useState<IMilestone[]>(initialMilestones);
  const [expanded, setExpanded]       = useState(true);
  const [adding, setAdding]           = useState(false);
  const [releasing, setReleasing]     = useState<string | null>(null);
  const [removing, setRemoving]       = useState<string | null>(null);
  const [error, setError]             = useState("");

  // New milestone form
  const [form, setForm] = useState({ title: "", amount: "", description: "" });

  const canEdit = isClient && escrowStatus === "funded" && ["assigned", "in_progress"].includes(jobStatus);
  const canRelease = isClient && escrowStatus === "funded" && jobStatus === "completed";

  const totalCommitted = milestones.reduce((s, m) => s + m.amount, 0);
  const remaining      = budget - totalCommitted;
  const releasedTotal  = milestones.filter((m) => m.status === "released").reduce((s, m) => s + m.amount, 0);

  // ── Add milestone ──────────────────────────────────────────────────────────
  async function handleAdd() {
    setError("");
    const amount = Number(form.amount);
    if (!form.title.trim()) return setError("Title is required.");
    if (!amount || amount <= 0) return setError("Amount must be positive.");
    if (amount > remaining) return setError(`Amount exceeds remaining budget (₱${remaining.toLocaleString()}).`);

    try {
      setAdding(true);
      const res = await apiFetch(`/api/jobs/${jobId}/milestones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: form.title, amount, description: form.description }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Failed to add milestone.");
      setMilestones((prev) => [...prev, (data as { milestone: IMilestone }).milestone]);
      setForm({ title: "", amount: "", description: "" });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to add milestone.");
    } finally {
      setAdding(false);
    }
  }

  // ── Release milestone ──────────────────────────────────────────────────────
  async function handleRelease(mId: string) {
    setError("");
    try {
      setReleasing(mId);
      const res = await apiFetch(`/api/jobs/${jobId}/milestones/${mId}/release`, { method: "POST" });
      const data = await res.json() as { allReleased?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to release milestone.");
      setMilestones((prev) =>
        prev.map((m) =>
          m._id?.toString() === mId ? { ...m, status: "released", releasedAt: new Date() } : m
        )
      );
      if (data.allReleased) onReleased?.();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to release milestone.");
    } finally {
      setReleasing(null);
    }
  }

  // ── Remove (pending only — client-side only before save in future) ─────────
  // NOTE: The API currently doesn't expose a DELETE; milestones can only be
  // removed by the client before any are released. For now we handle removal
  // optimistically by re-saving via a future PATCH route. Disable for MVP.
  void removing; void setRemoving; // suppress unused-var lint

  if (escrowStatus !== "funded") return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-4"
      >
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-800">Milestone Payments</span>
          {milestones.length > 0 && (
            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700">
              {milestones.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <span>
            ₱{releasedTotal.toLocaleString()} / ₱{totalCommitted.toLocaleString()} released
          </span>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-100 px-5 pb-5 pt-4 space-y-4">
          {/* Progress bar */}
          {totalCommitted > 0 && (
            <div>
              <div className="mb-1 flex justify-between text-xs text-slate-500">
                <span>Budget committed to milestones</span>
                <span>{pct(totalCommitted, budget)}% (₱{totalCommitted.toLocaleString()} / ₱{budget.toLocaleString()})</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-violet-500 transition-all"
                  style={{ width: `${pct(totalCommitted, budget)}%` }}
                />
              </div>
              {remaining > 0 && (
                <p className="mt-1 text-xs text-slate-400">
                  ₱{remaining.toLocaleString()} of budget not yet allocated to a milestone
                </p>
              )}
            </div>
          )}

          {/* Milestone list */}
          {milestones.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                <CheckCircle size={18} className="text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-600">No milestones yet</p>
              <p className="text-xs text-slate-400">Break the job into smaller payments for better control.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {milestones.map((m) => (
                <li key={m._id?.toString()} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">{m.title}</p>
                    {m.description && (
                      <p className="mt-0.5 truncate text-xs text-slate-400">{m.description}</p>
                    )}
                    {m.status === "released" && m.releasedAt && (
                      <p className="mt-0.5 text-xs text-emerald-600">
                        Released {new Date(m.releasedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-sm font-semibold text-slate-700">
                      ₱{m.amount.toLocaleString()}
                    </span>
                    {m.status === "released" ? (
                      <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                        <CheckCircle size={12} />
                        Released
                      </span>
                    ) : canRelease ? (
                      <button
                        type="button"
                        disabled={releasing === m._id?.toString()}
                        onClick={() => handleRelease(m._id!.toString())}
                        className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
                      >
                        {releasing === m._id?.toString() ? "Releasing…" : "Release"}
                      </button>
                    ) : (
                      <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                        <Clock size={12} />
                        Pending
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* Error */}
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}

          {/* Add milestone form */}
          {canEdit && (
            <div className="rounded-lg border border-dashed border-violet-200 bg-violet-50/50 p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">
                Add Milestone
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  type="text"
                  placeholder="Title (e.g. Foundation laid)"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="col-span-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-400"
                />
                <input
                  type="number"
                  placeholder="Amount (₱)"
                  min={1}
                  max={remaining}
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-400"
                />
                <input
                  type="text"
                  placeholder="Description (optional)"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-400"
                />
              </div>
              <button
                type="button"
                disabled={adding}
                onClick={handleAdd}
                className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
              >
                <PlusCircle size={14} />
                {adding ? "Adding…" : "Add Milestone"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
