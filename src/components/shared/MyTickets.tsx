"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import {
  Ticket, Plus, X, ChevronDown, AlertTriangle, CheckCircle2,
  Clock, Loader2, Star, Send,
} from "lucide-react";
import { apiFetch } from "@/lib/fetchClient";

type TicketStatus   = "open" | "in_progress" | "resolved" | "closed";
type TicketPriority = "low" | "normal" | "high" | "urgent";
type TicketCategory =
  | "billing" | "account" | "dispute" | "technical" | "kyc" | "payout" | "other";

interface SupportTicket {
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
  resolvedAt?: string;
  closedAt?: string;
  createdAt: string;
}

const STATUS_STYLES: Record<TicketStatus, { className: string; icon: React.ReactNode }> = {
  open:        { className: "text-blue-700 bg-blue-50 border-blue-200",   icon: <Clock       className="h-3 w-3" /> },
  in_progress: { className: "text-amber-700 bg-amber-50 border-amber-200", icon: <Loader2     className="h-3 w-3 animate-spin" /> },
  resolved:    { className: "text-green-700 bg-green-50 border-green-200", icon: <CheckCircle2 className="h-3 w-3" /> },
  closed:      { className: "text-slate-600 bg-slate-100 border-slate-200", icon: <X           className="h-3 w-3" /> },
};

const PRIORITY_STYLES: Record<TicketPriority, { className: string }> = {
  low:    { className: "text-slate-500 bg-slate-50 border-slate-200" },
  normal: { className: "text-sky-700 bg-sky-50 border-sky-200" },
  high:   { className: "text-orange-700 bg-orange-50 border-orange-200" },
  urgent: { className: "text-red-700 bg-red-50 border-red-200" },
};

const CATEGORY_VALUES: TicketCategory[] = ["billing", "account", "dispute", "technical", "kyc", "payout", "other"];

