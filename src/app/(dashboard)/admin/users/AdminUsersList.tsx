"use client";

import { useMemo, useState, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import toast from "react-hot-toast";
import { apiFetch } from "@/lib/fetchClient";
import { formatDate } from "@/lib/utils";
import UserActions from "./UserActions";
import CreateUserModal from "./CreateUserModal";
import ImportUsersModal from "./ImportUsersModal";
import type { IUser } from "@/types";
import { CheckCircle2, XCircle, Clock, UserPlus, Upload, Download, Search, X, ShieldCheck, Ban, Trash2 } from "lucide-react";

type FilterRole = "all" | "client" | "provider" | "admin";

interface Props {
  users: IUser[];
  total: number;
  page: number;
  totalPages: number;
  /** Active role filter, derived from the URL by the server component. */
  roleFilter: FilterRole;
  /** Active keyword search, derived from the URL by the server component. */
  searchQuery: string;
}

// ─── Completeness helpers ─────────────────────────────────────────────────────

interface CompletenessItem { label: string; done: boolean }

function getCompleteness(u: IUser): { items: CompletenessItem[]; score: number; pct: number } {
  // Base items available on IUser for both roles — mirrors the profile checklists.
  // Provider-specific fields (bio, skills, hourly rate, service areas, schedule)
  // live on IProviderProfile and are not available here.
  const base: CompletenessItem[] = [
    { label: "Profile photo",  done: !!u.avatar },
    { label: "KYC submitted",  done: !!u.kycStatus && u.kycStatus !== "none" },
    { label: "KYC approved",   done: u.kycStatus === "approved" },
    { label: "Phone number",   done: !!u.phone },
    { label: "Address saved",  done: (u.addresses?.length ?? 0) > 0 },
  ];

  const items = base;
  const score = items.filter((i) => i.done).length;
  return { items, score, pct: Math.round((score / items.length) * 100) };
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
      {/* Bar + score */}
      <div className="flex items-center gap-2">
        <div className="h-1.5 w-24 rounded-full bg-slate-100 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${c.bar}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className={`text-xs font-semibold tabular-nums ${c.text}`}>{pct}%</span>
      </div>

      {/* Hover tooltip */}
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

export default function AdminUsersList({ users, total, page, totalPages, roleFilter, searchQuery }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);

  // ── Search ─────────────────────────────────────────────────────────────
  const [searchDraft, setSearchDraft] = useState(searchQuery);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pushSearch = useCallback((val: string) => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      const params = new URLSearchParams();
      if (roleFilter !== "all") params.set("role", roleFilter);
      if (val.trim()) params.set("search", val.trim());
      params.set("page", "1");
      router.push(`${pathname}?${params.toString()}`);
    }, 350);
  }, [pathname, roleFilter, router]);

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearchDraft(e.target.value);
    pushSearch(e.target.value);
  }

  function clearSearch() {
    setSearchDraft("");
    pushSearch("");
  }

  // ── Bulk selection ─────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState<"verify" | "suspend" | "delete" | null>(null);

  const allSelected = users.length > 0 && selectedIds.size === users.length;
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

  async function bulkAction(action: "verify" | "suspend" | "delete") {
    if (selectedIds.size === 0) return;
    if (action === "delete") {
      const ok = confirm(`Soft-delete ${selectedIds.size} user(s)? They will be deactivated.`);
      if (!ok) return;
    }
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

  // Server already filtered by role — no client-side re-filter needed.
  // useMemo prevents recomputing on unrelated re-renders.
  const pendingCount = useMemo(
    () => users.filter((u) => u.role === "provider" && u.approvalStatus === "pending_approval").length,
    [users]
  );

  const TABS: { label: string; value: FilterRole }[] = [
    { label: "All",       value: "all"      },
    { label: "Clients",   value: "client"   },
    { label: "Providers", value: "provider" },
    { label: "Admins",    value: "admin"    },
  ];

  /** Navigate to a new role filter, resetting to page 1. */
  function handleRoleChange(role: FilterRole) {
    const params = new URLSearchParams();
    if (role !== "all") params.set("role", role);
    if (searchDraft.trim()) params.set("search", searchDraft.trim());
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  }

  /** Build a pagination URL that preserves the current role filter and search. */
  function pageUrl(p: number) {
    const params = new URLSearchParams();
    if (roleFilter !== "all") params.set("role", roleFilter);
    if (searchDraft.trim()) params.set("search", searchDraft.trim());
    params.set("page", String(p));
    return `${pathname}?${params.toString()}`;
  }

  return (
    <div className="space-y-4">
      {/* Toolbar: role tabs + action buttons */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Role filter tabs */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => handleRoleChange(tab.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                roleFilter === tab.value
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab.label}
              {roleFilter === tab.value && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary">
                  {total}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search + action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchDraft}
              onChange={handleSearchChange}
              placeholder="Search name, email, phone…"
              className="pl-7 pr-7 py-1.5 rounded-lg border border-slate-200 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 w-52 bg-white"
            />
            {searchDraft && (
              <button onClick={clearSearch} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X size={12} />
              </button>
            )}
          </div>
          <a
            href={`/api/admin/users/export?${new URLSearchParams([
              ...(roleFilter !== "all" ? [["role", roleFilter]] : []),
              ...(searchDraft.trim() ? [["search", searchDraft.trim()]] : []),
            ]).toString()}`}
            download
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors"
            title={`Export ${roleFilter === "all" ? "all" : roleFilter} users as CSV`}
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </a>
          <button
            type="button"
            onClick={() => setShowImport(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors"
          >
            <Upload className="h-3.5 w-3.5" />
            Import CSV
          </button>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary/90 transition-colors"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Create user
          </button>
        </div>
      </div>

      {/* Pending approval banner */}
      {pendingCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-2 text-amber-800 text-sm">
          <span className="font-semibold">{pendingCount}</span> provider{pendingCount !== 1 ? "s" : ""} awaiting approval — scroll down to review.
        </div>
      )}

      {/* Bulk action toolbar */}
      {someSelected && (
        <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-xl px-4 py-2.5">
          <span className="text-primary text-sm font-semibold">{selectedIds.size} selected</span>
          <div className="flex gap-2 ml-auto">
            <button
              onClick={() => bulkAction("verify")}
              disabled={!!bulkLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition-colors disabled:opacity-50"
            >
              {bulkLoading === "verify" ? <span className="h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin" /> : <ShieldCheck size={12} />}
              Verify all
            </button>
            <button
              onClick={() => bulkAction("suspend")}
              disabled={!!bulkLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium transition-colors disabled:opacity-50"
            >
              {bulkLoading === "suspend" ? <span className="h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin" /> : <Ban size={12} />}
              Suspend all
            </button>
            <button
              onClick={() => bulkAction("delete")}
              disabled={!!bulkLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-medium transition-colors disabled:opacity-50"
            >
              {bulkLoading === "delete" ? <span className="h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin" /> : <Trash2 size={12} />}
              Delete all
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-2.5 py-1.5 rounded-lg text-slate-500 hover:bg-slate-100 text-xs"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="rounded border-slate-300 text-primary focus:ring-primary/30"
                    aria-label="Select all"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">Profile</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">Joined</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-slate-400 text-sm">
                    No {roleFilter === "all" ? "" : roleFilter} users{searchQuery ? ` matching "${searchQuery}"` : ""} found.
                  </td>
                </tr>
              ) : users.map((u) => {
                // Guard: filter out empty words before taking first char
                const initials = u.name
                  .split(" ").filter(Boolean).map((w: string) => w[0]).join("").slice(0, 2).toUpperCase() || "?";
                const approvalStatus = u.approvalStatus ?? "approved";
                const isPendingProvider = u.role === "provider" && approvalStatus === "pending_approval";
                const uid = u._id.toString();
                const isSelected = selectedIds.has(uid);
                return (
                  <tr
                    key={uid}
                    className={`hover:bg-slate-50/50 transition-colors ${isPendingProvider ? "bg-amber-50/30 border-l-2 border-amber-400" : ""} ${isSelected ? "bg-primary/5" : ""}`}
                  >
                    {/* Checkbox */}
                    <td className="px-4 py-3.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleOne(uid)}
                        className="rounded border-slate-300 text-primary focus:ring-primary/30"
                        aria-label={`Select ${u.name}`}
                      />
                    </td>
                    {/* User */}
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        {/* Avatar — photo if available, initials fallback */}
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {u.avatar
                            ? <Image src={u.avatar} alt={u.name} width={32} height={32} className="object-cover w-full h-full" />
                            : <span className="text-xs font-bold text-primary">{initials}</span>}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900 truncate">{u.name}</p>
                          <p className="text-xs text-slate-400 truncate">{u.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="px-6 py-3.5">
                      <span className={`badge capitalize ${ROLE_COLOR[u.role] ?? "bg-slate-100 text-slate-600"}`}>
                        {u.role}
                      </span>
                    </td>

                    {/* Status — approval + verification + suspension */}
                    <td className="px-6 py-3.5">
                      <div className="flex flex-col gap-1">
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
                    </td>

                    {/* Profile completeness */}
                    <td className="px-6 py-3.5">
                      <CompletenessCell u={u} />
                    </td>

                    {/* Joined */}
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-1 text-xs text-slate-400">
                        <Clock size={11} className="flex-shrink-0" />
                        {formatDate(u.createdAt)}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-3.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Link
                          href={`/admin/users/${uid}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                        >
                          View
                        </Link>
                        <UserActions
                          userId={uid}
                          userName={u.name}
                          role={u.role}
                          isVerified={u.isVerified}
                          isSuspended={u.isSuspended}
                          approvalStatus={approvalStatus}
                          email={u.email}
                          phone={u.phone ?? undefined}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        {totalPages > 1 && (
          <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Showing page {page} of {totalPages} ({total} total users)</span>
            <div className="flex gap-2">
              {page > 1 && (
                <Link href={pageUrl(page - 1)} className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors font-medium">
                  Previous
                </Link>
              )}
              {page < totalPages && (
                <Link href={pageUrl(page + 1)} className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors font-medium">
                  Next
                </Link>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onSuccess={() => router.refresh()}
        />
      )}
      {showImport && (
        <ImportUsersModal
          onClose={() => setShowImport(false)}
          onSuccess={() => router.refresh()}
        />
      )}
    </div>
  );
}
