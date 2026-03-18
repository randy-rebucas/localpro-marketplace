"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  Zap, CheckCircle2, Loader2, RotateCcw, MapPin, Users,
  Clock, FileText, AlertTriangle, Radio, History, X,
} from "lucide-react";
import { apiFetch } from "@/lib/fetchClient";
import { formatCurrency } from "@/lib/utils";
import { useTranslations } from "next-intl";

const JOB_TYPES = [
  "Electrician", "Plumber", "Carpenter", "Construction Worker",
  "Cleaner", "Security Guard", "Rescue Worker", "Medical Aid",
  "Relief Goods Distribution", "Debris Clearing", "Other",
];

const URGENCY_LEVELS = [
  {
    value: "low",
    label: "Low",
    color: "bg-slate-100 text-slate-600",
    activeColor: "bg-slate-100 text-slate-700 border-slate-400 ring-slate-200",
    dot: "bg-slate-400",
    previewRing: "ring-slate-300",
    alert: null,
  },
  {
    value: "medium",
    label: "Medium",
    color: "bg-yellow-100 text-yellow-700",
    activeColor: "bg-yellow-50 text-yellow-700 border-yellow-400 ring-yellow-100",
    dot: "bg-yellow-400",
    previewRing: "ring-yellow-300",
    alert: null,
  },
  {
    value: "high",
    label: "High",
    color: "bg-orange-100 text-orange-700",
    activeColor: "bg-orange-50 text-orange-700 border-orange-500 ring-orange-100",
    dot: "bg-orange-500",
    previewRing: "ring-orange-400",
    alert: "This job will appear at the top of all provider feeds.",
  },
  {
    value: "critical",
    label: "Critical",
    color: "bg-red-100 text-red-700",
    activeColor: "bg-red-50 text-red-700 border-red-600 ring-red-100",
    dot: "bg-red-600",
    previewRing: "ring-red-500",
    alert: "This job will be immediately pinned to the top of the marketplace with a critical alert.",
  },
] as const;

type Urgency = "low" | "medium" | "high" | "critical";

const EMPTY_FORM = {
  jobType: "",
  location: "",
  urgency: "high" as Urgency,
  workersNeeded: 5,
  duration: "",
  notes: "",
};

const INPUT_CLS =
  "mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-400 transition bg-white";
const LABEL_CLS = "text-[11px] font-semibold text-slate-500 uppercase tracking-wider";

