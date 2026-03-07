"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { GraduationCap, Plus, Trash2, ChevronDown, ChevronUp, Search } from "lucide-react";

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

export default function TrainingPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  // Add cert form state per provider
  const [addingFor, setAddingFor] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", issuer: "", issuedAt: "", expiresAt: "" });
  const [submitting, setSubmitting] = useState(false);
  const [removingCert, setRemovingCert] = useState<string | null>(null);

  function load() {
    setLoading(true);
    fetch("/api/peso/workforce?limit=100")
      .then(async (r) => {
        if (!r.ok) throw new Error("Failed to load providers");
        return r.json();
      })
      .then((d) => setProviders(d.providers ?? []))
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
      const res = await fetch(`/api/peso/providers/${providerId}/certifications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to add certification");

      toast.success("Certification added");
      setForm({ title: "", issuer: "", issuedAt: "", expiresAt: "" });
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
      const res = await fetch(`/api/peso/providers/${providerId}/certifications`, {
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

  const filtered = providers.filter((p) =>
    !search ||
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.barangay ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-blue-600" />
          Training &amp; Certifications
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Manage TESDA/PESO certifications for registered workers.
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search provider by name or barangay…"
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-400 bg-white"
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="space-y-px">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 animate-pulse bg-slate-50 border-b border-slate-100 last:border-0" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-10 text-center text-slate-400 text-sm">No providers found.</div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {filtered.map((provider) => {
              const certs = provider.certifications ?? [];
              const isOpen = expanded === provider._id;
              return (
                <li key={provider._id}>
                  {/* Provider row */}
                  <div
                    className="flex items-center justify-between px-5 py-3.5 cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => setExpanded(isOpen ? null : provider._id)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 text-xs font-bold shrink-0">
                        {provider.name?.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">{provider.name}</p>
                        <p className="text-xs text-slate-400">{provider.barangay ?? provider.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                        {certs.length} cert{certs.length !== 1 ? "s" : ""}
                      </span>
                      {isOpen ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                    </div>
                  </div>

                  {/* Certifications panel */}
                  {isOpen && (
                    <div className="px-5 pb-4 pt-2 bg-slate-50 border-t border-slate-100 space-y-3">
                      {/* Cert list */}
                      {certs.length === 0 ? (
                        <p className="text-xs text-slate-400">No certifications recorded.</p>
                      ) : (
                        <ul className="space-y-2">
                          {certs.map((cert) => (
                            <li key={cert._id} className="flex items-start justify-between gap-2 bg-white rounded-lg border border-slate-200 px-3 py-2.5">
                              <div>
                                <p className="text-sm font-medium text-slate-800">{cert.title}</p>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  {cert.issuer} · {new Date(cert.issuedAt).toLocaleDateString()}
                                  {cert.expiresAt && ` – expires ${new Date(cert.expiresAt).toLocaleDateString()}`}
                                </p>
                              </div>
                              <button
                                onClick={() => handleRemoveCert(provider._id, cert._id)}
                                disabled={removingCert === cert._id}
                                className="text-slate-300 hover:text-red-500 disabled:opacity-40 transition-colors p-1"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}

                      {/* Add cert form */}
                      {addingFor === provider._id ? (
                        <div className="bg-blue-50 rounded-lg border border-blue-100 p-3 space-y-2">
                          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Add Certification</p>
                          <input
                            value={form.title}
                            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                            placeholder="Certificate title *"
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-400 bg-white"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <select
                              value={form.issuer}
                              onChange={(e) => setForm((f) => ({ ...f, issuer: e.target.value }))}
                              className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-400 bg-white"
                            >
                              <option value="">Issuer *</option>
                              {ISSUERS.map((i) => <option key={i} value={i}>{i}</option>)}
                            </select>
                            <input
                              type="date"
                              value={form.issuedAt}
                              onChange={(e) => setForm((f) => ({ ...f, issuedAt: e.target.value }))}
                              className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-400 bg-white"
                              placeholder="Issue date *"
                            />
                          </div>
                          <input
                            type="date"
                            value={form.expiresAt}
                            onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-400 bg-white"
                            placeholder="Expiry date (optional)"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleAddCert(provider._id)}
                              disabled={submitting}
                              className="flex-1 bg-blue-600 text-white text-xs font-semibold py-2 rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors"
                            >
                              {submitting ? "Saving…" : "Save Certification"}
                            </button>
                            <button
                              onClick={() => { setAddingFor(null); setForm({ title: "", issuer: "", issuedAt: "", expiresAt: "" }); }}
                              className="px-3 text-xs text-slate-500 hover:text-slate-700"
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
