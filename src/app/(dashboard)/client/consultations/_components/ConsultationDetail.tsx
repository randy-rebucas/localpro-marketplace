"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "@/lib/dateUtils";
import type { IConsultation } from "@/types";

const STATUS_STYLES: Record<string, string> = {
  pending:   "bg-yellow-100 text-yellow-800",
  accepted:  "bg-green-100 text-green-800",
  declined:  "bg-red-100 text-red-800",
  completed: "bg-blue-100 text-blue-800",
  expired:   "bg-slate-100 text-slate-600",
};

interface ConsultationDetailProps {
  consultationId: string;
  userId: string;
}

export function ConsultationDetail({
  consultationId,
  userId,
}: ConsultationDetailProps) {
  const router = useRouter();
  const [consultation, setConsultation] = useState<IConsultation | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [showConvertForm, setShowConvertForm] = useState(false);
  const [convertError, setConvertError] = useState<string | null>(null);
  const [converting, setConverting] = useState(false);
  const [convertData, setConvertData] = useState({
    budget: "",
    scheduleDate: "",
  });
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

  // Scroll to bottom when messages update
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

      const message = await res.json();
      setMessages((prev) => [...prev, message]);
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

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-4 w-36 bg-slate-200 rounded" />
        <div className="bg-white rounded-lg border p-6 space-y-4">
          <div className="flex justify-between gap-4">
            <div className="flex-1 space-y-3">
              <div className="h-7 bg-slate-200 rounded w-3/4" />
              <div className="h-4 bg-slate-200 rounded w-full" />
              <div className="h-4 bg-slate-200 rounded w-2/3" />
            </div>
            <div className="h-7 w-24 bg-slate-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center">
        <p className="font-medium text-red-700">Failed to load consultation</p>
        <p className="text-sm text-red-600 mt-1">{error}</p>
      </div>
    );
  }

  if (!consultation) {
    return (
      <div className="text-center py-16 text-slate-500">Consultation not found</div>
    );
  }

  const isInitiator = consultation.initiatorId?.toString() === userId;
  const isAccepted = consultation.status === "accepted";
  const hasEstimate = consultation.estimateAmount != null;
  const statusClass = STATUS_STYLES[consultation.status] ?? "bg-slate-100 text-slate-600";
  const statusLabel =
    consultation.status.charAt(0).toUpperCase() + consultation.status.slice(1);

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link
        href="/client/consultations"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-blue-600 transition"
      >
        ← Back to Consultations
      </Link>

      {/* Detail Card */}
      <div className="bg-white rounded-lg border p-6 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-slate-900">{consultation.title}</h1>
            <p className="text-slate-600 mt-2 leading-relaxed">{consultation.description}</p>
            <div className="flex flex-wrap gap-4 text-sm text-slate-500 mt-4">
              {consultation.status === "pending" ? (
                <span className="flex items-center gap-1 text-slate-400">
                  📍 <span className="blur-sm select-none px-1">Location hidden</span>
                  <span className="text-xs">(revealed once accepted)</span>
                </span>
              ) : (
                <span className="flex items-center gap-1">📍 {consultation.location}</span>
              )}
              <span className="flex items-center gap-1">
                📝 {consultation.type === "site_inspection" ? "Site Inspection" : "Chat"}
              </span>
              <span>{formatDistanceToNow(new Date(consultation.createdAt))} ago</span>
            </div>
          </div>
          <span className={`shrink-0 inline-block px-3 py-1 text-sm font-medium rounded-full ${statusClass}`}>
            {statusLabel}
          </span>
        </div>

        {/* Photos */}
        {consultation.photos.length > 0 && (
          <div>
            <h3 className="font-semibold text-slate-800 mb-3">Photos</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {consultation.photos.map((photo, idx) => (
                <a key={idx} href={photo} target="_blank" rel="noopener noreferrer">
                  <img
                    src={photo}
                    alt={`Photo ${idx + 1}`}
                    className="w-full h-40 object-cover rounded-lg border hover:opacity-90 transition"
                  />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Estimate */}
        {hasEstimate && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
            <h3 className="font-semibold text-slate-800 mb-1">Provider Estimate</h3>
            <div className="text-2xl font-bold text-emerald-600 mb-2">
              ₱{consultation.estimateAmount!.toLocaleString()}
            </div>
            {consultation.estimateNote && (
              <p className="text-slate-700 text-sm leading-relaxed">{consultation.estimateNote}</p>
            )}
          </div>
        )}

        {/* Convert to Job */}
        {isInitiator && isAccepted && !consultation.jobCreatedFromConsultationId && (
          <div>
            <button
              onClick={() => setShowConvertForm(!showConvertForm)}
              className="btn-primary"
            >
              {showConvertForm ? "Cancel" : "Convert to Job"}
            </button>
          </div>
        )}

        {showConvertForm && (
          <form onSubmit={handleConvertToJob} className="p-4 bg-slate-50 rounded-lg space-y-4 border">
            <h3 className="font-semibold text-slate-900">Create Job from Consultation</h3>
            {convertError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                {convertError}
              </p>
            )}
            <div>
              <label className="block text-sm font-medium mb-1">Budget (PHP) <span className="text-red-500">*</span></label>
              <input
                type="number"
                value={convertData.budget}
                onChange={(e) => setConvertData({ ...convertData, budget: e.target.value })}
                placeholder={consultation.estimateAmount?.toString() || "Enter budget"}
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Schedule Date <span className="text-red-500">*</span></label>
              <input
                type="datetime-local"
                value={convertData.scheduleDate}
                onChange={(e) => setConvertData({ ...convertData, scheduleDate: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={converting}>
              {converting ? "Creating Job…" : "Create Job"}
            </button>
          </form>
        )}
      </div>

      {/* Conversation */}
      <div className="bg-white rounded-lg border p-6 space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">Conversation</h2>

        <div className="space-y-3 max-h-96 overflow-y-auto bg-slate-50 p-4 rounded-lg">
          {messages.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">No messages yet. Start the conversation below.</p>
          ) : (
            messages.map((msg, idx) => {
              const isMine = msg.senderId === userId;
              return (
                <div
                  key={idx}
                  className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] px-4 py-2.5 rounded-2xl shadow-sm ${
                      isMine
                        ? "bg-blue-600 text-white rounded-br-sm"
                        : "bg-white border text-slate-900 rounded-bl-sm"
                    }`}
                  >
                    <p className="text-sm leading-relaxed">{msg.body}</p>
                    <p className={`text-xs mt-1 ${isMine ? "text-blue-200" : "text-slate-400"}`}>
                      {formatDistanceToNow(new Date(msg.createdAt))} ago
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message input */}
        {consultation.status !== "declined" && consultation.status !== "expired" && (
          <div className="space-y-2">
            {messageError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                {messageError}
              </p>
            )}
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message…"
                className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                disabled={sendingMessage}
              />
              <button
                type="submit"
                disabled={sendingMessage || !newMessage.trim()}
                className="btn-primary shrink-0"
              >
                {sendingMessage ? "…" : "Send"}
              </button>
            </form>
          </div>
        )}

        {(consultation.status === "declined" || consultation.status === "expired") && (
          <p className="text-sm text-slate-400 text-center italic">
            This consultation is {consultation.status} — messaging is no longer available.
          </p>
        )}
      </div>
    </div>
  );
}
