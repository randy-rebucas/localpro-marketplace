"use client";

import { useState } from "react";
import { formatDate } from "@/lib/utils";
import UserActions from "./UserActions";
import type { IUser } from "@/types";

type FilterRole = "all" | "client" | "provider" | "admin";

interface Props {
  users: IUser[];
}

const ROLE_COLOR: Record<string, string> = {
  admin:    "bg-purple-100 text-purple-700",
  provider: "bg-blue-100 text-blue-700",
  client:   "bg-slate-100 text-slate-700",
};

export default function AdminUsersList({ users }: Props) {
  const [roleFilter, setRoleFilter] = useState<FilterRole>("all");

  const filtered = roleFilter === "all" ? users : users.filter((u) => u.role === roleFilter);

  const counts = {
    all: users.length,
    client: users.filter((u) => u.role === "client").length,
    provider: users.filter((u) => u.role === "provider").length,
    admin: users.filter((u) => u.role === "admin").length,
  };

  const TABS: { label: string; value: FilterRole }[] = [
    { label: "All", value: "all" },
    { label: "Clients", value: "client" },
    { label: "Providers", value: "provider" },
    { label: "Admins", value: "admin" },
  ];

  return (
    <div className="space-y-4">
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
                return (
                  <tr key={u._id.toString()} className="hover:bg-slate-50/50 transition-colors">
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
                        {u.isVerified && <span className="badge bg-green-100 text-green-700">Verified</span>}
                        {u.isSuspended && <span className="badge bg-red-100 text-red-700">Suspended</span>}
                        {!u.isVerified && !u.isSuspended && <span className="badge bg-slate-100 text-slate-500">Unverified</span>}
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-xs text-slate-500">{formatDate(u.createdAt)}</td>
                    <td className="px-6 py-3.5">
                      <UserActions
                        userId={u._id.toString()}
                        isVerified={u.isVerified}
                        isSuspended={u.isSuspended}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
