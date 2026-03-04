"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, MapPin, Clock, Send, ChevronDown, ChevronUp } from "lucide-react";
import { formatDistanceToNow } from "@/lib/dateUtils";
import type { IConsultation } from "@/types";

const STATUS_STYLES: Record<string, { bg: string; dot: string }> = {
  pending:   { bg: "bg-yellow-100 text-yellow-800",  dot: "bg-yellow-400" },
  accepted:  { bg: "bg-green-100 text-green-800",    dot: "bg-green-500" },
  declined:  { bg: "bg-red-100 text-red-800",        dot: "bg-red-400" },
  completed: { bg: "bg-blue-100 text-blue-800",      dot: "bg-blue-500" },
  expired:   { bg: "bg-slate-100 text-slate-600",    dot: "bg-slate-400" },
};

interface ConsultationDetailProps {
  consultationId: string;
  userId: string;
}

export function ConsultationDetail({ consultationId, userId }: ConsultationDetailProps) {
  const router = useRouter();
  const [consultation,     setConsultation]     = useState<IConsultation | null>(null);
  const [messages,         setMessages]         = useState<any[]>([]);
  const [loading,          setLoading]          = useState(true);
  const [error,            setError]            = useState<string | null>(null);
  const [newMessage,       setNewMessage]       = useState("");
  const [sendingMessage,   setSendingMessage]   = useState(false);
  const [messageError,     setMessageError]     = useState<string | null>(null);
  const [showConvertForm,  setShowConvertForm]  = useState(false);
  const [convertError,     setConvertError]     = useState<string | null>(null);
  const [converting,       setConverting]       = useState(false);
  const [convertData,      setConvertData]      = useState({ budget: "", scheduleDate: "" });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchConsultation = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/consultations/${consultationId}`);
        if (!res.ok) throw new Error("Failed to fetch consultation");
        const data = await res.json();
        setConsultation(data.consultation);
        setMessages(data.messages || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };
    fetchConsultation();
  }, [consultationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    try {
      setSendingMessage(true);
      setMessageError(null);
      const res = await fetch(`/api/consultations/${consultationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: newMessage }),
      });
      if (!res.ok) throw new Error("Failed to send message");
      const sent = await res.json();
      setMessages((prev) => [...prev, sent]);
      setNewMessage("");
    } catch (err) {
      setMessageError(err instanceof Error ? err.message : "Error sending message");
    } finally {
      setSendingMessage(false);
    }
  };

  const handleConvertToJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!convertData.budget || !convertData.scheduleDate) {
      setConvertError("Please fill in all required fields");
      return;
    }
    try {
      setConverting(true);
      setConvertError(null);
      const res = await fetch(`/api/consultations/${consultationId}/convert-to-job`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          budget: parseFloat(convertData.budget),
          scheduleDate: new Date(convertData.scheduleDate).toISOString(),
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || d.message || "Failed to convert to job");
      }
      const { job } = await res.json();
      router.push(`/client/jobs/${job._id}`);
    } catch (err) {
      setConvertError(err instanceof Error ? err.message : "Error converting to job");
    } finally {
      setConverting(false);
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-4 w-32 bg-slate-200 rounded" />
        <div className="bg-white rounded-xl border p-4 sm:p-6 space-y-4">
          <div className="h-6 bg-slate-200 rounded w-3/4" />
          <div className="h-4 bg-slate-200 rounded w-full" />
          <div className="h-4 bg-slate-200 rounded w-2/3" />
          <div className="flex gap-2">
            <div className="h-20 bg-slate-200 rounded-lg flex-1" />
            <div className="h-20 bg-slate-200 rounded-lg flex-1" />
          </div>
        </div>
        <div className="bg-white rounded-xl border p-4 sm:p-6 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}>
              <div className="h-10 bg-slate-200 rounded-2xl w-2/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
        <p className="font-medium text-red-700">Failed to load consultation</p>
        <p className="text-sm text-red-600 mt-1">{error}</p>
      </div>
    );
  }

  if (!consultation) {
    return <div className="text-center py-16 text-slate-500">Consultation not found</div>;
  }

  const isInitiator = consultation.initiatorId?.toString() === userId;
  const isAccepted  = consultation.status === "accepted";
  const hasEstimate = consultation.estimateAmount != null;
  const statusInfo  = STATUS_STYLES[consultation.status] ?? { bg: "bg-slate-100 text-slate-600", dot: "bg-slate-400" };
  const statusLabel = consultation.status.charAt(0).toUpperCase() + consultation.status.slice(1);
  const isClosed    = consultation.status === "declined" || consultation.status === "expired";

  return (
    <div className="space-y-4">
      {/* Back */}
      <Link
        href="/client/consultations"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-primary transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Consultations
      </Link>

      {/* Detail Card */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {/* Status colour strip */}
        <div className={`h-1 w-full ${statusInfo.dot}`} />

        <div className="p-4 sm:p-6 space-y-5">
          {/* Title + status row */}
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold text-slate-900 leading-snug">
                {consultation.title}
              </h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-2 text-sm text-slate-500">
                {consultation.status === "pending" ? (
                  <span className="flex items-center gap-1 text-slate-400 text-xs">
                    <MapPin className="h-3.5 w-3.5" />
                    <span className="blur-sm select-none">Location hidden</span>
                    <span className="text-[10px] not-blur">(revealed once accepted)</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs">
                    <MapPin className="h-3.5 w-3.5" /> {consultation.location}
                  </span>
                )}
                <span className="text-xs">
                  {consultation.type === "site_inspection" ? "🏢 Site Inspection" : "💬 Chat"}
                </span>
                <span className="flex items-center gap-1 text-xs">
                  <Clock className="h-3.5 w-3.5" /> {formatDistanceToNow(new Date(consultation.createdAt))} ago
                </span>
              </div>
            </div>
            <span className={`flex-shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${statusInfo.bg}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
              {statusLabel}
            </span>
          </div>

          {/* Description */}
          <p className="text-sm text-slate-600 leading-relaxed">{consultation.description}</p>

          {/* Photos */}
          {consultation.photos.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-800 mb-2">Photos</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {consultation.photos.map((photo, idx) => (
                  <a key={idx} href={photo} target="_blank" rel="noopener noreferrer" className="block">
                    <img
                      src={photo}
                      alt={`Photo ${idx + 1}`}
                      className="w-full h-28 sm:h-36 object-cover rounded-lg border border-slate-200 hover:opacity-90 transition"
                    />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Estimate */}
          {hasEstimate && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
              <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-1">Provider Estimate</p>
              <div className="text-2xl font-bold text-emerald-600">
                ₱{consultation.estimateAmount!.toLocaleString()}
              </div>
              {consultation.estimateNote && (
                <p className="text-slate-700 text-sm mt-2 leading-relaxed">{consultation.estimateNote}</p>
              )}
            </div>
          )}

          {/* Convert to Job */}
          {isInitiator && isAccepted && !consultation.jobCreatedFromConsultationId && (
            <div>
              <button
                onClick={() => setShowConvertForm(!showConvertForm)}
                className="inline-flex items-center gap-2 btn-primary"
              >
                {showConvertForm ? <><ChevronUp className="h-4 w-4" /> Cancel</> : <><span>✅</span> Convert to Job</>}
              </button>

              {showConvertForm && (
                <form onSubmit={handleConvertToJob} className="mt-3 p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                  <h3 className="text-sm font-semibold text-slate-900">Create Job from Consultation</h3>
                  {convertError && (
                    <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                      {convertError}
                    </p>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1.5">
                        Budget (PHP) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={convertData.budget}
                        onChange={(e) => setConvertData({ ...convertData, budget: e.target.value })}
                        placeholder={consultation.estimateAmount?.toString() || "Enter budget"}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1.5">
                        Schedule Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="datetime-local"
                        value={convertData.scheduleDate}
                        onChange={(e) => setConvertData({ ...convertData, scheduleDate: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                        required
                      />
                    </div>
                  </div>
                  <button type="submit" className="btn-primary w-full" disabled={converting}>
                    {converting ? "Creating Job…" : "🚀 Create Job"}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Conversation */}
      <div className="bg-white rounded-xl border border-slate-200 flex flex-col" style={{ minHeight: "320px" }}>
        <div className="px-4 sm:px-6 py-3.5 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-900">Conversation</h2>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 bg-slate-50" style={{ maxHeight: "380px" }}>
          {messages.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-10">
              No messages yet. Start the conversation below.
            </p>
          ) : (
            messages.map((msg, idx) => {
              const isMine = msg.senderId === userId;
              return (
                <div key={idx} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] sm:max-w-[70%] px-3.5 py-2.5 rounded-2xl shadow-sm ${
                      isMine
                        ? "bg-primary text-white rounded-br-sm"
                        : "bg-white border border-slate-200 text-slate-900 rounded-bl-sm"
                    }`}
                  >
                    <p className="text-sm leading-relaxed">{msg.body}</p>
                    <p className={`text-[11px] mt-1 ${
                      isMine ? "text-white/60" : "text-slate-400"
                    }`}>
                      {formatDistanceToNow(new Date(msg.createdAt))} ago
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-3 sm:p-4 border-t border-slate-100 bg-white">
          {!isClosed ? (
            <div className="space-y-2">
              {messageError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {messageError}
                </p>
              )}
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message…"
                  className="flex-1 min-w-0 px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  disabled={sendingMessage}
                />
                <button
                  type="submit"
                  disabled={sendingMessage || !newMessage.trim()}
                  className="inline-flex items-center justify-center gap-1.5 btn-primary px-4 rounded-xl flex-shrink-0"
                  aria-label="Send message"
                >
                  <Send className="h-4 w-4" />
                  <span className="hidden sm:inline">{sendingMessage ? "…" : "Send"}</span>
                </button>
              </form>
            </div>
          ) : (
            <p className="text-xs text-slate-400 text-center italic py-1">
              This consultation is {consultation.status} — messaging is no longer available.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