function StarRating({ score, onChange }: { score?: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          className="transition-transform hover:scale-110"
        >
          <Star className={`h-5 w-5 ${(hovered || score || 0) >= n ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} />
        </button>
      ))}
    </div>
  );
}

export default function MyTickets() {
  const t = useTranslations("myTickets");
  const tCommon = useTranslations("common");
  const [tickets, setTickets]       = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading]   = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [expanded, setExpanded]     = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // New ticket form state
  const [subject,  setSubject]  = useState("");
  const [body,     setBody]     = useState("");
  const [category, setCategory] = useState<TicketCategory>("other");

  // CSAT submission state
  const [csatLoading, setCsatLoading] = useState<string | null>(null);

  useEffect(() => {
    apiFetch("/api/support/tickets")
      .then((r) => r.json())
      .then((d: { tickets: SupportTicket[] }) => { setTickets(d.tickets); setIsLoading(false); })
      .catch(() => setIsLoading(false));
  }, []);

  async function handleCreateTicket(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !body.trim()) return;
    setSubmitting(true);
    try {
      const res  = await apiFetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: subject.trim(), body: body.trim(), category }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? t("createFailed")); return; }
      toast.success(t("ticketCreated", { number: data.ticket.ticketNumber }));
      setTickets((prev) => [data.ticket as SupportTicket, ...prev]);
      setShowForm(false);
      setSubject(""); setBody(""); setCategory("other");
    } catch {
      toast.error(tCommon("somethingWentWrong"));
    } finally {
      setSubmitting(false);
    }
  }

  async function submitCsat(ticketId: string, score: number) {
    setCsatLoading(ticketId);
    try {
      const res  = await apiFetch(`/api/support/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csatScore: score }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? t("csatFailed")); return; }
      toast.success(t("csatFeedback"));
      setTickets((prev) => prev.map((t) => t._id === ticketId ? { ...t, csatScore: score } : t));
    } catch {
      toast.error(tCommon("somethingWentWrong"));
    } finally {
      setCsatLoading(null);
    }
  }

  if (isLoading) {
    return <div className="h-40 animate-pulse bg-slate-100 rounded-xl" />;
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{t("sub")}</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
        >
          {showForm ? <><X className="h-4 w-4" /> {tCommon("cancel")}</> : <><Plus className="h-4 w-4" /> {t("newTicket")}</>}
        </button>
      </div>

      {/* New ticket form */}
      {showForm && (
        <form onSubmit={handleCreateTicket} className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
          <h4 className="text-sm font-semibold text-slate-800">{t("formTitle")}</h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-slate-600 block mb-1">{t("subjectLabel")} *</label>
              <input
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                placeholder={t("subjectPlaceholder")}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                maxLength={255}
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">{t("categoryLabel")} *</label>
              <select
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                value={category}
                onChange={(e) => setCategory(e.target.value as TicketCategory)}
              >
                {CATEGORY_VALUES.map((v) => (
                  <option key={v} value={v}>{t(("cat_" + v) as Parameters<typeof t>[0])}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">{t("detailsLabel")} *</label>
            <textarea
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none"
              placeholder={t("detailsPlaceholder")}
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={5000}
              required
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting || !subject.trim() || !body.trim()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> {tCommon("submitting")}</> : <><Send className="h-4 w-4" /> {t("submitTicket")}</>}
            </button>
          </div>
        </form>
      )}

      {/* Ticket list */}
      {tickets.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-12 text-center">
          <div className="p-3 rounded-2xl bg-slate-100">
            <Ticket className="h-6 w-6 text-slate-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-600">{t("emptyTitle")}</p>
            <p className="text-xs text-slate-400 mt-1">{t("emptyBody")}</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {tickets.map((ticket) => {
            const sm = STATUS_STYLES[ticket.status];
            const pm = PRIORITY_STYLES[ticket.priority];
            const isExpanded = expanded === ticket._id;
            const needsCsat = (ticket.status === "resolved" || ticket.status === "closed") && !ticket.csatScore;

            return (
              <div
                key={ticket._id}
                className={[
                  "rounded-xl border transition-colors",
                  ticket.slaBreach && ticket.status !== "resolved" && ticket.status !== "closed"
                    ? "border-red-200 bg-red-50/30"
                    : "border-slate-200 bg-white",
                ].join(" ")}
              >
                <button
                  onClick={() => setExpanded(isExpanded ? null : ticket._id)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left"
                >
                  {/* Ticket number */}
                  <span className="flex-shrink-0 font-mono text-xs font-bold text-primary">{ticket.ticketNumber}</span>

                  {/* Subject */}
                  <span className="flex-1 text-sm font-medium text-slate-800 truncate">{ticket.subject}</span>

                  {/* SLA breach */}
                  {ticket.slaBreach && ticket.status !== "resolved" && ticket.status !== "closed" && (
                    <AlertTriangle className="flex-shrink-0 h-4 w-4 text-red-500" />
                  )}

                  {/* Category */}
                  <span className="hidden sm:inline-flex flex-shrink-0 text-[10px] font-semibold text-slate-500 bg-slate-100 rounded px-1.5 py-0.5 capitalize">
                    {ticket.category}
                  </span>

                  {/* Priority */}
                  <span className={`flex-shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold border rounded-full px-2 py-0.5 ${pm.className}`}>
                    {t(("priority_" + ticket.priority) as Parameters<typeof t>[0])}
                  </span>

                  {/* Status */}
                  <span className={`flex-shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold border rounded-full px-2 py-0.5 ${sm.className}`}>
                    {sm.icon} {t(("status_" + ticket.status) as Parameters<typeof t>[0])}
                  </span>

                  <ChevronDown className={`flex-shrink-0 h-4 w-4 text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3 border-t border-slate-100">
                    <div className="pt-3">
                      <p className="text-xs font-medium text-slate-500 mb-1">{t("issueDescription")}</p>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{ticket.body}</p>
                    </div>

                    <div className="flex flex-wrap gap-4 text-xs text-slate-400">
                      <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                      {ticket.slaDeadline && (
                        <span className={ticket.slaBreach ? "text-red-500 font-medium" : ""}>
                          SLA: {new Date(ticket.slaDeadline).toLocaleString()}
                          {ticket.slaBreach ? ` (${t("slaBreach")})` : ""}
                        </span>
                      )}
                      {ticket.resolvedAt && <span>{new Date(ticket.resolvedAt).toLocaleDateString()}</span>}
                    </div>

                    {/* CSAT */}
                    {needsCsat && (
                      <div className="rounded-lg bg-amber-50 border border-amber-100 p-3">
                        <p className="text-xs font-semibold text-amber-800 mb-2">{t("csatQuestion")}</p>
                        {csatLoading === ticket._id ? (
                          <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
                        ) : (
                          <StarRating onChange={(score) => submitCsat(ticket._id, score)} />
                        )}
                      </div>
                    )}
                    {ticket.csatScore && (
                      <p className="text-xs text-slate-400">
                        {t("csatThanks", { stars: "★".repeat(ticket.csatScore) + "☆".repeat(5 - ticket.csatScore) })}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
