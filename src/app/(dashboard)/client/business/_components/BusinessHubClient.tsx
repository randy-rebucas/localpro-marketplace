"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Building2, MapPin, Users, Wallet, PieChart, Plus, Briefcase,
  ChevronRight,
} from "lucide-react";
import { fetchClient } from "@/lib/fetchClient";
import type { IBusinessOrganization } from "@/types";
import { formatCurrency } from "@/lib/utils";

interface OrgApiResponse {
  org: IBusinessOrganization | null;
}

interface JobsByLocationItem {
  locationId: string;
  locationLabel: string;
  totalJobs: number;
  openJobs: number;
  completedJobs: number;
  cancelledJobs: number;
}

export default function BusinessHubClient() {
  const [org, setOrg]             = useState<IBusinessOrganization | null>(null);
  const [loading, setLoading]     = useState(true);
  const [creating, setCreating]   = useState(false);
  const [form, setForm]           = useState({ name: "", type: "company" as "hotel" | "company" | "other" });
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [jobsByLoc, setJobsByLoc] = useState<JobsByLocationItem[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);

  const loadOrg = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchClient<OrgApiResponse>("/api/business/org");
      setOrg(data.org);
      if (data.org) {
        setLoadingJobs(true);
        try {
          const jobsData = await fetchClient<{ rows: JobsByLocationItem[] }>(
            `/api/business/jobs?orgId=${data.org._id}`
          );
          setJobsByLoc(jobsData.rows ?? []);
        } catch { /* ignore */ } finally {
          setLoadingJobs(false);
        }
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadOrg(); }, [loadOrg]);

  async function handleCreate() {
    if (!form.name.trim()) return setError("Organization name is required.");
    setCreating(true);
    setError(null);
    try {
      const data = await fetchClient<{ org: IBusinessOrganization }>("/api/business/org", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setOrg(data.org);
      setShowCreate(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create organization.");
    } finally {
      setCreating(false);
    }
  }

  /* ── Skeleton ── */
  if (loading) {
    return (
      <div className="space-y-5 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="h-14 w-14 bg-slate-200 rounded-full" />
          <div className="space-y-2">
            <div className="h-5 w-48 bg-slate-200 rounded-lg" />
            <div className="h-3 w-24 bg-slate-200 rounded-lg" />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-slate-200 rounded-2xl" />)}
        </div>
        <div className="h-48 bg-slate-200 rounded-2xl" />
      </div>
    );
  }

  /* ── Empty — no org ── */
  if (!org && !showCreate) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-5 text-center">
        <div className="bg-primary/10 ring-4 ring-primary/10 p-5 rounded-2xl">
          <Building2 className="h-10 w-10 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">No Business Profile Yet</h2>
          <p className="text-slate-500 mt-1.5 max-w-sm text-sm leading-relaxed">
            Set up your business organization to manage multiple locations, team members,
            budgets, and provider analytics — all in one place.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="h-4 w-4" /> Create Business Profile
        </button>
      </div>
    );
  }

  /* ── Create form ── */
  if (!org && showCreate) {
    return (
      <div className="max-w-md mx-auto py-16 space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Create Business Profile</h2>
          <p className="text-sm text-slate-400 mt-0.5">Fill in your organization details below.</p>
        </div>
        {error && (
          <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
            {error}
          </p>
        )}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Organization Name *
            </label>
            <input
              className="input w-full"
              placeholder="e.g. Grand Plaza Hotel Group"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Type
            </label>
            <select
              className="input w-full"
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as typeof form.type }))}
            >
              <option value="company">Company</option>
              <option value="hotel">Hotel</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={handleCreate} disabled={creating} className="btn-primary flex-1">
            {creating ? "Creating…" : "Create Organization"}
          </button>
          <button onClick={() => setShowCreate(false)} className="btn-secondary flex-1">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  const totalBudget     = org!.locations.reduce((s, l) => s + l.monthlyBudget, 0);
  const activeLocations = org!.locations.filter((l) => l.isActive).length;

  const cards = [
    {
      label: "Locations",
      value: String(activeLocations),
      sub: "active",
      icon: MapPin,
      href: "/client/business/locations",
      color: "text-blue-600", bg: "bg-blue-50", ring: "ring-blue-100",
    },
    {
      label: "Team Members",
      value: "Manage",
      sub: "role-based access",
      icon: Users,
      href: "/client/business/members",
      color: "text-violet-600", bg: "bg-violet-50", ring: "ring-violet-100",
    },
    {
      label: "Monthly Budget",
      value: formatCurrency(totalBudget),
      sub: "total allocation",
      icon: Wallet,
      href: "/client/business/budget",
      color: "text-emerald-600", bg: "bg-emerald-50", ring: "ring-emerald-100",
    },
    {
      label: "Analytics",
      value: "View",
      sub: "spend & performance",
      icon: PieChart,
      href: "/client/business/analytics",
      color: "text-amber-600", bg: "bg-amber-50", ring: "ring-amber-100",
    },
  ];

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center gap-4">
        {org!.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={org!.logo}
            alt="logo"
            className="h-14 w-14 rounded-full object-cover ring-4 ring-primary/10 flex-shrink-0"
          />
        ) : (
          <div className="h-14 w-14 rounded-full bg-primary/10 ring-4 ring-primary/10 flex items-center justify-center flex-shrink-0">
            <Building2 className="h-7 w-7 text-primary" />
          </div>
        )}
        <div>
          <h1 className="text-xl font-bold text-slate-900">{org!.name}</h1>
          <p className="text-sm text-slate-500 capitalize mt-0.5">{org!.type} account</p>
        </div>
      </div>

      {/* ── KPI quick-nav cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="group bg-white rounded-2xl border border-slate-200 p-4 hover:shadow-md hover:border-slate-300 transition-all space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className={`${c.bg} ring-4 ${c.ring} p-2.5 rounded-xl`}>
                <c.icon className={`h-4 w-4 ${c.color}`} />
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-slate-500 transition-colors" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                {c.label}
              </p>
              <p className="text-lg font-bold text-slate-900 leading-tight mt-0.5">{c.value}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{c.sub}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* ── Locations preview ── */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">Locations</h2>
          <Link
            href="/client/business/locations"
            className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
          >
            Manage <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
        {org!.locations.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-5 py-10 text-center">
            <MapPin className="h-7 w-7 text-slate-300" />
            <p className="text-sm text-slate-400">
              No locations yet.{" "}
              <Link href="/client/business/locations" className="text-primary underline">
                Add your first
              </Link>
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-50">
            {org!.locations.slice(0, 5).map((loc) => (
              <li key={loc._id.toString()} className="flex items-center gap-3 px-5 py-3.5">
                <div className={`p-1.5 rounded-lg flex-shrink-0 ${
                  loc.isActive ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-400"
                }`}>
                  <MapPin className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{loc.label}</p>
                  <p className="text-xs text-slate-400 truncate">{loc.address}</p>
                </div>
                <span className="text-xs font-semibold text-emerald-600 tabular-nums flex-shrink-0">
                  {formatCurrency(loc.monthlyBudget)}<span className="text-slate-400 font-normal">/mo</span>
                </span>
              </li>
            ))}
            {org!.locations.length > 5 && (
              <li className="px-5 py-2.5 text-center">
                <Link href="/client/business/locations" className="text-xs text-primary hover:underline">
                  +{org!.locations.length - 5} more locations
                </Link>
              </li>
            )}
          </ul>
        )}
      </div>

      {/* ── Jobs by Location ── */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-slate-400" />
            <h2 className="font-semibold text-slate-800">Jobs by Location</h2>
          </div>
          <Link
            href="/client/jobs"
            className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
          >
            All Jobs <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
        {loadingJobs ? (
          <div className="p-5 space-y-2 animate-pulse">
            {[...Array(3)].map((_, i) => <div key={i} className="h-10 bg-slate-100 rounded-xl" />)}
          </div>
        ) : jobsByLoc.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-5 py-10 text-center">
            <Briefcase className="h-7 w-7 text-slate-300" />
            <p className="text-sm text-slate-400">No job data yet.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-50">
            {jobsByLoc.map((row) => (
              <li key={row.locationId} className="flex items-center gap-3 px-5 py-3.5">
                <div className="p-1.5 rounded-lg bg-slate-100 text-slate-400 flex-shrink-0">
                  <MapPin className="h-3.5 w-3.5" />
                </div>
                <span className="text-sm font-medium text-slate-800 flex-1 min-w-0 truncate">
                  {row.locationLabel}
                </span>
                <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
                  <span className="text-[11px] font-semibold text-slate-400 tabular-nums">
                    {row.totalJobs} total
                  </span>
                  {row.openJobs > 0 && (
                    <span className="text-[11px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                      {row.openJobs} open
                    </span>
                  )}
                  {row.completedJobs > 0 && (
                    <span className="text-[11px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                      {row.completedJobs} done
                    </span>
                  )}
                  {row.cancelledJobs > 0 && (
                    <span className="text-[11px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                      {row.cancelledJobs} cancelled
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}


interface OrgApiResponse {
  org: IBusinessOrganization | null;
}

interface JobsByLocationItem {
  locationId: string;
  locationLabel: string;
  totalJobs: number;
  openJobs: number;
  completedJobs: number;
  cancelledJobs: number;
}

