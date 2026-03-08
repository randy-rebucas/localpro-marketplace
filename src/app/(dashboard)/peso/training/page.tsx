"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  GraduationCap, Plus, Trash2, ChevronDown, ChevronUp,
  Search, X, Loader2, Award, ShieldCheck, AlertTriangle, Users,
} from "lucide-react";
import { apiFetch } from "@/lib/fetchClient";

interface Certification {
  _id: string;
  title: string;
  issuer: string;
  issuedAt: string;
  expiresAt?: string;
  verifiedByPeso?: boolean;
}

interface Provider {
  _id: string;
  name: string;
  email: string;
  barangay?: string;
  certifications: Certification[];
}

const ISSUERS = [
  "TESDA",
  "DOLE",
  "PESO Office",
  "LGU Training Center",
  "Technical Vocational School",
  "Other",
];

const EMPTY_FORM = { title: "", issuer: "", issuedAt: "", expiresAt: "" };

const INPUT_CLS =
  "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:ring-1 focus:ring-blue-400 bg-white transition";

function getInitials(name?: string) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function isExpired(expiresAt?: string) {
  return expiresAt ? new Date(expiresAt) < new Date() : false;
}

export default function TrainingPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const [addingFor, setAddingFor] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [removingCert, setRemovingCert] = useState<string | null>(null);

  function load() {
    setLoading(true);
    apiFetch("/api/peso/workforce?limit=100")
      .then(async (r) => {
        if (!r.ok) throw new Error("Failed to load providers");
        return r.json();
      })
      .then((d) => setProviders(d.data ?? []))
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function handleAddCert(providerId: string) {
    if (submitting) return;
    if (!form.title || !form.issuer || !form.issuedAt) {
      toast.error("Title, issuer and issue date are required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiFetch(`/api/peso/providers/${providerId}/certifications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to add certification");
      toast.success("Certification added");
      setForm(EMPTY_FORM);
      setAddingFor(null);
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemoveCert(providerId: string, certId: string) {
    if (!confirm("Remove this certification?")) return;
    setRemovingCert(certId);
    try {
      const res = await apiFetch(`/api/peso/providers/${providerId}/certifications`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ certId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to remove");
      toast.success("Certification removed");
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setRemovingCert(null);
    }
  }

  function cancelForm() {
    setAddingFor(null);
    setForm(EMPTY_FORM);
  }

  const filtered = providers.filter((p) =>
    !search ||
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.barangay ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-blue-600" />
            Training &amp; Certifications
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage TESDA/PESO certifications for registered workers.
          </p>
        </div>
        {!loading && (
          <div className="shrink-0 text-sm text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg font-medium tabular-nums">
            {filtered.length !== providers.length
              ? `${filtered.length} of ${providers.length}`
              : `${providers.length}`}{" "}
            provider{providers.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or barangay…"
          className="w-full pl-9 pr-9 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-400 bg-white"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Provider list */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <ul className="divide-y divide-slate-100">
            {Array.from({ length: 6 }).map((_, i) => (
              <li key={i} className="flex items-center gap-3 px-5 py-3.5 animate-pulse">
                <div className="h-8 w-8 rounded-full bg-slate-200 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 bg-slate-100 rounded w-32" />
                  <div className="h-3 bg-slate-100 rounded w-44" />
                </div>
                <div className="h-5 w-14 bg-slate-100 rounded-full" />
              </li>
            ))}
          </ul>
        ) : filtered.length === 0 ? (
          <div className="py-14 flex flex-col items-center gap-2 text-slate-400">
            <GraduationCap className="h-8 w-8 opacity-30" />
            <p className="text-sm">
              {search ? `No providers matching "${search}".` : "No providers found."}
            </p>
            {search && (
              <button onClick={() => setSearch("")} className="text-xs text-blue-500 hover:underline">
                Clear search
              </button>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {filtered.map((provider) => {
              const certs = provider.certifications ?? [];
              const isOpen = expanded === provider._id;
              return (
                <li key={provider._id}>
                  {/* Provider row */}
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50/80 transition-colors text-left"
                    onClick={() => setExpanded(isOpen ? null : provider._id)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold shrink-0">
                        {getInitials(provider.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{provider.name}</p>
                        <p className="text-xs text-slate-400 truncate">{provider.barangay ?? provider.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0 ml-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${certs.length > 0 ? "text-blue-600 bg-blue-50" : "text-slate-400 bg-slate-100"}`}>
                        {certs.length} cert{certs.length !== 1 ? "s" : ""}
                      </span>
                      {isOpen
                        ? <ChevronUp className="h-4 w-4 text-slate-400" />
                        : <ChevronDown className="h-4 w-4 text-slate-400" />}
                    </div>
                  </button>

                  {/* Certifications panel */}
                  {isOpen && (
                    <div className="px-5 pb-4 pt-3 bg-slate-50 border-t border-slate-100 space-y-3">
                      {certs.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">No certifications recorded yet.</p>
                      ) : (
                        <ul className="space-y-2">
                          {certs.map((cert) => {
                            const expired = isExpired(cert.expiresAt);
                            return (
                              <li key={cert._id} className="flex items-start justify-between gap-2 bg-white rounded-lg border border-slate-200 px-3 py-2.5">
                                <div className="flex items-start gap-2 min-w-0">
                                  <Award className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium text-slate-800 truncate">{cert.title}</p>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                      {cert.issuer} · Issued {fmt(cert.issuedAt)}
                                      {cert.expiresAt && (
                                        <span className={expired ? " · Expired " : " · Expires "}>
                                          <span className={expired ? "text-red-500 font-medium" : ""}>
                                            {fmt(cert.expiresAt)}
                                          </span>
                                        </span>
                                      )}
                                    </p>
                                    {cert.verifiedByPeso && (
                                      <span className="inline-block mt-1 text-[10px] font-semibold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">
                                        PESO Verified
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleRemoveCert(provider._id, cert._id)}
                                  disabled={!!removingCert}
                                  className="text-slate-300 hover:text-red-500 disabled:opacity-40 transition-colors p-1 shrink-0 rounded"
                                  title="Remove certification"
                                >
                                  {removingCert === cert._id
                                    ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                                    : <Trash2 className="h-4 w-4" />}
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      )}

                      {/* Add cert form */}
                      {addingFor === provider._id ? (
                        <div className="bg-white rounded-lg border border-slate-200 p-3 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Add Certification</p>
                            <button onClick={cancelForm} className="text-slate-400 hover:text-slate-600 transition-colors">
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                          <input
                            value={form.title}
                            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                            placeholder="Certificate title *"
                            className={INPUT_CLS}
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <select
                              value={form.issuer}
                              onChange={(e) => setForm((f) => ({ ...f, issuer: e.target.value }))}
                              className={INPUT_CLS}
                            >
                              <option value="">Issuer *</option>
                              {ISSUERS.map((i) => <option key={i} value={i}>{i}</option>)}
                            </select>
                            <div>
                              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Issue Date *</label>
                              <input
                                type="date"
                                value={form.issuedAt}
                                onChange={(e) => setForm((f) => ({ ...f, issuedAt: e.target.value }))}
                                className={`${INPUT_CLS} mt-0.5`}
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Expiry Date (optional)</label>
                            <input
                              type="date"
                              value={form.expiresAt}
                              onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
                              className={`${INPUT_CLS} mt-0.5`}
                            />
                          </div>
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              onClick={() => handleAddCert(provider._id)}
                              disabled={submitting}
                              className="flex items-center gap-1.5 flex-1 justify-center bg-blue-600 text-white text-xs font-semibold py-2 rounded-lg hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 transition-colors"
                            >
                              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                              {submitting ? "Saving…" : "Save Certification"}
                            </button>
                            <button
                              onClick={cancelForm}
                              className="px-3 text-xs text-slate-500 hover:text-slate-700 py-2 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setAddingFor(provider._id)}
                          className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Add Certification
                        </button>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
