"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import { ShieldCheck, Search, ExternalLink, CheckCircle2, X, Star, Briefcase, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/fetchClient";

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

const TAG_META: Record<VerificationTag, { label: string; color: string; activeClass: string }> = {
  peso_registered:  { label: "PESO Registered",  color: "bg-blue-100 text-blue-700",     activeClass: "bg-blue-600 text-white border-blue-600 hover:bg-blue-700" },
  lgu_resident:     { label: "LGU Resident",      color: "bg-emerald-100 text-emerald-700", activeClass: "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700" },
  peso_recommended: { label: "PESO Recommended",  color: "bg-violet-100 text-violet-700", activeClass: "bg-violet-600 text-white border-violet-600 hover:bg-violet-700" },
};

const ALL_TAGS: VerificationTag[] = ["peso_registered", "lgu_resident", "peso_recommended"];

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export default function VerificationPage() {
  const t = useTranslations("pesoPages");
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

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

  async function toggleTag(provider: Provider, tag: VerificationTag) {
    const current = provider.pesoVerificationTags ?? [];
    const next = current.includes(tag)
      ? current.filter((t) => t !== tag)
      : [...current, tag];

    setSaving(provider._id + tag);
    try {
      const res = await apiFetch(`/api/peso/providers/${provider._id}/verify`, {
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
    !search ||
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.email.toLowerCase().includes(search.toLowerCase()) ||
    (p.barangay ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-blue-600" />
            {t("verifyTitle")}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {t("verifySub")}
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
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, or barangay…"
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
                  <div className="h-3.5 bg-slate-100 rounded w-36" />
                  <div className="h-3 bg-slate-100 rounded w-52" />
                </div>
                <div className="flex gap-1.5">
                  <div className="h-5 w-20 bg-slate-100 rounded-full" />
                  <div className="h-5 w-24 bg-slate-100 rounded-full" />
                </div>
              </li>
            ))}
          </ul>
        ) : filtered.length === 0 ? (
          <div className="py-14 flex flex-col items-center gap-2 text-slate-400">
            <ShieldCheck className="h-8 w-8 opacity-30" />
            <p className="text-sm">
              {search ? t("noProvidersMatchingSearch", { search }) : t("noProvidersFound")}
            </p>
            {search && (
              <button onClick={() => setSearch("")} className="text-xs text-blue-500 hover:underline">
                {t("clearSearch")}
              </button>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {filtered.map((provider) => {
              const tags = provider.pesoVerificationTags ?? [];
              const isExpanded = expanded === provider._id;
              return (
                <li key={provider._id}>
                  <button
                    type="button"
                    aria-expanded={isExpanded}
                    className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50/80 transition-colors text-left"
                    onClick={() => setExpanded(isExpanded ? null : provider._id)}
                  >
                    {/* Left: avatar + info */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold shrink-0">
                        {getInitials(provider.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{provider.name}</p>
                        <p className="text-xs text-slate-400 truncate">
                          {provider.barangay ? `${provider.barangay} · ` : ""}
                          {provider.email}
                        </p>
                      </div>
                    </div>

                    {/* Right: stats + tags + link */}
                    <div className="flex items-center gap-3 ml-4 shrink-0">
                      {/* Stats */}
                      <div className="hidden sm:flex items-center gap-2.5 text-xs text-slate-400">
                        {(provider.rating ?? 0) > 0 && (
                          <span className="flex items-center gap-0.5 text-amber-500 font-medium">
                            <Star className="h-3 w-3 fill-amber-400 stroke-amber-400" />
                            {provider.rating.toFixed(1)}
                          </span>
                        )}
                        {(provider.jobsCompleted ?? 0) > 0 && (
                          <span className="flex items-center gap-0.5">
                            <Briefcase className="h-3 w-3" />
                            {provider.jobsCompleted}
                          </span>
                        )}
                      </div>

                      {/* Tags */}
                      <div className="flex items-center gap-1.5 flex-wrap justify-end">
                        {tags.length === 0 ? (
                        <span className="text-xs text-slate-300 italic">{t("noTagsLabel")}</span>
                        ) : (
                          tags.map((tag) => (
                            <span key={tag} className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${TAG_META[tag].color}`}>
                              {TAG_META[tag].label}
                            </span>
                          ))
                        )}
                      </div>

                      <a
                        href={`/providers/${provider._id}`}
                        target="_blank"
                        onClick={(e) => e.stopPropagation()}
                        title="View profile"
                        className="p-1 text-slate-300 hover:text-blue-500 transition-colors"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </button>

                  {/* Expanded tag controls */}
                  {isExpanded && (
                    <div className="px-5 pb-4 pt-3 bg-slate-50 border-t border-slate-100">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2.5">
                        {t("verificationTagsSection")}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {ALL_TAGS.map((tag) => {
                          const active = tags.includes(tag);
                          const isLoading = saving === provider._id + tag;
                          return (
                            <button
                              key={tag}
                              onClick={() => toggleTag(provider, tag)}
                              disabled={!!saving}
                              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-60 ${
                                active
                                  ? TAG_META[tag].activeClass
                                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-400 hover:text-slate-800"
                              }`}
                            >
                              {isLoading ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : active ? (
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              ) : (
                                <X className="h-3.5 w-3.5 opacity-30" />
                              )}
                              {TAG_META[tag].label}
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
