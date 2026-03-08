"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { UserPlus, CheckCircle2, X, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/fetchClient";

const INPUT_CLS =
  "mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:ring-1 focus:ring-blue-400 transition";

const LABEL_CLS = "text-xs font-semibold text-slate-500 uppercase tracking-wide";

const EMPTY_FORM = {
  name: "",
  email: "",
  phone: "",
  barangay: "",
  skills: "",
  livelihoodProgram: "",
};

export default function ReferralsPage() {
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const set = (field: keyof typeof EMPTY_FORM) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));

  const skillChips = form.skills
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setSuccess(null);

    try {
      const res = await apiFetch("/api/peso/referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone || undefined,
          barangay: form.barangay || undefined,
          skills: skillChips.length ? skillChips : undefined,
          livelihoodProgram: form.livelihoodProgram || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to refer provider");

      toast.success("Provider referred successfully! Activation email sent.");
      setSuccess(form.email);
      setForm(EMPTY_FORM);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-800">Refer a Provider</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Create a LocalPro provider account for a worker you&apos;ve referred.
          They will receive an activation link by email.
        </p>
      </div>

      {/* Success banner */}
      {success && (
        <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl px-4 py-3">
          <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
          <span className="flex-1">
            Account created for <strong>{success}</strong>. An activation email has been sent.
          </span>
          <button onClick={() => setSuccess(null)} className="text-emerald-400 hover:text-emerald-700 transition-colors shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        {/* Row 1: Name + Email */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLS}>
              Full Name <span className="text-red-400 normal-case font-normal">*</span>
            </label>
            <input
              required
              autoComplete="name"
              value={form.name}
              onChange={set("name")}
              placeholder="Juan dela Cruz"
              className={INPUT_CLS}
            />
          </div>
          <div>
            <label className={LABEL_CLS}>
              Email Address <span className="text-red-400 normal-case font-normal">*</span>
            </label>
            <input
              required
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={set("email")}
              placeholder="juan@email.com"
              className={INPUT_CLS}
            />
          </div>
        </div>

        {/* Row 2: Phone + Barangay */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLS}>Phone</label>
            <input
              type="tel"
              autoComplete="tel"
              value={form.phone}
              onChange={set("phone")}
              placeholder="09xx-xxx-xxxx"
              className={INPUT_CLS}
            />
          </div>
          <div>
            <label className={LABEL_CLS}>Barangay</label>
            <input
              value={form.barangay}
              onChange={set("barangay")}
              placeholder="e.g. Brgy. Poblacion"
              className={INPUT_CLS}
            />
          </div>
        </div>

        {/* Skills */}
        <div>
          <label className={LABEL_CLS}>
            Skills{" "}
            <span className="font-normal normal-case text-slate-400">comma-separated</span>
          </label>
          <input
            value={form.skills}
            onChange={set("skills")}
            placeholder="e.g. Electrician, Carpentry, Cleaning"
            className={INPUT_CLS}
          />
          {skillChips.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {skillChips.map((s) => (
                <span key={s} className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full">
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Livelihood Program */}
        <div>
          <label className={LABEL_CLS}>Livelihood Program</label>
          <input
            value={form.livelihoodProgram}
            onChange={set("livelihoodProgram")}
            placeholder="e.g. DOLE Kabuhayan Program"
            className={INPUT_CLS}
          />
        </div>

        <div className="pt-1">
          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-semibold py-2.5 rounded-lg text-sm hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 transition-colors"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="h-4 w-4" />
            )}
            {submitting ? "Creating Account…" : "Refer Provider"}
          </button>
          <p className="text-center text-xs text-slate-400 mt-2">
            Fields marked <span className="text-red-400">*</span> are required.
          </p>
        </div>
      </form>
    </div>
  );
}
