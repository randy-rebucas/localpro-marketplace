"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Card, { CardBody, CardFooter } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import type { IRecurringSchedule } from "@/types";

interface PastProvider { _id: string; name: string; email: string; }

function EditSkeleton() {
  return (
    <div className="max-w-2xl animate-pulse space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <div className="h-5 bg-slate-200 rounded w-32" />
        {[1,2,3,4].map(i => <div key={i} className="h-10 bg-slate-100 rounded-lg" />)}
      </div>
    </div>
  );
}

export function EditRecurringClient({ id }: { id: string }) {
  const router = useRouter();
  const [schedule, setSchedule] = useState<IRecurringSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pastProviders, setPastProviders] = useState<PastProvider[]>([]);
  const [form, setForm] = useState({
    title: "",
    description: "",
    budget: "",
    location: "",
    specialInstructions: "",
    maxRuns: "",
    autoPayEnabled: false,
    providerId: "",
  });

  useEffect(() => {
    Promise.all([
      fetch(`/api/recurring/${id}`).then((r) => r.json()),
      fetch("/api/recurring/past-providers").then((r) => r.json()),
    ]).then(([sched, pp]) => {
      const s = sched as IRecurringSchedule;
      setSchedule(s);
      setPastProviders(pp.providers ?? []);
      setForm({
        title:               s.title,
        description:         s.description,
        budget:              String(s.budget),
        location:            s.location,
        specialInstructions: s.specialInstructions ?? "",
        maxRuns:             s.maxRuns ? String(s.maxRuns) : "",
        autoPayEnabled:      s.autoPayEnabled,
        providerId:          s.providerId ? String(s.providerId) : "",
      });
    }).catch(() => {
      toast.error("Could not load schedule.");
    }).finally(() => setLoading(false));
  }, [id]);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await fetch(`/api/recurring/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title:               form.title,
          description:         form.description,
          budget:              parseFloat(form.budget),
          location:            form.location,
          specialInstructions: form.specialInstructions || undefined,
          maxRuns:             form.maxRuns ? parseInt(form.maxRuns, 10) : null,
          autoPayEnabled:      form.autoPayEnabled,
          providerId:          form.providerId || null,
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message || "Failed to save"); }
      toast.success("Schedule updated.");
      router.push(`/client/recurring/${id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <EditSkeleton />;
  if (!schedule) return <p className="text-sm text-slate-500">Schedule not found.</p>;
  if (schedule.status === "cancelled") {
    return (
      <p className="text-sm text-slate-500 bg-slate-50 rounded-xl border border-slate-200 p-6">
        Cancelled schedules cannot be edited.
      </p>
    );
  }

  const fieldCls = "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white";
  const labelCls = "block text-xs font-medium text-slate-700 mb-1.5";

  return (
    <div className="max-w-2xl">
      <form onSubmit={handleSubmit}>
        <Card>
          <div className="px-4 sm:px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="font-semibold text-slate-900">Edit Schedule</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Category and frequency cannot be changed after creation.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">{schedule.category}</span>
              <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium capitalize">{schedule.frequency}</span>
            </div>
          </div>

          <CardBody className="space-y-5">
            {/* Title */}
            <div>
              <label className={labelCls}>Job Title <span className="text-red-500">*</span></label>
              <input type="text" value={form.title} onChange={(e) => set("title", e.target.value)}
                className={fieldCls} minLength={5} maxLength={200} required />
            </div>

            {/* Description */}
            <div>
              <label className={labelCls}>Description <span className="text-red-500">*</span></label>
              <textarea value={form.description} onChange={(e) => set("description", e.target.value)}
                rows={3} className={`${fieldCls} resize-none`} minLength={20} required />
            </div>

            {/* Budget + Location */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Budget per session (₱) <span className="text-red-500">*</span></label>
                <input type="number" value={form.budget} onChange={(e) => set("budget", e.target.value)}
                  className={fieldCls} min={1} required />
              </div>
              <div>
                <label className={labelCls}>Location <span className="text-red-500">*</span></label>
                <input type="text" value={form.location} onChange={(e) => set("location", e.target.value)}
                  className={fieldCls} required />
              </div>
            </div>

            {/* Max runs */}
            <div>
              <label className={labelCls}>Max sessions <span className="text-slate-400 font-normal">(optional)</span></label>
              <input type="number" value={form.maxRuns} onChange={(e) => set("maxRuns", e.target.value)}
                placeholder="Leave blank for unlimited" className={fieldCls} min={1} />
            </div>

            {/* Special instructions */}
            <div>
              <label className={labelCls}>Special Instructions <span className="text-slate-400 font-normal">(optional)</span></label>
              <textarea value={form.specialInstructions} onChange={(e) => set("specialInstructions", e.target.value)}
                rows={2} placeholder="Gate code, recurring notes, etc."
                className={`${fieldCls} resize-none`} />
            </div>

            {/* Preferred provider */}
            {pastProviders.length > 0 && (
              <div>
                <label className={labelCls}>Preferred Provider <span className="text-slate-400 font-normal">(optional)</span></label>
                <select value={form.providerId} onChange={(e) => set("providerId", e.target.value)} className={fieldCls}>
                  <option value="">No preference — open to all providers</option>
                  {pastProviders.map((p) => (
                    <option key={p._id} value={p._id}>{p.name} ({p.email})</option>
                  ))}
                </select>
                <p className="text-xs text-slate-400 mt-1">
                  Choosing a provider sends every future run directly to them.
                </p>
              </div>
            )}

            {/* Auto-pay toggle */}
            <label className="flex items-start gap-3 cursor-pointer select-none p-3.5 rounded-xl border border-slate-200 hover:border-primary/30 hover:bg-slate-50/50 transition">
              <div className="relative mt-0.5 flex-shrink-0">
                <input type="checkbox" className="sr-only" checked={form.autoPayEnabled}
                  onChange={(e) => set("autoPayEnabled", e.target.checked)} />
                <div className={`w-10 h-5 rounded-full transition-colors ${form.autoPayEnabled ? "bg-primary" : "bg-slate-300"}`} />
                <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.autoPayEnabled ? "translate-x-5" : "translate-x-0"}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-800">Auto-pay reminders</p>
                <p className="text-xs text-slate-500 mt-0.5">Get notified to fund escrow each time a recurring job is auto-posted.</p>
              </div>
            </label>
          </CardBody>

          <CardFooter className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
            <Button type="button" variant="secondary" className="w-full sm:w-auto justify-center" onClick={() => router.push(`/client/recurring/${id}`)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={saving} className="w-full sm:w-auto justify-center">
              {saving ? "Saving…" : "Save Changes"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
