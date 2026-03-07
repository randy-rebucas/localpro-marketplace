"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { ShieldCheck, Search, ExternalLink, CheckCircle2, X } from "lucide-react";

type VerificationTag = "peso_registered" | "lgu_resident" | "peso_recommended";

interface Provider {
  _id: string;
  name: string;
  email: string;
  skills: string[];
  barangay?: string;
  rating: number;
  jobsCompleted: number;
  pesoVerificationTags: VerificationTag[];
}

const TAG_META: Record<VerificationTag, { label: string; color: string }> = {
  peso_registered:  { label: "PESO Registered",    color: "bg-blue-100 text-blue-700" },
  lgu_resident:     { label: "LGU Resident",        color: "bg-emerald-100 text-emerald-700" },
  peso_recommended: { label: "PESO Recommended",    color: "bg-violet-100 text-violet-700" },
};

const ALL_TAGS: VerificationTag[] = ["peso_registered", "lgu_resident", "peso_recommended"];

export default function VerificationPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

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

  async function toggleTag(provider: Provider, tag: VerificationTag) {
    const current = provider.pesoVerificationTags ?? [];
    const next = current.includes(tag)
      ? current.filter((t) => t !== tag)
      : [...current, tag];

    setSaving(provider._id + tag);
    try {
      const res = await fetch(`/api/peso/providers/${provider._id}/verify`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to update");

      setProviders((prev) =>
        prev.map((p) =>
          p._id === provider._id ? { ...p, pesoVerificationTags: next } : p
        )
      );
      toast.success("Verification tags updated");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(null);
    }
  }

  const filtered = providers.filter((p) =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.email.toLowerCase().includes(search.toLowerCase()) ||
    (p.barangay ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-blue-600" />
          Provider Verification
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Review and assign verification badges to registered providers.
        </p>
      </div>

      {/* Tag legend */}
      <div className="flex flex-wrap gap-2">
        {ALL_TAGS.map((tag) => (
          <span key={tag} className={`text-xs font-semibold px-2.5 py-1 rounded-full ${TAG_META[tag].color}`}>
            {TAG_META[tag].label}
          </span>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, or barangay…"
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-400 bg-white"
        />
      </div>

      {/* Provider list */}
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
              const tags = provider.pesoVerificationTags ?? [];
              const isExpanded = expanded === provider._id;
              return (
                <li key={provider._id}>
                  <div
                    className="flex items-center justify-between px-5 py-3.5 cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => setExpanded(isExpanded ? null : provider._id)}
                  >
                    {/* Left */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 text-xs font-bold shrink-0">
                        {provider.name?.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{provider.name}</p>
                        <p className="text-xs text-slate-400 truncate">{provider.barangay ? `${provider.barangay} · ` : ""}{provider.email}</p>
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="flex items-center gap-2 flex-wrap justify-end ml-4">
                      {tags.length === 0 ? (
                        <span className="text-xs text-slate-400">No tags</span>
                      ) : (
                        tags.map((tag) => (
                          <span key={tag} className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${TAG_META[tag].color}`}>
                            {TAG_META[tag].label}
                          </span>
                        ))
                      )}
                      <a
                        href={`/providers/${provider._id}`}
                        target="_blank"
                        onClick={(e) => e.stopPropagation()}
                        className="p-1 text-slate-300 hover:text-blue-500 transition-colors"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </div>

                  {/* Expanded tag controls */}
                  {isExpanded && (
                    <div className="px-5 pb-4 pt-1 bg-blue-50 border-t border-blue-100">
                      <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">Toggle Verification Tags</p>
                      <div className="flex flex-wrap gap-2">
                        {ALL_TAGS.map((tag) => {
                          const active = tags.includes(tag);
                          const isLoading = saving === provider._id + tag;
                          return (
                            <button
                              key={tag}
                              onClick={() => toggleTag(provider, tag)}
                              disabled={!!saving}
                              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50 ${
                                active
                                  ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
                                  : "bg-white text-slate-600 border-slate-200 hover:border-blue-400 hover:text-blue-600"
                              }`}
                            >
                              {active ? <CheckCircle2 className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5 opacity-40" />}
                              {isLoading ? "Saving…" : TAG_META[tag].label}
                            </button>
                          );
                        })}
                      </div>
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
