"use client";

import { useState } from "react";
import { formatDate } from "@/lib/utils";
import UserActions from "./UserActions";
import type { IUser } from "@/types";

type FilterRole = "all" | "client" | "provider" | "admin";

interface Props {
  users: IUser[];
  total: number;
  page: number;
  totalPages: number;
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

export default function AdminUsersList({ users, total, page, totalPages }: Props) {
  const [roleFilter, setRoleFilter] = useState<FilterRole>("all");

  const filtered = roleFilter === "all" ? users : users.filter((u) => u.role === roleFilter);

  const counts = {
    all: users.length,
    client: users.filter((u) => u.role === "client").length,
    provider: users.filter((u) => u.role === "provider").length,
    admin: users.filter((u) => u.role === "admin").length,
  };

  const pendingCount = users.filter(
    (u) => u.role === "provider" && u.approvalStatus === "pending_approval"
  ).length;

  const TABS: { label: string; value: FilterRole }[] = [
    { label: "All", value: "all" },
    { label: "Clients", value: "client" },
    { label: "Providers", value: "provider" },
    { label: "Admins", value: "admin" },
  ];

  return (
    <div className="space-y-4">
      {/* Pending approval banner */}
      {pendingCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-2 text-amber-800 text-sm">
          <span className="font-semibold">{pendingCount}</span> provider{pendingCount !== 1 ? "s" : ""} awaiting approval — scroll down to review.
        </div>
      )}

      {/* Role filter tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setRoleFilter(tab.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              roleFilter === tab.value
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
            <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
              roleFilter === tab.value ? "bg-primary/10 text-primary" : "bg-slate-200 text-slate-500"
            }`}>
              {counts[tab.value]}
            </span>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">Joined</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-400 text-sm">
                    No {roleFilter === "all" ? "" : roleFilter} users found.
                  </td>
                </tr>
              ) : filtered.map((u) => {
                const initials = u.name
                  .split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
                const approvalStatus = u.approvalStatus ?? "approved";
                const isPendingProvider = u.role === "provider" && approvalStatus === "pending_approval";
                return (
                  <tr
                    key={u._id.toString()}
                    className={`hover:bg-slate-50/50 transition-colors ${isPendingProvider ? "bg-amber-50/40" : ""}`}
                  >
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-primary">{initials}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900 truncate">{u.name}</p>
                          <p className="text-xs text-slate-400 truncate">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className={`badge capitalize ${ROLE_COLOR[u.role] ?? "bg-slate-100 text-slate-600"}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="flex flex-col gap-1">
                        {/* Provider approval status */}
                        {u.role === "provider" && (
                          <span className={`badge capitalize ${APPROVAL_COLOR[approvalStatus] ?? "bg-slate-100 text-slate-500"}`}>
                            {approvalStatus.replace("_", " ")}
                          </span>
                        )}
                        {u.isVerified && <span className="badge bg-green-100 text-green-700">Verified</span>}
                        {u.isSuspended && <span className="badge bg-red-100 text-red-700">Suspended</span>}
                        {!u.isVerified && !u.isSuspended && u.role !== "provider" && (
                          <span className="badge bg-slate-100 text-slate-500">Unverified</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-xs text-slate-500">{formatDate(u.createdAt)}</td>
                    <td className="px-6 py-3.5">
                      <UserActions
                        userId={u._id.toString()}
                        role={u.role}
                        isVerified={u.isVerified}
                        isSuspended={u.isSuspended}
                        approvalStatus={approvalStatus}
                      />
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
                <a href={`?page=${page - 1}`} className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors font-medium">
                  Previous
                </a>
              )}
              {page < totalPages && (
                <a href={`?page=${page + 1}`} className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors font-medium">
                  Next
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
