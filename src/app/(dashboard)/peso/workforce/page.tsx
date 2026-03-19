"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Search, ShieldCheck, Star, Users, X } from "lucide-react";
import { apiFetch } from "@/lib/fetchClient";

interface WorkerEntry {
  userId: string;
  name: string;
  email: string;
  barangay?: string | null;
  skills: Array<{ skill: string; yearsExperience: number; hourlyRate: string }>;
  certifications: { title: string; issuer: string }[];
  pesoVerificationTags: string[];
  avgRating: number;
  completedJobCount: number;
  isLocalProCertified: boolean;
}

interface Registry {
  data: WorkerEntry[];
  total: number;
  page: number;
  totalPages: number;
}

const TAG_LABELS: Record<string, string> = {
  peso_registered:  "PESO Registered",
  lgu_resident:     "LGU Resident Verified",
  peso_recommended: "PESO Recommended",
};

const INPUT_CLS =
  "text-sm border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 outline-none focus:ring-1 focus:ring-blue-400 placeholder:text-slate-400";

export default function WorkforceRegistryPage() {
  const [registry, setRegistry] = useState<Registry | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ barangay: "", skill: "", verificationTag: "", page: 1 });

  // Debounce text filters so we only fetch after the user stops typing
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedFilters, setDebouncedFilters] = useState(filters);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedFilters(filters), 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [filters]);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (debouncedFilters.barangay) params.set("barangay", debouncedFilters.barangay);
    if (debouncedFilters.skill) params.set("skill", debouncedFilters.skill);
    if (debouncedFilters.verificationTag) params.set("verificationTag", debouncedFilters.verificationTag);
    params.set("page", String(debouncedFilters.page));

    apiFetch(`/api/peso/workforce?${params}`)
      .then((r) => r.json())
      .then(setRegistry)
      .finally(() => setLoading(false));
  }, [debouncedFilters]);

  useEffect(() => { load(); }, [load]);

  const hasActiveFilters = filters.barangay || filters.skill || filters.verificationTag;
  const clearFilters = () => setFilters({ barangay: "", skill: "", verificationTag: "", page: 1 });

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Workforce Registry</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Live digital registry of skilled workers registered on LocalPro.
          </p>
        </div>
        {registry && (
          <div className="flex items-center gap-1.5 bg-slate-100 text-slate-600 text-sm font-medium px-3 py-1.5 rounded-lg shrink-0">
            <Users className="h-4 w-4" />
            {registry.total.toLocaleString()} worker{registry.total !== 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-center gap-3 shadow-sm">
        <div className="flex items-center gap-2 flex-1 min-w-[180px] border border-slate-200 rounded-lg px-3 py-1.5 focus-within:ring-1 focus-within:ring-blue-400">
          <Search className="h-4 w-4 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Filter by skill…"
            value={filters.skill}
            onChange={(e) => setFilters((f) => ({ ...f, skill: e.target.value, page: 1 }))}
            className="text-sm outline-none w-full text-slate-700 placeholder:text-slate-400 bg-transparent"
          />
        </div>
        <input
          type="text"
          placeholder="Barangay…"
          value={filters.barangay}
          onChange={(e) => setFilters((f) => ({ ...f, barangay: e.target.value, page: 1 }))}
          className={`${INPUT_CLS} min-w-[150px]`}
        />
        <select
          value={filters.verificationTag}
          onChange={(e) => setFilters((f) => ({ ...f, verificationTag: e.target.value, page: 1 }))}
          className={INPUT_CLS}
        >
          <option value="">All Verification Tags</option>
          <option value="peso_registered">PESO Registered</option>
          <option value="lgu_resident">LGU Resident Verified</option>
          <option value="peso_recommended">PESO Recommended</option>
        </select>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 transition-colors"
          >
            <X className="h-3.5 w-3.5" /> Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="divide-y divide-slate-100">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="px-4 py-3.5 flex gap-4 animate-pulse">
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-slate-100 rounded w-36" />
                  <div className="h-3 bg-slate-100 rounded w-48" />
                </div>
                <div className="h-3.5 bg-slate-100 rounded w-20 self-center" />
                <div className="h-3.5 bg-slate-100 rounded w-28 self-center" />
              </div>
            ))}
          </div>
        ) : !registry?.data.length ? (
          <div className="py-16 flex flex-col items-center gap-2 text-slate-400">
            <Users className="h-8 w-8 opacity-40" />
            <p className="text-sm">No workers found{hasActiveFilters ? " matching your filters" : ""}.</p>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="text-xs text-blue-500 hover:underline">
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Provider</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Barangay</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Skills</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Verification</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Rating</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Jobs Done</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {registry.data.map((w) => (
                  <tr key={w.userId} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{w.name}</div>
                      <div className="text-xs text-slate-400">{w.email}</div>
                      {w.isLocalProCertified && (
                        <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded mt-1 font-medium">
                          <ShieldCheck className="h-3 w-3" /> Certified
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{w.barangay ?? "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(w.skills ?? []).slice(0, 3).map((s) => (
                          <span key={s.skill} className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full whitespace-nowrap">{s.skill}</span>
                        ))}
                        {(w.skills ?? []).length > 3 && (
                          <span className="text-xs text-slate-400 self-center">+{(w.skills ?? []).length - 3} more</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(w.pesoVerificationTags ?? []).length === 0 ? (
                          <span className="text-slate-400">—</span>
                        ) : (w.pesoVerificationTags ?? []).map((t) => (
                          <span key={t} className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full whitespace-nowrap">
                            {TAG_LABELS[t] ?? t}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {w.avgRating > 0 ? (
                        <span className="flex items-center gap-1 text-amber-500 font-medium">
                          <Star className="h-3.5 w-3.5 fill-amber-400 stroke-amber-400" />
                          {w.avgRating.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {w.completedJobCount > 0 ? w.completedJobCount.toLocaleString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {registry && registry.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            disabled={filters.page <= 1}
            onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
            className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50 transition-colors"
          >
            ← Previous
          </button>
          <span className="px-3 py-1.5 text-sm text-slate-500 tabular-nums">
            Page {registry.page} of {registry.totalPages}
          </span>
          <button
            disabled={filters.page >= registry.totalPages}
            onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
            className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50 transition-colors"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
