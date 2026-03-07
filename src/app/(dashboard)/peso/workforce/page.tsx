"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, ShieldCheck, Star } from "lucide-react";

interface WorkerEntry {
  userId: string;
  name: string;
  email: string;
  barangay?: string | null;
  skills: string[];
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
  peso_registered: "PESO Registered",
  lgu_resident:    "LGU Resident Verified",
  peso_recommended: "PESO Recommended",
};

export default function WorkforceRegistryPage() {
  const [registry, setRegistry] = useState<Registry | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ barangay: "", skill: "", verificationTag: "", page: 1 });

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.barangay) params.set("barangay", filters.barangay);
    if (filters.skill) params.set("skill", filters.skill);
    if (filters.verificationTag) params.set("verificationTag", filters.verificationTag);
    params.set("page", String(filters.page));

    fetch(`/api/peso/workforce?${params}`)
      .then((r) => r.json())
      .then(setRegistry)
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Workforce Registry</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Live digital registry of skilled workers registered on LocalPro.
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap gap-3 shadow-sm">
        <div className="flex items-center gap-2 flex-1 min-w-[160px]">
          <Search className="h-4 w-4 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Filter by skill..."
            value={filters.skill}
            onChange={(e) => setFilters((f) => ({ ...f, skill: e.target.value, page: 1 }))}
            className="text-sm outline-none w-full text-slate-700 placeholder:text-slate-400"
          />
        </div>
        <input
          type="text"
          placeholder="Barangay..."
          value={filters.barangay}
          onChange={(e) => setFilters((f) => ({ ...f, barangay: e.target.value, page: 1 }))}
          className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 outline-none focus:ring-1 focus:ring-blue-400 min-w-[140px]"
        />
        <select
          value={filters.verificationTag}
          onChange={(e) => setFilters((f) => ({ ...f, verificationTag: e.target.value, page: 1 }))}
          className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 outline-none focus:ring-1 focus:ring-blue-400"
        >
          <option value="">All Verification Tags</option>
          <option value="peso_registered">PESO Registered</option>
          <option value="lgu_resident">LGU Resident Verified</option>
          <option value="peso_recommended">PESO Recommended</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading...</div>
        ) : !registry?.data.length ? (
          <div className="p-8 text-center text-slate-400 text-sm">No providers found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Provider</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Barangay</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Skills</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Verification</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Rating</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Jobs Done</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {registry.data.map((w) => (
                <tr key={w.userId} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">{w.name}</div>
                    <div className="text-xs text-slate-400">{w.email}</div>
                    {w.isLocalProCertified && (
                      <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded mt-1">
                        <ShieldCheck className="h-3 w-3" /> Certified
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{w.barangay ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(w.skills ?? []).slice(0, 3).map((s) => (
                        <span key={s} className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full">{s}</span>
                      ))}
                      {(w.skills ?? []).length > 3 && (
                        <span className="text-xs text-slate-400">+{(w.skills ?? []).length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(w.pesoVerificationTags ?? []).map((t) => (
                        <span key={t} className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                          {TAG_LABELS[t] ?? t}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1 text-amber-500">
                      <Star className="h-3.5 w-3.5" />
                      {(w.avgRating ?? 0).toFixed(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{w.completedJobCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {registry && registry.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            disabled={filters.page <= 1}
            onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
            className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50"
          >
            Previous
          </button>
          <span className="px-3 py-1.5 text-sm text-slate-500">
            {registry.page} / {registry.totalPages}
          </span>
          <button
            disabled={filters.page >= registry.totalPages}
            onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
            className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