interface RecentBroadcast {
  _id: string;
  title: string;
  location: string;
  status: string;
  createdAt: string;
  isPriority: boolean;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function EmergencyPage() {
  const t = useTranslations("pesoPages");
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [broadcast, setBroadcast] = useState<{ _id: string; title: string } | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [recent, setRecent] = useState<RecentBroadcast[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);

  function set<K extends keyof typeof form>(key: K, val: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  useEffect(() => {
    apiFetch("/api/peso/jobs?limit=50")
      .then((r) => r.json())
      .then((d) => {
        const all: RecentBroadcast[] = d.data ?? [];
        setRecent(all.filter((j) => j.title?.startsWith("[EMERGENCY]")));
      })
      .finally(() => setLoadingRecent(false));
  }, [broadcast]); // refresh after new broadcast

  async function doSubmit() {
    setConfirmOpen(false);
    setSubmitting(true);
    try {
      const res = await apiFetch("/api/peso/emergency", {
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (!form.jobType || !form.location || !form.duration) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (form.urgency === "critical") {
      setConfirmOpen(true);
    } else {
      doSubmit();
    }
  }

  const selectedUrgency = URGENCY_LEVELS.find((u) => u.value === form.urgency)!;
  const previewTitle = form.jobType
    ? `[EMERGENCY] ${form.jobType}${form.location ? ` – ${form.location}` : ""}`
    : "[EMERGENCY] Job Type – Location";

  if (broadcast) {
    return (
      <div className="max-w-md mx-auto text-center space-y-5 pt-10">
        <div className="relative h-16 w-16 mx-auto">
          <div className="absolute inset-0 bg-emerald-200 rounded-full animate-ping opacity-60" />
          <div className="relative h-16 w-16 bg-emerald-100 rounded-full flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-800">{t("emergencyBroadcastSent")}</h2>
          <p className="text-sm text-slate-500 mt-1">
            {t("emergencyBroadcastDesc")}
          </p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-left space-y-1">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{t("postedAs")}</p>
          <p className="text-sm font-semibold text-slate-700">{broadcast.title}</p>
          <p className="text-[11px] text-slate-400 font-mono">{broadcast._id}</p>
        </div>
        <button
          onClick={() => { setBroadcast(null); setForm(EMPTY_FORM); }}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          {t("sendAnother")}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">

      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="relative mt-0.5">
          <div className="absolute inset-0 bg-red-400 rounded-full animate-ping opacity-40" />
          <div className="relative h-9 w-9 bg-red-100 rounded-full flex items-center justify-center">
            <Zap className="h-5 w-5 text-red-600" />
          </div>
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800">{t("emergencyActivation")}</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {t("emergencyActivationSub")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* ── Left: Form ── */}
        <div className="space-y-5">

          {/* Urgency selector */}
          <div>
            <p className={`${LABEL_CLS} mb-2`}>Urgency Level</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {URGENCY_LEVELS.map((u) => (
                <button
                  key={u.value}
                  type="button"
                  onClick={() => set("urgency", u.value)}
                  className={`flex items-center gap-2 justify-center py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                    form.urgency === u.value
                      ? `${u.activeColor} ring-2`
                      : "bg-white border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600"
                  }`}
                >
                  <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${u.dot}`} />
                  {u.label}
                </button>
              ))}
            </div>
          </div>

          {/* Urgency alert banner */}
          {selectedUrgency.alert && (
            <div className={`flex items-start gap-3 rounded-xl px-4 py-3 text-sm border ${
              form.urgency === "critical"
                ? "bg-red-50 border-red-200 text-red-700"
                : "bg-orange-50 border-orange-200 text-orange-700"
            }`}>
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <p>{selectedUrgency.alert}</p>
            </div>
          )}

          {/* Form card */}
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={LABEL_CLS}>
                  Job Type <span className="text-red-400 normal-case font-normal">*</span>
                </label>
                <select
                  required
                  value={form.jobType}
                  onChange={(e) => set("jobType", e.target.value)}
                  className={INPUT_CLS}
                >
                  <option value="">Select type…</option>
                  {JOB_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div>
                <label className={LABEL_CLS}>
                  Location <span className="text-red-400 normal-case font-normal">*</span>
                </label>
                <input
                  required
                  value={form.location}
                  onChange={(e) => set("location", e.target.value)}
                  placeholder="Barangay / Area"
                  className={INPUT_CLS}
                />
              </div>

              <div>
                <label className={LABEL_CLS}>
                  Workers Needed <span className="text-red-400 normal-case font-normal">*</span>
                </label>
                <input
                  required
                  type="number"
                  min={1}
                  max={500}
                  step={1}
                  value={form.workersNeeded}
                  onChange={(e) => set("workersNeeded", Number(e.target.value))}
                  className={INPUT_CLS}
                />
              </div>

              <div>
                <label className={LABEL_CLS}>
                  Duration <span className="text-red-400 normal-case font-normal">*</span>
                </label>
                <input
                  required
                  value={form.duration}
                  onChange={(e) => set("duration", e.target.value)}
                  placeholder="e.g. 3 days, 1 week"
                  className={INPUT_CLS}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className={LABEL_CLS}>Additional Notes</label>
                <span className={`text-[11px] tabular-nums ${form.notes.length > 900 ? "text-red-500" : "text-slate-400"}`}>
                  {form.notes.length}/1000
                </span>
              </div>
              <textarea
                rows={3}
                maxLength={1000}
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="Specific requirements, contact info, report location…"
                className={`${INPUT_CLS} resize-y`}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className={`w-full flex items-center justify-center gap-2 font-semibold py-3 rounded-xl text-sm disabled:opacity-60 transition-all text-white ${
                form.urgency === "critical"
                  ? "bg-red-600 hover:bg-red-700 active:bg-red-800"
                  : form.urgency === "high"
                  ? "bg-orange-500 hover:bg-orange-600 active:bg-orange-700"
                  : "bg-slate-700 hover:bg-slate-800 active:bg-slate-900"
              }`}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Radio className="h-4 w-4" />
              )}
              {submitting ? "Broadcasting…" : "Broadcast Emergency Job"}
            </button>
          </form>
        </div>

        {/* ── Right: Preview + History ── */}
        <div className="space-y-4">

          {/* Live preview card */}
          <div>
            <p className={`${LABEL_CLS} mb-2`}>Broadcast Preview</p>
            <div className={`bg-white rounded-2xl border-2 shadow-sm p-4 space-y-3 transition-all ring-2 ${selectedUrgency.previewRing} ${
              form.urgency === "critical" ? "border-red-400" : form.urgency === "high" ? "border-orange-400" : "border-slate-200"
            }`}>
              {/* Badges */}
              <div className="flex flex-wrap gap-1.5">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                  <Zap className="h-2.5 w-2.5" />
                  Priority
                </span>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${selectedUrgency.color}`}>
                  {selectedUrgency.label} Urgency
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">PESO</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-orange-50 text-orange-600">Emergency</span>
              </div>

              {/* Title */}
              <p className="text-sm font-bold text-slate-800 leading-snug">{previewTitle}</p>

              {/* Meta */}
              <div className="space-y-1.5">
                {form.location && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <MapPin className="h-3 w-3 text-blue-400 shrink-0" />
                    {form.location}
                  </div>
                )}
                {form.workersNeeded > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Users className="h-3 w-3 text-blue-400 shrink-0" />
                    {form.workersNeeded} worker{form.workersNeeded !== 1 ? "s" : ""} needed
                  </div>
                )}
                {form.duration && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Clock className="h-3 w-3 text-blue-400 shrink-0" />
                    {form.duration}
                  </div>
                )}
                {form.notes && (
                  <div className="flex items-start gap-1.5 text-xs text-slate-500">
                    <FileText className="h-3 w-3 text-blue-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{form.notes}</span>
                  </div>
                )}
              </div>

              <div className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1">
                <span className="text-xs font-bold text-emerald-600">{formatCurrency(0)}</span>
                <span className="text-[10px] text-emerald-500">Gov't funded</span>
              </div>
            </div>
          </div>

          {/* Recent broadcasts */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <History className="h-3.5 w-3.5 text-slate-400" />
              <p className={LABEL_CLS}>Recent Broadcasts</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100 overflow-hidden">
              {loadingRecent ? (
                <div className="p-4 space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-3 bg-slate-100 rounded animate-pulse" style={{ width: `${70 + i * 8}%` }} />
                  ))}
                </div>
              ) : recent.length === 0 ? (
                <div className="px-4 py-5 text-center text-xs text-slate-400">No emergency broadcasts yet.</div>
              ) : (
                recent.slice(0, 5).map((j) => (
                  <div key={j._id} className="px-4 py-2.5 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-700 truncate leading-snug">
                        {j.title.replace("[EMERGENCY] ", "")}
                      </p>
                      <div className="flex items-center gap-1 mt-0.5 text-[11px] text-slate-400">
                        <MapPin className="h-2.5 w-2.5 shrink-0" />
                        <span className="truncate">{j.location}</span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right space-y-0.5">
                      <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded-full font-medium capitalize ${
                        j.status === "open" ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"
                      }`}>
                        {j.status}
                      </span>
                      <p className="text-[10px] text-slate-400">{timeAgo(j.createdAt)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Critical confirmation modal */}
      {confirmOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div className="h-10 w-10 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <button onClick={() => setConfirmOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Confirm Critical Broadcast</h3>
              <p className="text-sm text-slate-500 mt-1">
                This will immediately pin the job to the top of the marketplace and send a critical alert to all providers. Are you sure?
              </p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
              <p className="text-xs font-semibold text-red-700 truncate">{previewTitle}</p>
              <p className="text-xs text-red-500 mt-0.5">{form.location} · {form.workersNeeded} workers · {form.duration}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmOpen(false)}
                className="flex-1 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={doSubmit}
                className="flex-1 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors"
              >
                Broadcast Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
