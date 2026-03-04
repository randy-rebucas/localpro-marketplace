"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "@/lib/dateUtils";
import type { IConsultation } from "@/types";

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  accepted: "bg-green-100 text-green-800",
  declined: "bg-red-100 text-red-800",
  converted: "bg-blue-100 text-blue-800",
  expired: "bg-slate-100 text-slate-600",
};

interface ProviderConsultationDetailProps {
  consultationId: string;
  userId: string;
}

export function ProviderConsultationDetail({
  consultationId,
  userId,
}: ProviderConsultationDetailProps) {
  const [consultation, setConsultation] = useState<IConsultation | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [responding, setResponding] = useState(false);
  const [respondError, setRespondError] = useState<string | null>(null);
  const [respondSuccess, setRespondSuccess] = useState<string | null>(null);
  const [responseData, setResponseData] = useState({
    action: "accept" as "accept" | "decline",
    estimateAmount: "",
    estimateNote: "",
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () =>
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

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
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    setMessageError(null);
    try {
      setSendingMessage(true);
      const res = await fetch(`/api/consultations/${consultationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: newMessage }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || d.message || "Failed to send message");
      }
      const message = await res.json();
      setMessages((prev) => [...prev, message]);
      setNewMessage("");
    } catch (err) {
      setMessageError(err instanceof Error ? err.message : "Error sending message");
    } finally {
      setSendingMessage(false);
    }
  };

  const handleRespond = async (e: React.FormEvent) => {
    e.preventDefault();
    setRespondError(null);
    setRespondSuccess(null);

    if (responseData.action === "accept") {
      if (!responseData.estimateAmount || !responseData.estimateNote) {
        setRespondError("Please provide both estimate amount and details");
        return;
      }
      if (parseFloat(responseData.estimateAmount) < 1) {
        setRespondError("Estimate must be at least ₱1");
        return;
      }
      if (responseData.estimateNote.length < 20) {
        setRespondError("Estimate note must be at least 20 characters");
        return;
      }
    }

    try {
      setResponding(true);
      const res = await fetch(`/api/consultations/${consultationId}/respond`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: responseData.action,
          ...(responseData.action === "accept" && {
            estimateAmount: parseFloat(responseData.estimateAmount),
            estimateNote: responseData.estimateNote,
          }),
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || d.message || "Failed to respond");
      }

      const updated = await res.json();
      setConsultation(updated);
      setRespondSuccess(
        responseData.action === "accept"
          ? "Estimate provided successfully!"
          : "Consultation declined"
      );
      setResponseData({ action: "accept", estimateAmount: "", estimateNote: "" });
    } catch (err) {
      setRespondError(
        err instanceof Error ? err.message : "Error responding to consultation"
      );
    } finally {
      setResponding(false);
    }
  };

  if (loading)
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-4 w-24 bg-slate-200 rounded" />
        <div className="bg-white rounded-lg border p-6 space-y-4">
          <div className="h-7 w-2/3 bg-slate-200 rounded" />
          <div className="h-4 w-full bg-slate-200 rounded" />
          <div className="h-4 w-5/6 bg-slate-200 rounded" />
        </div>
        <div className="bg-white rounded-lg border p-6 space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-10 bg-slate-200 rounded" />
          ))}
        </div>
      </div>
    );

  if (error)
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-red-700">
        {error}
      </div>
    );

  if (!consultation)
    return (
      <div className="text-center py-12 text-slate-500">Consultation not found</div>
    );

  const isPending = consultation.status === "pending";
  const hasResponded =
    consultation.status === "accepted" || consultation.status === "declined";

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/provider/consultations"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-blue-600 transition-colors"
      >
        ← Back to Consultations
      </Link>

      {/* Main card */}
      <div className="bg-white rounded-lg border p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{consultation.title}</h1>
            <p className="text-slate-600 mt-2">{consultation.description}</p>
            <div className="flex flex-wrap gap-4 text-sm text-slate-500 mt-4">
              {consultation.status === "pending" ? (
                <span className="flex items-center gap-1 text-slate-400">
                  📍 <span className="blur-sm select-none px-1">Location hidden</span>
                  <span className="text-xs">(revealed once you accept)</span>
                </span>
              ) : (
                <span>📍 {consultation.location}</span>
              )}
              <span>
                📝 {consultation.type === "site_inspection" ? "Site Inspection" : "Chat"}
              </span>
              <span>{formatDistanceToNow(new Date(consultation.createdAt))} ago</span>
            </div>
          </div>
          <span
            className={`shrink-0 inline-block px-3 py-1 text-sm font-medium rounded capitalize ${
              STATUS_COLOR[consultation.status] ?? "bg-slate-100 text-slate-600"
            }`}
          >
            {consultation.status}
          </span>
        </div>

        {/* Photos */}
        {consultation.photos.length > 0 && (
          <div className="mt-6">
            <h3 className="font-semibold text-slate-900 mb-3">Client Photos</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {consultation.photos.map((photo, idx) =>
                consultation.status === "pending" ? (
                  <div key={idx} className="relative w-full h-48 rounded-lg border overflow-hidden select-none">
                    <img
                      src={photo}
                      alt={`Photo ${idx + 1}`}
                      className="w-full h-full object-cover blur-[2px] pointer-events-none"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-white/70 font-bold text-lg tracking-widest rotate-[-30deg] uppercase pointer-events-none select-none">
                        LocalPro
                      </span>
                    </div>
                  </div>
                ) : (
                  <a key={idx} href={photo} target="_blank" rel="noopener noreferrer">
                    <img
                      src={photo}
                      alt={`Photo ${idx + 1}`}
                      className="w-full h-48 object-cover rounded-lg border hover:opacity-90 transition-opacity"
                    />
                  </a>
                )
              )}
            </div>
          </div>
        )}

        {/* Success banner */}
        {respondSuccess && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            {respondSuccess}
          </div>
        )}

        {/* Response form */}
        {isPending && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-slate-900 mb-4">Respond to Consultation</h3>

            {respondError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {respondError}
              </div>
            )}

            <form onSubmit={handleRespond} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Decision</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      value="accept"
                      checked={responseData.action === "accept"}
                      onChange={(e) =>
                        setResponseData({ ...responseData, action: e.target.value as any })
                      }
                    />
                    <span className="text-sm">Accept &amp; Provide Estimate</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      value="decline"
                      checked={responseData.action === "decline"}
                      onChange={(e) =>
                        setResponseData({ ...responseData, action: e.target.value as any })
                      }
                    />
                    <span className="text-sm">Decline</span>
                  </label>
                </div>
              </div>

              {responseData.action === "accept" && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Estimate Amount (PHP) <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="number"
                      value={responseData.estimateAmount}
                      onChange={(e) =>
                        setResponseData({ ...responseData, estimateAmount: e.target.value })
                      }
                      placeholder="e.g., 5000"
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Estimate Details <span className="text-red-600">*</span>
                    </label>
                    <textarea
                      value={responseData.estimateNote}
                      onChange={(e) =>
                        setResponseData({ ...responseData, estimateNote: e.target.value })
                      }
                      placeholder="Explain your estimate, scope of work, materials needed, timeline, etc. (min 20 chars)"
                      minLength={20}
                      maxLength={500}
                      rows={4}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      {responseData.estimateNote.length}/500 characters
                    </p>
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={responding}
                className="btn-primary w-full"
              >
                {responding
                  ? "Sending..."
                  : responseData.action === "accept"
                  ? "Submit Estimate"
                  : "Decline Consultation"}
              </button>
            </form>
          </div>
        )}

        {/* Responded state */}
        {hasResponded && (
          <div
            className={`mt-6 p-4 rounded-lg ${
              consultation.status === "accepted"
                ? "bg-green-50 border border-green-200"
                : "bg-red-50 border border-red-200"
            }`}
          >
            <p className="font-semibold text-slate-900">
              {consultation.status === "accepted"
                ? `Estimate Provided: ₱${consultation.estimateAmount?.toLocaleString()}`
                : "Consultation Declined"}
            </p>
            {consultation.estimateNote && (
              <p className="text-slate-700 mt-2">{consultation.estimateNote}</p>
            )}
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="bg-white rounded-lg border p-6 space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">Conversation</h2>

        <div className="max-h-96 overflow-y-auto bg-slate-50 p-4 rounded-lg space-y-4">
          {messages.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No messages yet</p>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${
                  msg.senderId === userId ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-xs px-4 py-2 rounded-2xl ${
                    msg.senderId === userId
                      ? "bg-blue-600 text-white"
                      : "bg-white border text-slate-900"
                  }`}
                >
                  <p className="text-sm">{msg.body}</p>
                  <p className="text-xs opacity-60 mt-1">
                    {formatDistanceToNow(new Date(msg.createdAt))} ago
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {messageError && (
          <p className="text-sm text-red-600">{messageError}</p>
        )}

        {consultation.status !== "declined" &&
          consultation.status !== "expired" && (
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={sendingMessage}
              />
              <button
                type="submit"
                disabled={sendingMessage || !newMessage.trim()}
                className="btn-primary"
              >
                {sendingMessage ? "Sending..." : "Send"}
              </button>
            </form>
          )}
      </div>
    </div>
  );
}
