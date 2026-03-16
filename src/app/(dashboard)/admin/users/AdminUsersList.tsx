"use client";

import { useMemo, useState, useRef, useCallback, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import toast from "react-hot-toast";
import { apiFetch } from "@/lib/fetchClient";
import { formatDate } from "@/lib/utils";
import UserActions from "./UserActions";
import CreateUserModal from "./CreateUserModal";
import ImportUsersModal from "./ImportUsersModal";
import BulkMessageModal from "./BulkMessageModal";
import type { IUser } from "@/types";
import type { UserSortOption } from "@/repositories/user.repository";
import {
  CheckCircle2, XCircle, Clock, UserPlus, Upload, Download, Search, X,
  ShieldCheck, Ban, Trash2, CheckCheck, MessageSquare, ArrowUpDown,
  AlertTriangle, ShieldAlert, Users, UserX,
  SlidersHorizontal, Star, Briefcase, BadgeCheck, Phone, MapPin,
} from "lucide-react";

type FilterRole = "all" | "client" | "provider" | "admin";
type KycFilter  = "all" | "none" | "pending" | "approved" | "rejected";

interface ProviderFilters {
  skill:        string;
  minRating:    number;
  minJobs:      number;
  availability: string;
  certified:    boolean;
}

interface UserStats {
  suspended: number;
  pendingProviders: number;
  pendingKyc: number;
}

interface Props {
  users: IUser[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
  sort: UserSortOption;
  /** Active role filter, derived from the URL by the server component. */
  roleFilter: FilterRole;
  kycFilter: KycFilter;
  /** Active keyword search, derived from the URL by the server component. */
  searchQuery: string;
  /** Active approval status filter (empty string = no filter). */
  approvalFilter: string;
  /** When true, only suspended users are shown. */
  showSuspended: boolean;
  userStats: UserStats;
  /** Role of the currently logged-in admin/staff user. */
  currentUserRole: string;
  /** Active provider-specific filters. */
  providerFilters: ProviderFilters;
  /** Distinct skill values for the skill dropdown (populated only on Providers tab). */
  skillOptions: string[];
  /** Provider profile data (skills, workExperiences, yearsExperience) keyed by userId string. */
  providerProfiles: Record<string, { skills: string[]; workExperiences: string[]; yearsExperience: number }>;
}

// ─── Completeness helpers ─────────────────────────────────────────────────────

interface CompletenessItem { label: string; done: boolean }

function getCompleteness(u: IUser): { items: CompletenessItem[]; pct: number } {
  const items: CompletenessItem[] = [
    { label: "Email verified", done: u.isVerified },
    { label: "Profile photo",  done: !!u.avatar },
    { label: "KYC submitted",  done: !!u.kycStatus && u.kycStatus !== "none" },
    { label: "KYC approved",   done: u.kycStatus === "approved" },
    { label: "Phone number",   done: !!u.phone },
    { label: "Address saved",  done: (u.addresses?.length ?? 0) > 0 },
  ];
  return { items, pct: Math.round((items.filter((i) => i.done).length / items.length) * 100) };
}

function completenessColor(pct: number) {
  if (pct === 100) return { bar: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50" };
  if (pct >= 60)   return { bar: "bg-violet-500",  text: "text-violet-700",  bg: "bg-violet-50"  };
  if (pct >= 40)   return { bar: "bg-amber-400",   text: "text-amber-700",   bg: "bg-amber-50"   };
  return               { bar: "bg-red-400",     text: "text-red-700",     bg: "bg-red-50"     };
}

function CompletenessCell({ u }: { u: IUser }) {
  const { items, pct } = getCompleteness(u);
  const c = completenessColor(pct);
  return (
    <div className="group relative">
      <div className="flex items-center gap-2">
        <div className="h-1.5 w-24 rounded-full bg-slate-100 overflow-hidden">
          <div className={`h-full rounded-full transition-all ${c.bar}`} style={{ width: `${pct}%` }} />
        </div>
        <span className={`text-xs font-semibold tabular-nums ${c.text}`}>{pct}%</span>
      </div>
      <div className={`pointer-events-none absolute left-0 top-6 z-20 hidden group-hover:flex flex-col gap-1 min-w-[180px] rounded-xl border border-slate-200 ${c.bg} px-3 py-2.5 shadow-lg`}>
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-1.5 text-xs">
            {item.done
              ? <CheckCircle2 size={12} className="text-emerald-600 flex-shrink-0" />
              : <XCircle      size={12} className="text-slate-300    flex-shrink-0" />}
            <span className={item.done ? "text-slate-700" : "text-slate-400"}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const ROLE_COLOR: Record<string, string> = {
  admin:    "bg-purple-100 text-purple-700",
  provider: "bg-blue-100 text-blue-700",
  client:   "bg-slate-100 text-slate-700",
};

const APPROVAL_COLOR: Record<string, string> = {
  pending_approval: "bg-amber-100 text-amber-700",
  approved:         "bg-green-100 text-green-700",
  rejected:         "bg-red-100 text-red-700",
};

const SORT_LABELS: Record<UserSortOption, string> = {
  newest:    "Newest first",
  oldest:    "Oldest first",
  name_asc:  "Name A → Z",
  name_desc: "Name Z → A",
};

/** Very lenient phone validation — at least 7 digits present. */
function isValidPhone(phone: string | null | undefined): boolean {
  if (!phone) return false;
  return (phone.replace(/\D/g, "").length >= 7);
}

function PhoneCell({ phone }: { phone: string | null | undefined }) {
  if (!phone) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-slate-300 dark:text-slate-600 italic">
        <Phone size={10} />No phone
      </span>
    );
  }
  const valid = isValidPhone(phone);
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${
      valid
        ? "text-emerald-600 dark:text-emerald-400"
        : "text-amber-600 dark:text-amber-400"
    }`}>
      <Phone size={10} className="flex-shrink-0" />
      {phone}
      {!valid && <span className="text-[10px] opacity-70">(unverified)</span>}
    </span>
  );
}

// ─── Numbered pagination helper ───────────────────────────────────────────────

function pageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "...")[] = [1];
  if (current > 3) pages.push("...");
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) pages.push(p);
  if (current < total - 2) pages.push("...");
  pages.push(total);
  return pages;
}

export default function AdminUsersList({
  users, total, page, totalPages, limit, sort,
  roleFilter, kycFilter, searchQuery, approvalFilter, showSuspended, userStats, currentUserRole,
  providerFilters, skillOptions, providerProfiles,
}: Props) {
  const isAdmin = currentUserRole === "admin";
  const router   = useRouter();
  const pathname = usePathname();

  const [showCreate,      setShowCreate]      = useState(false);
  const [showImport,      setShowImport]      = useState(false);
  const [showBulkMessage, setShowBulkMessage] = useState(false);

  // ── Search ─────────────────────────────────────────────────────────────
  const [searchDraft, setSearchDraft] = useState(searchQuery);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep searchDraft in sync when the server updates searchQuery
  // (e.g. after navigating to a new page or changing a filter)
  useEffect(() => {
    setSearchDraft(searchQuery);
  }, [searchQuery]);

  /** Build a URL preserving all active filters, overriding any supplied overrides. */
  const buildUrl = useCallback(
    (overrides: Record<string, string | number | null>) => {
      const p = new URLSearchParams();
      const get = (key: string, fallback: string) =>
        key in overrides ? String(overrides[key] ?? "") : fallback;

      const r    = get("role",      roleFilter  !== "all" ? roleFilter  : "");
      const kyc  = get("kyc",       kycFilter   !== "all" ? kycFilter   : "");
      const s    = get("search",    searchDraft.trim());
      const srt  = get("sort",      sort        !== "newest" ? sort     : "");
      const lim  = get("limit",     limit       !== 50   ? String(limit) : "");
      const pg   = get("page",      "1");
      const appr = get("approval",  approvalFilter ?? "");
      const susp = get("suspended", showSuspended ? "true" : "");

      // Provider filters — only kept when the resolved role tab is "provider"
      const nextRole = r;
      const keepProviderFilters = nextRole === "provider";
      const skill  = keepProviderFilters ? get("skill",        providerFilters.skill)        : "";
      const minRat = keepProviderFilters ? get("minRating",    providerFilters.minRating > 0 ? String(providerFilters.minRating) : "")  : "";
      const minJob = keepProviderFilters ? get("minJobs",      providerFilters.minJobs   > 0 ? String(providerFilters.minJobs)   : "")  : "";
      const avail  = keepProviderFilters ? get("availability", providerFilters.availability) : "";
      const cert   = keepProviderFilters ? get("certified",    providerFilters.certified ? "true" : "") : "";

      if (r)      p.set("role",      r);
      if (kyc)    p.set("kyc",       kyc);
      if (s)      p.set("search",    s);
      if (srt)    p.set("sort",      srt);
      if (lim)    p.set("limit",     lim);
      if (pg !== "1") p.set("page", pg);
      if (appr)   p.set("approval",  appr);
      if (susp)   p.set("suspended", susp);
      if (skill)  p.set("skill",       skill);
      if (minRat) p.set("minRating",   minRat);
      if (minJob) p.set("minJobs",     minJob);
      if (avail)  p.set("availability", avail);
      if (cert)   p.set("certified",   cert);
      return `${pathname}?${p.toString()}`;
    },
    [pathname, roleFilter, kycFilter, sort, limit, searchDraft, approvalFilter, showSuspended, providerFilters]
  );

  const pushSearch = useCallback((val: string) => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      router.push(buildUrl({ search: val.trim() || null, page: "1" }));
    }, 350);
  }, [buildUrl, router]);

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearchDraft(e.target.value);
    pushSearch(e.target.value);
  }
  function clearSearch() { setSearchDraft(""); pushSearch(""); }

  // ── Bulk selection ─────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState<"verify" | "suspend" | "delete" | "approve" | null>(null);

  const allSelected  = users.length > 0 && selectedIds.size === users.length;
  const someSelected = selectedIds.size > 0;

  function toggleAll() {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(users.map((u) => u._id.toString())));
  }
  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function bulkAction(action: "verify" | "suspend" | "delete" | "approve") {
    if (selectedIds.size === 0) return;
    if (action === "delete" && !confirm(`Soft-delete ${selectedIds.size} user(s)? They will be deactivated.`)) return;
    setBulkLoading(action);
    try {
      const res = await apiFetch("/api/admin/users/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...selectedIds], action }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Bulk action failed"); return; }
      toast.success(`${data.affected} user(s) updated.`);
      setSelectedIds(new Set());
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setBulkLoading(null);
    }
  }

  const pendingCount = useMemo(
    () => users.filter((u) => u.role === "provider" && u.approvalStatus === "pending_approval").length,
    [users]
  );

  const providerFilterCount = useMemo(() => [
    providerFilters.skill !== "",
    providerFilters.minRating > 0,
    providerFilters.minJobs > 0,
    providerFilters.availability !== "",
    providerFilters.certified,
  ].filter(Boolean).length, [providerFilters]);

  const ROLE_TABS: { label: string; value: FilterRole }[] = [
    { label: "All",       value: "all"      },
    { label: "Clients",   value: "client"   },
    { label: "Providers", value: "provider" },
    { label: "Admins",    value: "admin"    },
  ];

  const KYC_TABS: { label: string; value: KycFilter }[] = [
    { label: "All KYC",  value: "all"      },
    { label: "Pending",  value: "pending"  },
    { label: "Approved", value: "approved" },
    { label: "Rejected", value: "rejected" },
    { label: "None",     value: "none"     },
  ];

  const pagination = pageNumbers(page, totalPages);

  return (
    <div className="space-y-4">

      {/* ── Stat pills ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <button
          onClick={() => router.push(buildUrl({ role: null, kyc: null, search: null, page: "1" }))}
          className="flex items-center gap-2.5 px-3 py-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:border-primary/20 transition-colors text-left"
        >
          <Users className="h-4 w-4 text-slate-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-white">{total.toLocaleString()}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">In filter</p>
          </div>
        </button>
        <button
          onClick={() => router.push(buildUrl({ role: "provider", approval: "pending_approval", kyc: null, search: null, suspended: null, page: "1" }))}
          className={`flex items-center gap-2.5 px-3 py-2 rounded-2xl border shadow-sm hover:border-amber-200 transition-colors text-left ${
            userStats.pendingProviders > 0 ? "border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800" : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
          }`}
        >
          <AlertTriangle className={`h-4 w-4 flex-shrink-0 ${userStats.pendingProviders > 0 ? "text-amber-500" : "text-slate-300"}`} />
          <div>
            <p className={`text-sm font-bold ${userStats.pendingProviders > 0 ? "text-amber-700 dark:text-amber-400" : "text-slate-900 dark:text-white"}`}>
              {userStats.pendingProviders}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Pending approval</p>
          </div>
        </button>
        <button
          onClick={() => router.push(buildUrl({ kyc: "pending", page: "1" }))}
          className={`flex items-center gap-2.5 px-3 py-2 rounded-2xl border shadow-sm hover:border-indigo-200 transition-colors text-left ${
            userStats.pendingKyc > 0 ? "border-indigo-200 bg-indigo-50 dark:bg-indigo-900/20 dark:border-indigo-800" : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
          }`}
        >
          <ShieldCheck className={`h-4 w-4 flex-shrink-0 ${userStats.pendingKyc > 0 ? "text-indigo-500" : "text-slate-300"}`} />
          <div>
            <p className={`text-sm font-bold ${userStats.pendingKyc > 0 ? "text-indigo-700 dark:text-indigo-400" : "text-slate-900 dark:text-white"}`}>
              {userStats.pendingKyc}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">KYC pending</p>
          </div>
        </button>
        <button
          onClick={() => router.push(buildUrl({ suspended: showSuspended ? null : "true", role: null, kyc: null, search: null, approval: null, page: "1" }))}
          className={`flex items-center gap-2.5 px-3 py-2 rounded-2xl border shadow-sm hover:border-red-200 transition-colors text-left ${
            showSuspended || userStats.suspended > 0 ? "border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800" : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
          }`}
        >
          <UserX className={`h-4 w-4 flex-shrink-0 ${userStats.suspended > 0 ? "text-red-500" : "text-slate-300"}`} />
          <div>
            <p className={`text-sm font-bold ${userStats.suspended > 0 ? "text-red-700 dark:text-red-400" : "text-slate-900 dark:text-white"}`}>
              {userStats.suspended}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Suspended</p>
          </div>
        </button>
      </div>

      {/* ── Toolbar ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Role filter tabs */}
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-700 p-1 rounded-xl w-fit">
          {ROLE_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => router.push(buildUrl({ role: tab.value !== "all" ? tab.value : null, page: "1" }))}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                roleFilter === tab.value
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
            >
              {tab.label}
              {roleFilter === tab.value && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary">
                  {total}
                </span>
              )}
              {tab.value === "provider" && providerFilterCount > 0 && roleFilter !== "provider" && (
                <span className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-indigo-500 text-white text-[9px] font-bold">
                  {providerFilterCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search + sort + action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchDraft}
              onChange={handleSearchChange}
              placeholder="Search name, email, phone…"
              className="pl-7 pr-7 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-xs placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/30 w-52 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            />
            {searchDraft && (
              <button onClick={clearSearch} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X size={12} />
              </button>
            )}
          </div>

          {/* Sort */}
          <div className="relative">
            <ArrowUpDown size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <select
              value={sort}
              onChange={(e) => router.push(buildUrl({ sort: e.target.value, page: "1" }))}
              className="pl-7 pr-6 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-xs bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {(Object.keys(SORT_LABELS) as UserSortOption[]).map((k) => (
                <option key={k} value={k}>{SORT_LABELS[k]}</option>
              ))}
            </select>
          </div>

          <a
            href={`/api/admin/users/export?${new URLSearchParams([
              ...(roleFilter   !== "all" ? [["role",     roleFilter]]          : []),
              ...(kycFilter    !== "all" ? [["kyc",      kycFilter]]           : []),
              ...(approvalFilter        ? [["approval", approvalFilter]]       : []),
              ...(showSuspended         ? [["suspended", "true"]]              : []),
              ...(searchDraft.trim()    ? [["search",   searchDraft.trim()]]   : []),
              ...(providerFilters.skill              ? [["skill",        providerFilters.skill]]                     : []),
              ...(providerFilters.minRating > 0      ? [["minRating",    String(providerFilters.minRating)]]         : []),
              ...(providerFilters.minJobs   > 0      ? [["minJobs",      String(providerFilters.minJobs)]]           : []),
              ...(providerFilters.availability       ? [["availability", providerFilters.availability]]              : []),
              ...(providerFilters.certified          ? [["certified",    "true"]]                                    : []),
            ]).toString()}`}
            download
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 transition-colors"
            title={`Export ${roleFilter === "all" ? "all" : roleFilter} users as CSV`}
          >
            <Download className="h-3.5 w-3.5" />Export CSV
          </a>
          <button type="button" onClick={() => setShowImport(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 transition-colors">
            <Upload className="h-3.5 w-3.5" />Import CSV
          </button>
          <button type="button" onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary/90 transition-colors">
            <UserPlus className="h-3.5 w-3.5" />Create user
          </button>
        </div>
      </div>

      {/* ── KYC filter tabs ───────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <ShieldAlert className="h-3.5 w-3.5 text-slate-400" />
        {KYC_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => router.push(buildUrl({ kyc: tab.value !== "all" ? tab.value : null, page: "1" }))}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
              kycFilter === tab.value
                ? "bg-primary text-white border-primary"
                : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
            }`}
          >
            {tab.label}
            {tab.value === "pending" && userStats.pendingKyc > 0 && (
              <span className="ml-1 text-[10px] font-bold">
                ({userStats.pendingKyc})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Provider filters panel ───────────────────────────────────── */}
      {roleFilter === "provider" && (
        <div className="flex items-center gap-2 flex-wrap rounded-xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/50 dark:bg-indigo-950/20 px-4 py-3">
          <SlidersHorizontal className="h-3.5 w-3.5 text-indigo-400 flex-shrink-0" />
          <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 mr-1">Provider filters</span>

          {/* Skill */}
          <select
            value={providerFilters.skill}
            onChange={(e) => router.push(buildUrl({ skill: e.target.value || null, page: "1" }))}
            className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-600 text-xs bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            <option value="">All skills</option>
            {skillOptions.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {/* Min rating */}
          <div className="flex items-center gap-1">
            <Star className="h-3 w-3 text-amber-400" />
            <select
              value={providerFilters.minRating > 0 ? String(providerFilters.minRating) : ""}
              onChange={(e) => router.push(buildUrl({ minRating: e.target.value || null, page: "1" }))}
              className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-600 text-xs bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              <option value="">Any rating</option>
              {["1", "2", "3", "4", "4.5"].map((v) => (
                <option key={v} value={v}>≥ {v} ★</option>
              ))}
            </select>
          </div>

          {/* Min completed jobs */}
          <div className="flex items-center gap-1">
            <Briefcase className="h-3 w-3 text-slate-400" />
            <select
              value={providerFilters.minJobs > 0 ? String(providerFilters.minJobs) : ""}
              onChange={(e) => router.push(buildUrl({ minJobs: e.target.value || null, page: "1" }))}
              className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-600 text-xs bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              <option value="">Any jobs</option>
              {["1", "5", "10", "25", "50", "100"].map((v) => (
                <option key={v} value={v}>≥ {v} jobs</option>
              ))}
            </select>
          </div>

          {/* Availability pills */}
          {(["available", "busy", "unavailable"] as const).map((av) => (
            <button
              key={av}
              onClick={() => router.push(buildUrl({ availability: providerFilters.availability === av ? null : av, page: "1" }))}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all capitalize ${
                providerFilters.availability === av
                  ? av === "available" ? "bg-emerald-500 text-white border-emerald-500"
                    : av === "busy"    ? "bg-amber-500  text-white border-amber-500"
                    : "bg-slate-500 text-white border-slate-500"
                  : "bg-white border-slate-200 text-slate-500 hover:border-slate-300 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-400"
              }`}
            >
              {av}
            </button>
          ))}

          {/* Certified-only toggle */}
          <button
            onClick={() => router.push(buildUrl({ certified: providerFilters.certified ? null : "true", page: "1" }))}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
              providerFilters.certified
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white border-slate-200 text-slate-500 hover:border-slate-300 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-400"
            }`}
          >
            <BadgeCheck className="h-3 w-3" />Certified only
          </button>

          {/* Clear all */}
          {providerFilterCount > 0 && (
            <button
              onClick={() => router.push(buildUrl({ skill: null, minRating: null, minJobs: null, availability: null, certified: null, page: "1" }))}
              className="ml-auto inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              <X className="h-3 w-3" />Clear filters ({providerFilterCount})
            </button>
          )}
        </div>
      )}

      {/* ── Pending approval banner ────────────────────────────────────── */}
      {pendingCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center justify-between gap-2 text-amber-800 text-sm">
          <span>
            <span className="font-semibold">{pendingCount}</span> provider{pendingCount !== 1 ? "s" : ""} on this page awaiting approval.
          </span>
          <button
            onClick={() => router.push(buildUrl({ role: "provider", approval: "pending_approval", page: "1" }))}
            className="text-xs font-medium text-amber-700 hover:underline flex-shrink-0"
          >
            Show only pending →
          </button>
        </div>
      )}

      {/* ── Bulk action toolbar ────────────────────────────────────────── */}
      {someSelected && (
        <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-xl px-4 py-2.5">
          <span className="text-primary text-sm font-semibold">{selectedIds.size} selected</span>
          <div className="flex gap-2 ml-auto flex-wrap">
            <button onClick={() => setShowBulkMessage(true)} disabled={!!bulkLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition-colors disabled:opacity-50">
              <MessageSquare size={12} />Message all
            </button>
            <button onClick={() => bulkAction("approve")} disabled={!!bulkLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors disabled:opacity-50">
              {bulkLoading === "approve" ? <span className="h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin" /> : <CheckCheck size={12} />}
              Approve all
            </button>
            <button onClick={() => bulkAction("verify")} disabled={!!bulkLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition-colors disabled:opacity-50">
              {bulkLoading === "verify" ? <span className="h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin" /> : <ShieldCheck size={12} />}
              Verify all
            </button>
            <button onClick={() => bulkAction("suspend")} disabled={!!bulkLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium transition-colors disabled:opacity-50">
              {bulkLoading === "suspend" ? <span className="h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin" /> : <Ban size={12} />}
              Suspend all
            </button>
            {isAdmin && (
              <button onClick={() => bulkAction("delete")} disabled={!!bulkLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-medium transition-colors disabled:opacity-50">
                {bulkLoading === "delete" ? <span className="h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin" /> : <Trash2 size={12} />}
                Delete all
              </button>
            )}
            <button onClick={() => setSelectedIds(new Set())}
              className="px-2.5 py-1.5 rounded-lg text-slate-500 hover:bg-slate-100 text-xs">
              Clear
            </button>
          </div>
        </div>
      )}

      {/* ── List ──────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm bg-white dark:bg-slate-800">

        {/* Select-all header */}
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-100 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-700/40 rounded-t-2xl">
          <input type="checkbox" checked={allSelected} onChange={toggleAll}
            className="rounded border-slate-300 text-primary focus:ring-primary/30"
            aria-label="Select all" />
          <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
            {allSelected ? `All ${users.length} selected` : `${total.toLocaleString()} user${total !== 1 ? "s" : ""}`}
          </span>
        </div>

        {users.length === 0 ? (
          <div className="px-6 py-14 text-center text-slate-400 dark:text-slate-500 text-sm rounded-b-2xl">
            No {roleFilter === "all" ? "" : roleFilter} users
            {searchQuery ? ` matching "${searchQuery}"` : ""} found.
          </div>
        ) : (
          <ul className="flex flex-col gap-2 p-2">
            {users.map((u) => {
              const initials = (u.name ?? "").split(" ").filter(Boolean).map((w: string) => w[0]).join("").slice(0, 2).toUpperCase() || "?";
              const approvalStatus = u.approvalStatus ?? "approved";
              const isPendingProvider = u.role === "provider" && approvalStatus === "pending_approval";
              const uid = u._id.toString();
              const isSelected = selectedIds.has(uid);
              return (
                <li
                  key={uid}
                  className={[
                    "flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors",
                    "bg-white dark:bg-slate-800/60",
                    isPendingProvider
                      ? "border-amber-300 dark:border-amber-700 bg-amber-50/40 dark:bg-amber-900/10"
                      : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600",
                    isSelected ? "border-primary/40 bg-primary/5 dark:bg-primary/10" : "",
                  ].join(" ")}
                >
                  {/* ── Left group ────────────────────────────────────── */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Checkbox */}
                    <input type="checkbox" checked={isSelected} onChange={() => toggleOne(uid)}
                      className="rounded border-slate-300 text-primary focus:ring-primary/30 flex-shrink-0"
                      aria-label={`Select ${u.name}`} />

                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {u.avatar
                        ? <Image src={u.avatar} alt={u.name} width={36} height={36} className="object-cover w-full h-full" />
                        : <span className="text-xs font-bold text-primary">{initials}</span>}
                    </div>

                    {/* Name + email + phone */}
                    <div className="min-w-0 w-64 flex-shrink-0">
                      <p className="font-semibold text-slate-900 dark:text-white text-sm truncate leading-tight">{u.name}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{u.email}</p>
                      <PhoneCell phone={u.phone} />
                    </div>

                    {/* Address */}
                    <div className="hidden lg:flex flex-col justify-center min-w-0 w-64 flex-shrink-0">
                      {(() => {
                        const addr = (u.addresses ?? []).find((a) => a.isDefault) ?? u.addresses?.[0];
                        return addr ? (
                          <>
                            {addr.label && (
                              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 truncate">{addr.label}</span>
                            )}
                            <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                              <MapPin size={10} className="flex-shrink-0 text-slate-300 dark:text-slate-600" />
                              <span className="truncate">{addr.address}</span>
                            </span>
                          </>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-300 dark:text-slate-600 italic">
                            <MapPin size={10} />No address
                          </span>
                        );
                      })()}
                    </div>

                    {/* Skills + experience (providers only) */}
                    {u.role === "provider" && (() => {
                      const pp = providerProfiles[uid];
                      if (!pp) return null;
                      const { skills, workExperiences, yearsExperience } = pp;
                      const hasSkills = skills.length > 0;
                      const hasExp    = workExperiences.length > 0 || yearsExperience > 0;
                      if (!hasSkills && !hasExp) return null;
                      return (
                        <div className="hidden xl:flex flex-col gap-1 justify-center min-w-0 w-56 flex-shrink-0">
                          {hasSkills && (
                            <div className="flex flex-wrap gap-1">
                              {skills.slice(0, 4).map((s) => (
                                <span key={s} className="inline-block px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-[10px] font-medium">{s}</span>
                              ))}
                              {skills.length > 4 && (
                                <span className="inline-block px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-[10px] font-medium">+{skills.length - 4}</span>
                              )}
                            </div>
                          )}
                          {hasExp && (
                            <div className="flex flex-col gap-0.5">
                              {yearsExperience > 0 && (
                                <span className="text-[10px] text-slate-400 dark:text-slate-500">{yearsExperience} yr{yearsExperience !== 1 ? "s" : ""} experience</span>
                              )}
                              {workExperiences.slice(0, 2).map((we, i) => (
                                <span key={i} className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{we}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {/* ── Right group ───────────────────────────────────── */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {/* Badges: role + status */}
                    <div className="hidden sm:flex flex-wrap items-center gap-1.5">
                      <span className={`badge capitalize ${ROLE_COLOR[u.role] ?? "bg-slate-100 text-slate-600"}`}>{u.role}</span>
                      {u.isSuspended
                        ? <span className="badge bg-red-100 text-red-700 font-semibold">Suspended</span>
                        : (
                          <>
                            {u.role === "provider" && (
                              <span className={`badge capitalize ${APPROVAL_COLOR[approvalStatus] ?? "bg-slate-100 text-slate-500"}`}>
                                {approvalStatus.replace(/_/g, " ")}
                              </span>
                            )}
                            <span className={u.isVerified ? "badge bg-green-100 text-green-700" : "badge bg-slate-100 text-slate-400"}>
                              {u.isVerified ? "✓ Verified" : "Unverified"}
                            </span>
                          </>
                        )
                      }
                    </div>

                    {/* Completeness */}
                    <div className="hidden xl:block">
                      <CompletenessCell u={u} />
                    </div>

                    {/* Joined */}
                    <div className="hidden md:flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                      <Clock size={11} className="flex-shrink-0" />{formatDate(u.createdAt)}
                    </div>

                    {/* Actions dropdown */}
                    <UserActions
                      userId={uid} userName={u.name} role={u.role}
                      isVerified={u.isVerified} isSuspended={u.isSuspended}
                      approvalStatus={approvalStatus}
                      email={u.email} phone={u.phone ?? undefined}
                      viewHref={`/admin/users/${uid}`}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {/* ── Pagination footer ─────────────────────────────────────── */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between gap-3 flex-wrap bg-slate-50/40 dark:bg-slate-700/30 rounded-b-2xl">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>Page {page} of {totalPages} · {total.toLocaleString()} users</span>
              <span className="text-slate-300 dark:text-slate-600">·</span>
              <span>Per page:</span>
              {([25, 50, 100] as const).map((l) => (
                <button key={l}
                  onClick={() => router.push(buildUrl({ limit: l, page: "1" }))}
                  className={`px-2 py-0.5 rounded text-xs font-semibold transition-colors ${
                    limit === l ? "bg-primary text-white" : "bg-slate-100 dark:bg-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-500"
                  }`}
                >{l}</button>
              ))}
            </div>
            <div className="flex gap-1 items-center">
              {page > 1 && (
                <button
                  onClick={() => router.push(buildUrl({ page: page - 1 }))}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-xs font-medium text-slate-600 dark:text-slate-300">
                  ← Prev
                </button>
              )}
              {pagination.map((p, i) =>
                p === "..." ? (
                  <span key={`ellipsis-${i}`} className="px-1.5 text-slate-400 dark:text-slate-500 text-xs">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => router.push(buildUrl({ page: p }))}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-medium transition-colors ${
                      p === page ? "bg-primary text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                    }`}>
                    {p}
                  </button>
                )
              )}
              {page < totalPages && (
                <button
                  onClick={() => router.push(buildUrl({ page: page + 1 }))}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-xs font-medium text-slate-600 dark:text-slate-300">
                  Next →
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Modals ────────────────────────────────────────────────────── */}
      {showBulkMessage && (
        <BulkMessageModal
          selectedIds={[...selectedIds]}
          onClose={() => setShowBulkMessage(false)}
          onSuccess={() => { setSelectedIds(new Set()); router.refresh(); }}
        />
      )}
      {showCreate && <CreateUserModal onClose={() => setShowCreate(false)} onSuccess={() => router.refresh()} />}
      {showImport && <ImportUsersModal onClose={() => setShowImport(false)} onSuccess={() => router.refresh()} />}
    </div>
  );
}
