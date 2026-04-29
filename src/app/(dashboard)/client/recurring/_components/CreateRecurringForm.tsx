"use client";

import { useState, useEffect } from "react";
import { RECURRING_CATEGORIES, type RecurringFrequency } from "@/types";
import { toast } from "react-hot-toast";
import { UserCheck } from "lucide-react";
import Card, { CardBody, CardFooter } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { apiFetch } from "@/lib/fetchClient";

interface Props {
  onCreated: () => void;
  onCancel: () => void;
}

interface PastProvider { _id: string; name: string; email: string; }

export function CreateRecurringForm({ onCreated, onCancel }: Props) {
  const [saving, setSaving] = useState(false);
  const [pastProviders, setPastProviders] = useState<PastProvider[]>([]);
  const [form, setForm] = useState({
    title: "",
    category: RECURRING_CATEGORIES[0],
    description: "",
    budget: "",
    location: "",
    frequency: "weekly" as RecurringFrequency,
    scheduleDate: "",
    autoPayEnabled: false,
    specialInstructions: "",
    maxRuns: "",
    providerId: "",
  });

  // Load past providers for the optional picker
  useEffect(() => {
    fetch("/api/recurring/past-providers")
      .then((r) => r.json())
      .then((d) => setPastProviders(d.providers ?? []))
      .catch(() => {});
  }, []);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.scheduleDate) { toast.error("Pick a start date."); return; }

    try {
      setSaving(true);
      const body = {
        title:               form.title,
        category:            form.category,
        description:         form.description,
        budget:              parseFloat(form.budget),
        location:            form.location,
        frequency:           form.frequency,
        scheduleDate:        new Date(form.scheduleDate).toISOString(),
        autoPayEnabled:      form.autoPayEnabled,
        specialInstructions: form.specialInstructions || undefined,
        maxRuns:             form.maxRuns ? parseInt(form.maxRuns, 10) : undefined,
        providerId:          form.providerId || undefined,
      };
      const res = await apiFetch("/api/recurring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || d.error || "Failed to create schedule");
      }
      toast.success("Recurring schedule created! 🎉");
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error creating schedule");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
    <form onSubmit={handleSubmit}>
      <Card>
        {/* Card header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-900">New Recurring Booking</h2>
            <p className="text-xs text-slate-500 mt-0.5">Auto-post weekly or monthly jobs so you never have to rebook.</p>
          </div>
          <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full whitespace-nowrap">
            🔁 Recurring
          </span>
        </div>

        <CardBody className="space-y-5">

      {/* Category + Frequency row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1.5">
            Category <span className="text-red-500">*</span>
          </label>
          <select
            value={form.category}
            onChange={(e) => set("category", e.target.value as typeof form["category"])}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white"
            required
          >
            {RECURRING_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1.5">
            Frequency <span className="text-red-500">*</span>
          </label>
          <select
            value={form.frequency}
            onChange={(e) => set("frequency", e.target.value as RecurringFrequency)}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white"
            required
          >
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
      </div>

      {/* Title */}
      <div>
        <label className="block text-xs font-medium text-slate-700 mb-1.5">
          Job Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="e.g. Weekly house deep-clean"
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          minLength={5}
          maxLength={200}
          required
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-medium text-slate-700 mb-1.5">
          Description <span className="text-red-500">*</span>
        </label>
        <textarea
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="Describe the recurring work needed (min 20 characters)"
          rows={3}
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
          minLength={20}
          required
        />
      </div>

      {/* Budget + Location row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1.5">
            Budget per session (₱) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={form.budget}
            onChange={(e) => set("budget", e.target.value)}
            placeholder="e.g. 1500"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            min={1}
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1.5">
            Location <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.location}
            onChange={(e) => set("location", e.target.value)}
            placeholder="Full address"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            required
          />
        </div>
      </div>

      {/* First Occurrence + Max runs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1.5">
            First occurrence <span className="text-red-500">*</span>
          </label>
          <input
            type="datetime-local"
            value={form.scheduleDate}
            onChange={(e) => set("scheduleDate", e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1.5">
            Max sessions <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <input
            type="number"
            value={form.maxRuns}
            onChange={(e) => set("maxRuns", e.target.value)}
            placeholder="Leave blank for unlimited"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            min={1}
          />
        </div>
      </div>

      {/* Special instructions */}
      <div>
        <label className="block text-xs font-medium text-slate-700 mb-1.5">
          Special Instructions <span className="text-slate-400 font-normal">(optional)</span>
        </label>
        <textarea
          value={form.specialInstructions}
          onChange={(e) => set("specialInstructions", e.target.value)}
          placeholder="Gate code, recurring notes, etc."
          rows={2}
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
        />
      </div>

      {/* Preferred provider picker (only shown when past providers exist) */}
      {pastProviders.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
            <UserCheck className="h-3.5 w-3.5 text-slate-400" />
            Preferred Provider <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <select
            value={form.providerId}
            onChange={(e) => set("providerId", e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white"
          >
            <option value="">No preference — open to all providers</option>
            {pastProviders.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name} ({p.email})
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-400 mt-1">
            Choosing a provider sends every future run directly to them, skipping the open marketplace.
          </p>
        </div>
      )}

      {/* Auto-pay toggle */}
      <label className="flex items-start gap-3 cursor-pointer select-none p-3.5 rounded-xl border border-slate-200 hover:border-primary/30 hover:bg-slate-50/50 transition">
        <div className="relative mt-0.5 flex-shrink-0">
          <input
            type="checkbox"
            className="sr-only"
            checked={form.autoPayEnabled}
            onChange={(e) => set("autoPayEnabled", e.target.checked)}
          />
          <div
            className={`w-10 h-5 rounded-full transition-colors ${
              form.autoPayEnabled ? "bg-primary" : "bg-slate-300"
            }`}
          />
          <div
            className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
              form.autoPayEnabled ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-800">Auto-pay reminders</p>
          <p className="text-xs text-slate-500 mt-0.5">
            Get notified to fund escrow each time a recurring job is auto-posted.
          </p>
        </div>
      </label>
        </CardBody>

        <CardFooter className="flex items-center justify-between gap-3">
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" isLoading={saving}>
            {saving ? "Creating…" : "Create Schedule"}
          </Button>
        </CardFooter>
      </Card>
    </form>
    </div>
  );
}
