"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Zap, CheckCircle } from "lucide-react";

const JOB_TYPES = [
  "Electrician", "Plumber", "Carpenter", "Construction Worker",
  "Cleaner", "Security Guard", "Rescue Worker", "Medical Aid",
  "Relief Goods Distribution", "Debris Clearing", "Other",
];

const URGENCY_LEVELS = [
  { value: "low",      label: "Low",      color: "bg-slate-100 text-slate-600",    dot: "bg-slate-400" },
  { value: "medium",   label: "Medium",   color: "bg-yellow-100 text-yellow-700",  dot: "bg-yellow-400" },
  { value: "high",     label: "High",     color: "bg-orange-100 text-orange-700",  dot: "bg-orange-500" },
  { value: "critical", label: "Critical", color: "bg-red-100 text-red-700",        dot: "bg-red-600" },
] as const;

type Urgency = "low" | "medium" | "high" | "critical";

export default function EmergencyPage() {
  const [form, setForm] = useState({
    jobType: "",
    location: "",
    urgency: "high" as Urgency,
    workersNeeded: 5,
    duration: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [broadcast, setBroadcast] = useState<{ _id: string; title: string } | null>(null);

  function set<K extends keyof typeof form>(key: K, val: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (!form.jobType || !form.location || !form.duration) {
      toast.error("Please fill in all required fields");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/peso/emergency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, workersNeeded: Number(form.workersNeeded) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to broadcast");
      setBroadcast({ _id: data._id, title: data.title });
      toast.success("Emergency job posted and broadcasted");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (broadcast) {
    return (
      <div className="max-w-lg mx-auto text-center space-y-4 pt-8">
        <div className="h-16 w-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle className="h-8 w-8 text-emerald-600" />
        </div>
        <h2 className="text-lg font-bold text-slate-800">Emergency Broadcast Sent</h2>
        <p className="text-sm text-slate-500">
          The emergency job has been posted as a priority listing and will appear at the top of the provider marketplace.
        </p>
        <p className="text-xs font-mono text-slate-400 bg-slate-100 rounded-lg px-3 py-2">{broadcast.title}</p>
        <button
          onClick={() => { setBroadcast(null); setForm({ jobType: "", location: "", urgency: "high", workersNeeded: 5, duration: "", notes: "" }); }}
          className="mt-2 text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors"
        >
          Send another broadcast
        </button>
      </div>
    );
  }

  const selectedUrgency = URGENCY_LEVELS.find((u) => u.value === form.urgency)!;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Zap className="h-5 w-5 text-red-500" />
          Emergency Workforce Activation
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Post an urgent job that appears as a priority broadcast to all providers.
        </p>
      </div>

      {/* Urgency selector */}
      <div className="grid grid-cols-4 gap-2">
        {URGENCY_LEVELS.map((u) => (
          <button
            key={u.value}
            type="button"
            onClick={() => set("urgency", u.value)}
            className={`flex items-center gap-2 justify-center py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
              form.urgency === u.value
                ? `${u.color} border-current`
                : "bg-white border-slate-200 text-slate-400 hover:border-slate-300"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${u.dot}`} />
            {u.label}
          </button>
        ))}
      </div>

      {/* Alert banner for high/critical */}
      {(form.urgency === "high" || form.urgency === "critical") && (
        <div className={`flex items-start gap-3 rounded-xl px-4 py-3 ${
          form.urgency === "critical" ? "bg-red-50 border border-red-200 text-red-700" : "bg-orange-50 border border-orange-200 text-orange-700"
        }`}>
          <Zap className="h-4 w-4 mt-0.5 shrink-0" />
          <p className="text-sm">
            {form.urgency === "critical"
              ? "CRITICAL: This job will be immediately pinned to the top of the marketplace and marked with a critical alert."
              : "HIGH priority: This job will appear at the top of all provider feeds."}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        {/* Current urgency badge */}
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${selectedUrgency.color}`}>
            {selectedUrgency.label} Priority
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Job Type *</label>
            <select
              required
              value={form.jobType}
              onChange={(e) => set("jobType", e.target.value)}
              className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-400"
            >
              <option value="">Select type…</option>
              {JOB_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Location *</label>
            <input
              required
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
              placeholder="Barangay / Area"
              className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Workers Needed *</label>
            <input
              required
              type="number"
              min={1}
              max={500}
              value={form.workersNeeded}
              onChange={(e) => set("workersNeeded", Number(e.target.value))}
              className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Duration *</label>
            <input
              required
              value={form.duration}
              onChange={(e) => set("duration", e.target.value)}
              placeholder="e.g. 3 days, 1 week"
              className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Additional Notes</label>
          <textarea
            rows={3}
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Specific requirements, contact info, report location…"
            className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-400 resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 rounded-lg text-sm disabled:opacity-60 transition-colors"
        >
          <Zap className="h-4 w-4" />
          {submitting ? "Broadcasting…" : "Broadcast Emergency Job"}
        </button>
      </form>
    </div>
  );
}
