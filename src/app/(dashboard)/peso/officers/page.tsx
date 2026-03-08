"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Users, UserPlus, Trash2, Building2, ShieldCheck, Loader2, X, Mail, MapPin } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { apiFetch } from "@/lib/fetchClient";

interface Officer {
  _id: string;
  name: string;
  email: string;
  avatar?: string | null;
  createdAt?: string;
}

function getInitials(name?: string) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

const INPUT_CLS =
  "mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:ring-1 focus:ring-blue-400 bg-white transition";

interface Office {
  _id: string;
  officeName: string;
  municipality: string;
  region: string;
  contactEmail: string;
  headOfficerId: Officer;
  officerIds: Officer[];
  isActive: boolean;
}

export default function OfficersPage() {
  const { user } = useAuthStore();
  const [office, setOffice] = useState<Office | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add officer form
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [submitting, setSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  function load() {
    setLoading(true);
    apiFetch("/api/peso/officers")
      .then(async (r) => {
        if (!r.ok) {
          const d = await r.json();
          throw new Error(d.error ?? "Failed to load office");
        }
        return r.json();
      })
      .then(setOffice)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  const isHead = office && user && String(office.headOfficerId._id ?? office.headOfficerId) === String(user._id);

  async function handleAddOfficer(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await apiFetch("/api/peso/officers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to add officer");
      toast.success("Officer added — activation email sent");
      setForm({ name: "", email: "", phone: "" });
      setShowForm(false);
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove(officerUserId: string, officerName: string) {
    if (!confirm(`Remove ${officerName} from your PESO office?`)) return;
    setRemovingId(officerUserId);
    try {
      const res = await apiFetch(`/api/peso/officers/${officerUserId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to remove officer");
      toast.success(`${officerName} removed from office`);
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setRemovingId(null);
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="h-7 w-48 bg-slate-200 rounded animate-pulse" />
        <div className="h-28 bg-blue-100 rounded-xl animate-pulse" />
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-pulse">
          <div className="h-14 border-b border-slate-100 bg-slate-50" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-50 last:border-0">
              <div className="h-8 w-8 rounded-full bg-slate-200 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 bg-slate-100 rounded w-32" />
                <div className="h-3 bg-slate-100 rounded w-44" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-6 text-center space-y-2">
        <p className="font-semibold">Failed to load office</p>
        <p className="text-red-500">{error}</p>
        <button onClick={load} className="text-xs text-red-600 underline hover:text-red-800">
          Try again
        </button>
      </div>
    );
  }

  if (!office) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-800">My PESO Office</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {isHead ? "As head officer, you can add or remove staff officers." : "View your office and fellow officers."}
        </p>
      </div>

      {/* Office info card */}
      <div className="bg-blue-700 rounded-xl px-6 py-5 text-white">
        <div className="flex items-start gap-3">
          <Building2 className="h-6 w-6 opacity-80 mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest opacity-60">PESO Office</p>
            <p className="text-lg font-bold mt-0.5 truncate">{office.officeName}</p>
            <p className="flex items-center gap-1 text-sm opacity-80 mt-1">
              <MapPin className="h-3.5 w-3.5 opacity-70 shrink-0" />
              {office.municipality}, {office.region}
            </p>
            <p className="flex items-center gap-1 text-xs opacity-60 mt-0.5">
              <Mail className="h-3 w-3 opacity-70 shrink-0" />
              {office.contactEmail}
            </p>
          </div>
        </div>
      </div>

      {/* Officers list */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-700 flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-500" />
            Officers ({(office.officerIds?.length ?? 0) + 1})
          </h2>
          {isHead && !showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Add Officer
            </button>
          )}
        </div>

        {/* Add officer form */}
        {showForm && isHead && (
          <form onSubmit={handleAddOfficer} className="px-5 py-4 border-b border-slate-100 bg-slate-50 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Add New Officer</p>
              <button
                type="button"
                onClick={() => { setShowForm(false); setForm({ name: "", email: "", phone: "" }); }}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Full Name <span className="text-red-400 normal-case font-normal">*</span>
                </label>
                <input
                  required
                  autoComplete="name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Juan dela Cruz"
                  className={INPUT_CLS}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Email <span className="text-red-400 normal-case font-normal">*</span>
                </label>
                <input
                  required
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="juan@peso.gov.ph"
                  className={INPUT_CLS}
                />
              </div>
            </div>
            <div className="sm:w-1/2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Phone</label>
              <input
                type="tel"
                autoComplete="tel"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="09xx-xxx-xxxx"
                className={INPUT_CLS}
              />
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-1.5 bg-blue-600 text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 transition-colors"
              >
                {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
                {submitting ? "Adding…" : "Add Officer"}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setForm({ name: "", email: "", phone: "" }); }}
                className="text-xs text-slate-500 hover:text-slate-700 px-3 py-2 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Head officer row */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-8 w-8 rounded-full bg-blue-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {getInitials(office.headOfficerId.name)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">{office.headOfficerId.name}</p>
              <p className="text-xs text-slate-400 truncate">{office.headOfficerId.email}</p>
            </div>
          </div>
          <span className="flex items-center gap-1 text-xs font-semibold bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full shrink-0 ml-3">
            <ShieldCheck className="h-3.5 w-3.5" /> Head Officer
          </span>
        </div>

        {/* Staff officers */}
        {office.officerIds?.length === 0 ? (
          <div className="px-5 py-8 text-center space-y-1">
            <Users className="h-7 w-7 text-slate-200 mx-auto" />
            <p className="text-sm text-slate-400">
              No staff officers yet.
              {isHead && (
                <button
                  onClick={() => setShowForm(true)}
                  className="ml-1 text-blue-500 hover:underline"
                >
                  Add one.
                </button>
              )}
            </p>
          </div>
        ) : (
          office.officerIds?.map((officer) => (
            <div
              key={officer._id}
              className="flex items-center justify-between px-5 py-3.5 border-b border-slate-50 last:border-0 hover:bg-slate-50/70 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 text-xs font-bold shrink-0">
                  {getInitials(officer.name)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{officer.name}</p>
                  <p className="text-xs text-slate-400 truncate">{officer.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-3 shrink-0">
                <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Officer</span>
                {isHead && (
                  <button
                    onClick={() => handleRemove(officer._id, officer.name)}
                    disabled={!!removingId}
                    className="text-slate-300 hover:text-red-500 disabled:opacity-40 transition-colors p-1 rounded"
                    title={`Remove ${officer.name}`}
                  >
                    {removingId === officer._id
                      ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                      : <Trash2 className="h-4 w-4" />}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
