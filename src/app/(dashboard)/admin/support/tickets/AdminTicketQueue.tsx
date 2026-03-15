"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Ticket, AlertTriangle, Clock, CheckCircle2, X, Loader2,
  RefreshCw, Filter, User,
} from "lucide-react";
import { apiFetch } from "@/lib/fetchClient";

type TicketStatus   = "open" | "in_progress" | "resolved" | "closed";
type TicketPriority = "low" | "normal" | "high" | "urgent";
type TicketCategory = "billing" | "account" | "dispute" | "technical" | "kyc" | "payout" | "other";

interface AdminTicket {
  _id: string;
  ticketNumber: string;
  subject: string;
  body: string;
  category: TicketCategory;
  status: TicketStatus;
  priority: TicketPriority;
  slaDeadline?: string;
  slaBreach: boolean;
  csatScore?: number;
  createdAt: string;
  resolvedAt?: string;
  userId?: { _id: string; name: string; email: string; role: string } | null;
  assignedTo?: { _id: string; name: string } | null;
}

const STATUS_TABS: { value: TicketStatus | "all"; label: string }[] = [
  { value: "all",         label: "All" },
  { value: "open",        label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved",    label: "Resolved" },
  { value: "closed",      label: "Closed" },
];

const STATUS_META: Record<TicketStatus, { label: string; className: string; icon: React.ReactNode }> = {
  open:        { label: "Open",        className: "text-blue-700 bg-blue-50 border-blue-200",    icon: <Clock        className="h-3 w-3" /> },
  in_progress: { label: "In Progress", className: "text-amber-700 bg-amber-50 border-amber-200", icon: <Loader2      className="h-3 w-3 animate-spin" /> },
  resolved:    { label: "Resolved",    className: "text-green-700 bg-green-50 border-green-200", icon: <CheckCircle2 className="h-3 w-3" /> },
  closed:      { label: "Closed",      className: "text-slate-600 bg-slate-100 border-slate-200", icon: <X           className="h-3 w-3" /> },
};

const PRIORITY_META: Record<TicketPriority, { label: string; className: string }> = {
  low:    { label: "Low",    className: "text-slate-500 bg-slate-50 border-slate-200" },
  normal: { label: "Normal", className: "text-sky-700 bg-sky-50 border-sky-200" },
  high:   { label: "High",   className: "text-orange-700 bg-orange-50 border-orange-200" },
  urgent: { label: "Urgent", className: "text-red-700 bg-red-50 border-red-200" },
};

export default function AdminTicketQueue() {
  const [tickets, setTickets]   = useState<AdminTicket[]>([]);
  const [total, setTotal]       = useState(0);
  const [isLoading, setLoading] = useState(true);
  const [statusFilter, setStatus]   = useState<TicketStatus | "all">("all");
  const [priorityFilter, setPriority] = useState<TicketPriority | "all">("all");
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter   !== "all") params.set("status",   statusFilter);
      if (priorityFilter !== "all") params.set("priority", priorityFilter);
      const res  = await apiFetch(`/api/admin/support/tickets?${params.toString()}`);
      const data = await res.json() as { tickets: AdminTicket[]; total: number };
      setTickets(data.tickets);
      setTotal(data.total);
    } catch {
      // swallow
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  async function updateStatus(ticketId: string, status: TicketStatus) {
    setUpdating(ticketId);
    try {
      const res  = await apiFetch("/api/admin/support/tickets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId, status }),
      });
      const data = await res.json() as { ticket: AdminTicket };
      setTickets((prev) => prev.map((t) => t._id === ticketId ? { ...t, ...data.ticket } : t));
    } catch {
      // swallow
    } finally {
      setUpdating(null);
    }
  }

  return (
    <div className="flex flex-col gap-4 p-6 overflow-y-auto h-full">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Ticket className="h-5 w-5 text-primary" /> Ticket Queue
            {!isLoading && <span className="text-sm font-normal text-slate-400">({total})</span>}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Manage and resolve user support tickets.</p>
        </div>
        <button
          onClick={fetchTickets}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {/* Status tabs */}
        <div className="flex gap-1 rounded-xl bg-slate-100 dark:bg-slate-700 p-1">
          {STATUS_TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setStatus(t.value)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === t.value
                  ? "bg-white dark:bg-slate-600 text-slate-800 dark:text-white shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Priority filter */}
        <div className="flex items-center gap-1.5">
          <Filter className="h-3.5 w-3.5 text-slate-400" />
          <select
            value={priorityFilter}
            onChange={(e) => setPriority(e.target.value as TicketPriority | "all")}
            className="rounded-lg border border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-600 px-2 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 focus:ring-1 focus:ring-primary outline-none"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 animate-pulse bg-slate-100 dark:bg-slate-700 rounded-xl" />
          ))}
        </div>
      ) : tickets.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 py-16 text-center">
          <Ticket className="h-8 w-8 text-slate-300" />
          <p className="text-sm text-slate-500">No tickets match the current filters.</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {tickets.map((ticket) => {
            const sm = STATUS_META[ticket.status];
            const pm = PRIORITY_META[ticket.priority];
            return (
              <div
                key={ticket._id}
                className={[
                  "flex items-center gap-3 rounded-xl border px-4 py-3 bg-white dark:bg-slate-800 transition-colors",
                  ticket.slaBreach && ticket.status !== "resolved" && ticket.status !== "closed"
                    ? "border-red-200 dark:border-red-900"
                    : "border-slate-200 dark:border-slate-700",
                ].join(" ")}
              >
                {/* SLA breach */}
                {ticket.slaBreach && ticket.status !== "resolved" && ticket.status !== "closed" && (
                  <AlertTriangle className="flex-shrink-0 h-4 w-4 text-red-500" />
                )}

                {/* Ticket number */}
                <span className="flex-shrink-0 w-20 font-mono text-xs font-bold text-primary">{ticket.ticketNumber}</span>

                {/* Subject + user */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{ticket.subject}</p>
                  {ticket.userId && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <User className="h-3 w-3 text-slate-400" />
                      <span className="text-xs text-slate-400 truncate">
                        {ticket.userId.name} · {ticket.userId.email}
                      </span>
                    </div>
                  )}
                </div>

                {/* Category */}
                <span className="hidden lg:inline-flex flex-shrink-0 text-[10px] font-semibold text-slate-500 bg-slate-100 dark:bg-slate-700 rounded px-1.5 py-0.5 capitalize">
                  {ticket.category}
                </span>

                {/* Created */}
                <span className="hidden md:block flex-shrink-0 text-xs text-slate-400">
                  {new Date(ticket.createdAt).toLocaleDateString()}
                </span>

                {/* Priority badge */}
                <span className={`flex-shrink-0 inline-flex text-[10px] font-semibold border rounded-full px-2 py-0.5 ${pm.className}`}>
                  {pm.label}
                </span>

                {/* Status badge + quick-change */}
                <div className="flex-shrink-0 relative">
                  {updating === ticket._id ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  ) : (
                    <select
                      value={ticket.status}
                      onChange={(e) => updateStatus(ticket._id, e.target.value as TicketStatus)}
                      onClick={(e) => e.stopPropagation()}
                      className={`appearance-none text-[10px] font-semibold border rounded-full px-2 py-0.5 cursor-pointer focus:outline-none ${sm.className}`}
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  )}
                </div>

                {/* Chat link — opens the user's support thread */}
                {ticket.userId && (
                  <Link
                    href={`/admin/support/${ticket.userId._id}`}
                    className="flex-shrink-0 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    Chat
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
