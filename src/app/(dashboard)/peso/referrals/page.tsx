"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { UserPlus } from "lucide-react";

export default function ReferralsPage() {
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    barangay: "",
    skills: "",
    livelihoodProgram: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setSuccess(null);

    try {
      const res = await fetch("/api/peso/referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone || undefined,
          barangay: form.barangay || undefined,
          skills: form.skills ? form.skills.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
          livelihoodProgram: form.livelihoodProgram || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to refer provider");

      toast.success("Provider referred successfully! Activation email sent.");
      setSuccess(`Account created for ${form.email}`);
      setForm({ name: "", email: "", phone: "", barangay: "", skills: "", livelihoodProgram: "" });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Refer a Provider</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Create a LocalPro provider account for a worker you&apos;ve referred.
          They will receive an activation link by email.
        </p>
      </div>

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg px-4 py-3">
          {success} — An activation email has been sent.
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Full Name *</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Juan dela Cruz"
              className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Email Address *</label>
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="juan@email.com"
              className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Phone</label>
            <input
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="09xx-xxx-xxxx"
              className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Barangay</label>
            <input
              value={form.barangay}
              onChange={(e) => setForm((f) => ({ ...f, barangay: e.target.value }))}
              placeholder="e.g. Brgy. Poblacion"
              className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
            Skills <span className="font-normal normal-case text-slate-400">(comma-separated)</span>
          </label>
          <input
            value={form.skills}
            onChange={(e) => setForm((f) => ({ ...f, skills: e.target.value }))}
            placeholder="e.g. Electrician, Carpentry, Cleaning"
            className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:ring-1 focus:ring-blue-400"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Livelihood Program</label>
          <input
            value={form.livelihoodProgram}
            onChange={(e) => setForm((f) => ({ ...f, livelihoodProgram: e.target.value }))}
            placeholder="e.g. DOLE Kabuhayan Program"
            className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:ring-1 focus:ring-blue-400"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-semibold py-2.5 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-60 transition-colors"
        >
          <UserPlus className="h-4 w-4" />
          {submitting ? "Creating Account..." : "Refer Provider"}
        </button>
      </form>
    </div>
  );
}
