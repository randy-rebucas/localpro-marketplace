"use client";

import { useState, useRef, useEffect } from "react";
import {
  MessageCircle,
  X,
  Send,
  Loader2,
  Sparkles,
  ChevronDown,
  Zap,
} from "lucide-react";
import { apiFetch } from "@/lib/fetchClient";
import toast from "react-hot-toast";
import BookingConfirmation from "./BookingConfirmation";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  action?: any;
  nextAction?: string;
}

interface ConversationState {
  jobData?: any;
  selectedProvider?: any;
  confirmedBooking?: boolean;
  jobId?: string;
  jobStatus?: string;
  urgentMode?: boolean;
  switchMode?: boolean;
}

const QUICK_PROMPTS = [
  "I need a plumber",
  "Find an electrician",
  "Where is my provider?",
  "Cancel my request",
];

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function AIChatDispatcher() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationState, setConversationState] = useState<ConversationState>({});
  const [showBookingConfirm, setShowBookingConfirm] = useState(false);
  const [availableProviders, setAvailableProviders] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content:
            "Hi there! 👋 I'm your LocalPro AI agent. I can help you book services, track jobs, and resolve issues instantly.\n\nWhat do you need help with today?",
          timestamp: new Date().toISOString(),
        },
      ]);
    }
  }, [isOpen, messages.length]);

  const handleSend = async (text?: string) => {
    const trimmed = (text ?? input).trim();
    if (!trimmed || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: trimmed,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    if (inputRef.current) inputRef.current.style.height = "auto";

    setLoading(true);

    try {
      const chatMessages = messages.map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      }));
      chatMessages.push({ role: "user" as const, content: trimmed });

      const response = await apiFetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: chatMessages,
          context: "User is browsing LocalPro marketplace",
          conversationState,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to get response");
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: `reply-${Date.now()}`,
        role: "assistant",
        content: data.message,
        timestamp: data.timestamp,
        action: data.action,
        nextAction: data.nextAction,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      const dispatchAction = async (url: string, body: object, key: string) => {
        await new Promise((r) => setTimeout(r, 500));
        try {
          const res = await apiFetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || "Request failed");
          }
          return await res.json();
        } catch (err) {
          throw err;
        }
      };

      const addMsg = (content: string, id: string) =>
        setMessages((prev) => [
          ...prev,
          { id, role: "assistant", content, timestamp: new Date().toISOString() },
        ]);

      if (data.action?.action === "STATUS_UPDATE" && data.action?.jobId) {
        const d = await dispatchAction("/api/ai/chat/job-status", { jobId: data.action.jobId }, "status").catch(() => null);
        if (d) {
          addMsg(d.clientMessage, `status-${Date.now()}`);
          setConversationState((p) => ({ ...p, jobStatus: d.status }));
        }
      } else if (data.action?.action === "CANCEL_JOB" && data.action?.jobId) {
        const d = await dispatchAction("/api/ai/chat/cancel-job", { jobId: data.action.jobId }, "cancel").catch((e) => { toast.error(e.message); return null; });
        if (d) {
          addMsg(d.message + "\n\n" + d.refundInfo, `cancel-${Date.now()}`);
          setConversationState({});
        }
      } else if (data.action?.action === "ESCALATE_DISPUTE" && data.action?.jobId) {
        const d = await dispatchAction("/api/ai/chat/escalate-dispute", data.action, "dispute").catch((e) => { toast.error(e.message); return null; });
        if (d) {
          addMsg(d.message, `dispute-${Date.now()}`);
          toast.success("Dispute escalated to support team");
        }
      } else if (data.action?.action === "BOOKING_INQUIRY") {
        const d = await dispatchAction("/api/ai/chat/booking-info", { userMessage: data.action.userMessage }, "booking").catch(() => null);
        if (d) addMsg(d.message, `booking-${Date.now()}`);
      } else if (data.action?.action === "PROVIDER_ONBOARDING") {
        const d = await dispatchAction(
          "/api/ai/chat/provider-onboarding",
          { userMessage: data.action.userMessage, routing: data.action.routing },
          "provider-onboarding"
        ).catch(() => null);
        if (d) addMsg(d.message, `provider-onboarding-${Date.now()}`);
      } else if (data.action?.action === "MARKETING_OUTREACH") {
        const d = await dispatchAction(
          "/api/ai/chat/marketing-outreach",
          { userMessage: data.action.userMessage, routing: data.action.routing },
          "marketing-outreach"
        ).catch(() => null);
        if (d) addMsg(d.message, `marketing-${Date.now()}`);
      } else if (data.action?.action === "FINANCE_LEGAL_INQUIRY") {
        const d = await dispatchAction(
          "/api/ai/chat/finance-legal",
          { userMessage: data.action.userMessage, routing: data.action.routing },
          "finance-legal"
        ).catch(() => null);
        if (d) addMsg(d.message, `finance-legal-${Date.now()}`);
      } else if (data.action?.action === "RECURRING_SERVICE" && data.action?.jobData) {
        const d = await dispatchAction("/api/ai/chat/recurring-job", { jobData: data.action.jobData }, "recurring").catch((e) => { toast.error(e.message); return null; });
        if (d) {
          addMsg(d.message, `recurring-${Date.now()}`);
          if (d.providers?.length) {
            setAvailableProviders(d.providers);
            setConversationState((p) => ({ ...p, jobData: data.action.jobData }));
          }
        }
      } else if (data.action?.action === "GET_QUOTE_ESTIMATE" && data.action?.jobData) {
        const d = await dispatchAction("/api/ai/chat/price-estimate", { jobData: data.action.jobData }, "estimate").catch((e) => { toast.error(e.message); return null; });
        if (d) {
          addMsg(d.message, `estimate-${Date.now()}`);
          setConversationState((p) => ({ ...p, jobData: data.action.jobData }));
        }
      } else if (data.action?.action === "MODIFY_JOB" && data.action?.jobId) {
        const d = await dispatchAction("/api/ai/chat/modify-job", data.action, "modify").catch((e) => { toast.error(e.message); return null; });
        if (d) addMsg(d.message, `modify-${Date.now()}`);
      } else if (data.action?.action === "URGENT_SERVICE") {
        const d = await dispatchAction("/api/ai/chat/urgent-service", { jobData: data.action.jobData }, "urgent").catch((e) => { toast.error(e.message); return null; });
        if (d) {
          addMsg(d.message, `urgent-${Date.now()}`);
          if (d.urgentProviders?.length) {
            setAvailableProviders(d.urgentProviders);
            setConversationState((p) => ({ ...p, jobData: data.action.jobData, urgentMode: true }));
          }
        }
      } else if (data.action?.action === "SWITCH_PROVIDER") {
        const d = await dispatchAction("/api/ai/chat/switch-provider", {
          jobId: conversationState?.jobId,
          jobData: data.action.jobData,
          reason: data.action.reason,
          feedback: data.action.feedback,
        }, "switch").catch((e) => { toast.error(e.message); return null; });
        if (d) {
          addMsg(d.message, `switch-${Date.now()}`);
          if (d.replacementProviders?.length) {
            setAvailableProviders(d.replacementProviders);
            setConversationState((p) => ({ ...p, switchMode: true }));
          }
        }
      } else if (data.action?.action === "VENDOR_REQUEST") {
        const d = await dispatchAction("/api/ai/chat/vendor-request", data.action, "vendor").catch((e) => { toast.error(e.message); return null; });
        if (d) {
          addMsg(d.message, `vendor-${Date.now()}`);
          toast.success("Vendor inquiry submitted! We'll contact you soon.");
        }
      } else if (data.nextAction === "ASSIGN_PROVIDER" && data.extractedData) {
        setConversationState((p) => ({ ...p, jobData: data.extractedData }));
        setTimeout(() => {
          const mock = [{ providerId: "provider1", name: "Juan Plumbing Services", rating: 4.8, jobs: 128, matchScore: 95, reason: "Expert plumber with 95% match in your area" }];
          setAvailableProviders(mock);
          setConversationState((p) => ({ ...p, selectedProvider: mock[0] }));
        }, 1500);
      } else if (data.nextAction === "CONFIRM_BOOKING") {
        setShowBookingConfirm(true);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send message");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleBookingConfirm = async () => {
    try {
      if (!conversationState.selectedProvider || !conversationState.jobData) {
        throw new Error("Missing booking information");
      }
      const res = await apiFetch("/api/ai/chat/confirm-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobData: conversationState.jobData,
          providerId: conversationState.selectedProvider.providerId,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to confirm booking");
      }
      const data = await res.json();
      setShowBookingConfirm(false);
      setMessages((prev) => [
        ...prev,
        {
          id: `success-${Date.now()}`,
          role: "assistant",
          content: `✅ Booking confirmed! Your job has been created (ID: ${data.jobId.slice(-8)}). The provider has been notified and will contact you shortly.\n\nYou can ask 'Where is my provider?' or 'Cancel my request' anytime.`,
          timestamp: new Date().toISOString(),
        },
      ]);
      setConversationState((p) => ({ ...p, jobId: data.jobId, jobStatus: "assigned" }));
      toast.success("Booking confirmed!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to confirm booking");
    }
  };

  const handleSelectProvider = (provider: any) => {
    setConversationState((p) => ({ ...p, selectedProvider: provider }));
    setMessages((prev) => [
      ...prev,
      {
        id: `provider-select-${Date.now()}`,
        role: "user",
        content: `Great! Let's go with ${provider.name}. Please confirm the booking.`,
        timestamp: new Date().toISOString(),
      },
    ]);
    setTimeout(() => setShowBookingConfirm(true), 500);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  const showQuickPrompts = messages.length <= 1 && !loading;

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-40 rounded-full shadow-xl transition-all duration-300 flex items-center justify-center group ${
          isOpen
            ? "w-12 h-12 bg-slate-700 hover:bg-slate-800"
            : "w-14 h-14 bg-gradient-to-br from-primary to-primary-dark hover:scale-105 hover:shadow-2xl"
        } text-white`}
        title={isOpen ? "Close assistant" : "Open LocalPro AI"}
        aria-label="AI Chat Dispatcher"
      >
        {isOpen ? (
          <ChevronDown className="w-5 h-5" />
        ) : (
          <>
            <Sparkles className="w-6 h-6" />
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-white" />
          </>
        )}
      </button>

      {/* Agent panel */}
      {isOpen && (
        <div
          className="fixed bottom-24 right-6 z-40 flex flex-col rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
          style={{ width: 384, maxWidth: "calc(100vw - 24px)", height: 560, maxHeight: "calc(100vh - 120px)" }}
        >
          {/* ── Header ── */}
          <div className="flex-none bg-gradient-to-r from-primary to-primary-dark px-4 py-3 flex items-center gap-3">
            {/* Avatar */}
            <div className="relative flex-none">
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm leading-tight">LocalPro AI</p>
              <p className="text-white/70 text-xs">Online · Responds instantly</p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => { setMessages([]); setConversationState({}); setAvailableProviders([]); }}
                className="text-white/70 hover:text-white hover:bg-white/15 rounded-lg px-2 py-1 text-xs transition-colors"
                title="Clear chat"
              >
                Clear
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/70 hover:text-white hover:bg-white/15 rounded-lg p-1.5 transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ── Messages ── */}
          <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900 px-4 py-4 space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                {/* Avatar */}
                {msg.role === "assistant" && (
                  <div className="flex-none w-7 h-7 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center mt-auto mb-0.5">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                  </div>
                )}

                <div className={`flex flex-col gap-1 max-w-[78%] ${msg.role === "user" ? "items-end" : "items-start"}`}>
                  <div
                    className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
                      msg.role === "user"
                        ? "bg-primary text-white rounded-tr-sm"
                        : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-sm border border-slate-100 dark:border-slate-700 rounded-tl-sm"
                    }`}
                  >
                    {msg.content}
                  </div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 px-1">
                    {formatTime(msg.timestamp)}
                  </span>

                  {/* Provider selection cards */}
                  {msg.nextAction === "ASSIGN_PROVIDER" && availableProviders.length > 0 && (
                    <div className="w-full space-y-2 mt-1">
                      {availableProviders.map((provider) => (
                        <button
                          key={provider.providerId}
                          onClick={() => handleSelectProvider(provider)}
                          className="w-full text-left p-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-primary hover:shadow-sm transition-all text-sm"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <p className="font-medium text-slate-900 dark:text-white text-sm">{provider.name}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                ⭐ {provider.rating} · {provider.jobs} jobs
                              </p>
                              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{provider.reason}</p>
                            </div>
                            <div className="flex-none text-center">
                              <div className="text-base font-bold text-green-600 dark:text-green-400">{provider.matchScore}%</div>
                              <p className="text-[10px] text-slate-400">match</p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div className="flex gap-2">
                <div className="flex-none w-7 h-7 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* ── Quick prompts ── */}
          {showQuickPrompts && (
            <div className="flex-none bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 px-3 py-2 flex gap-1.5 overflow-x-auto scrollbar-hide">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleSend(prompt)}
                  className="flex-none text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-primary hover:text-primary dark:hover:text-primary rounded-full px-3 py-1.5 transition-colors whitespace-nowrap"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* ── Input bar (LinkedIn style) ── */}
          <div className="flex-none bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 px-3 py-2.5">
            <div className="flex items-end gap-2">
              <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-2xl px-3.5 py-2 min-h-[40px] flex items-end">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={handleInput}
                  onKeyDown={handleKeyDown}
                  placeholder="Write a message…"
                  rows={1}
                  className="w-full resize-none bg-transparent text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none leading-relaxed"
                  style={{ maxHeight: 120 }}
                />
              </div>
              <button
                onClick={() => handleSend()}
                disabled={loading || !input.trim()}
                className={`flex-none w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                  input.trim() && !loading
                    ? "bg-primary hover:bg-primary-dark text-white shadow-sm"
                    : "bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed"
                }`}
                title="Send"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Powered by row */}
            <div className="flex items-center justify-center gap-1 mt-1.5">
              <Zap className="w-3 h-3 text-slate-300 dark:text-slate-600" />
              <span className="text-[10px] text-slate-300 dark:text-slate-600 tracking-wide">Powered by LocalPro AI</span>
            </div>
          </div>
        </div>
      )}

      {/* Booking Confirmation Modal */}
      {conversationState.selectedProvider && (
        <BookingConfirmation
          isOpen={showBookingConfirm}
          onClose={() => setShowBookingConfirm(false)}
          onConfirm={handleBookingConfirm}
          booking={{
            jobTitle: conversationState.jobData?.jobTitle || "Service Request",
            jobBudget: conversationState.jobData?.budget
              ? `₱${conversationState.jobData.budget.toLocaleString()}`
              : "TBD",
            jobCategory: conversationState.jobData?.category || "",
            jobLocation: conversationState.jobData?.location || "",
            providerName: conversationState.selectedProvider.name,
            providerRating: conversationState.selectedProvider.rating?.toFixed(1) || "N/A",
            providerJobs: conversationState.selectedProvider.jobs || 0,
            matchScore: conversationState.selectedProvider.matchScore || 0,
            reason: conversationState.selectedProvider.reason || "",
          }}
          isLoading={loading}
        />
      )}
    </>
  );
}
