"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Loader2, AlertCircle } from "lucide-react";
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

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Initialize with welcome message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content:
            "Hello! 👋 I'm the LocalPro assistant. I can help you post a job and find the perfect provider instantly.\n\nTry saying:\n• 'I need a plumber in Quezon City - budget 2000 pesos'\n• 'Where is my provider?'\n• 'Cancel my request'",
          timestamp: new Date().toISOString(),
        },
      ]);
    }
  }, [isOpen, messages.length]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: trimmed,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }

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

      // Handle different action types
      if (data.action?.action === "STATUS_UPDATE" && data.action?.jobId) {
        // Fetch job status
        setTimeout(async () => {
          try {
            const statusRes = await apiFetch("/api/ai/chat/job-status", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ jobId: data.action.jobId }),
            });

            if (statusRes.ok) {
              const statusData = await statusRes.json();
              const statusMsg: Message = {
                id: `status-${Date.now()}`,
                role: "assistant",
                content: statusData.clientMessage,
                timestamp: new Date().toISOString(),
              };
              setMessages((prev) => [...prev, statusMsg]);
              setConversationState((prev) => ({
                ...prev,
                jobStatus: statusData.status,
              }));
            }
          } catch (err) {
            console.error("Failed to get status:", err);
          }
        }, 500);
      } else if (data.action?.action === "CANCEL_JOB" && data.action?.jobId) {
        // Cancel job
        setTimeout(async () => {
          try {
            const cancelRes = await apiFetch("/api/ai/chat/cancel-job", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ jobId: data.action.jobId }),
            });

            if (cancelRes.ok) {
              const cancelData = await cancelRes.json();
              const cancelMsg: Message = {
                id: `cancel-${Date.now()}`,
                role: "assistant",
                content: cancelData.message + "\n\n" + cancelData.refundInfo,
                timestamp: new Date().toISOString(),
              };
              setMessages((prev) => [...prev, cancelMsg]);
              setConversationState({});
            } else {
              const error = await cancelRes.json();
              toast.error(error.error || "Failed to cancel job");
            }
          } catch (err) {
            console.error("Failed to cancel job:", err);
            toast.error("Failed to cancel job");
          }
        }, 500);
      } else if (data.action?.action === "ESCALATE_DISPUTE" && data.action?.jobId) {
        // Escalate dispute to support team
        setTimeout(async () => {
          try {
            const disputeRes = await apiFetch("/api/ai/chat/escalate-dispute", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(data.action),
            });

            if (disputeRes.ok) {
              const disputeData = await disputeRes.json();
              const disputeMsg: Message = {
                id: `dispute-${Date.now()}`,
                role: "assistant",
                content: disputeData.message,
                timestamp: new Date().toISOString(),
              };
              setMessages((prev) => [...prev, disputeMsg]);
              toast.success("Dispute escalated to support team");
            } else {
              const error = await disputeRes.json();
              toast.error(error.error || "Failed to escalate dispute");
            }
          } catch (err) {
            console.error("Failed to escalate dispute:", err);
            toast.error("Failed to escalate dispute");
          }
        }, 500);
      } else if (data.action?.action === "BOOKING_INQUIRY") {
        // Get booking/FAQ information
        setTimeout(async () => {
          try {
            const bookingRes = await apiFetch("/api/ai/chat/booking-info", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ userMessage: data.action.userMessage }),
            });

            if (bookingRes.ok) {
              const bookingData = await bookingRes.json();
              const bookingMsg: Message = {
                id: `booking-${Date.now()}`,
                role: "assistant",
                content: bookingData.message,
                timestamp: new Date().toISOString(),
              };
              setMessages((prev) => [...prev, bookingMsg]);
            }
          } catch (err) {
            console.error("Failed to get booking info:", err);
          }
        }, 500);
      } else if (data.action?.action === "RECURRING_SERVICE" && data.action?.jobData) {
        // Search for recurring providers
        setTimeout(async () => {
          try {
            const recurringRes = await apiFetch("/api/ai/chat/recurring-job", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ jobData: data.action.jobData }),
            });

            if (recurringRes.ok) {
              const recurringData = await recurringRes.json();
              const recurringMsg: Message = {
                id: `recurring-${Date.now()}`,
                role: "assistant",
                content: recurringData.message,
                timestamp: new Date().toISOString(),
              };
              setMessages((prev) => [...prev, recurringMsg]);
              
              if (recurringData.providers && recurringData.providers.length > 0) {
                setAvailableProviders(recurringData.providers);
                setConversationState((prev) => ({
                  ...prev,
                  jobData: data.action.jobData,
                }));
              }
            }
          } catch (err) {
            console.error("Failed to search recurring providers:", err);
            toast.error("Failed to find recurring service providers");
          }
        }, 500);
      } else if (data.action?.action === "GET_QUOTE_ESTIMATE" && data.action?.jobData) {
        // Get price estimate
        setTimeout(async () => {
          try {
            const estimateRes = await apiFetch("/api/ai/chat/price-estimate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ jobData: data.action.jobData }),
            });

            if (estimateRes.ok) {
              const estimateData = await estimateRes.json();
              const estimateMsg: Message = {
                id: `estimate-${Date.now()}`,
                role: "assistant",
                content: estimateData.message,
                timestamp: new Date().toISOString(),
              };
              setMessages((prev) => [...prev, estimateMsg]);
              setConversationState((prev) => ({
                ...prev,
                jobData: data.action.jobData,
              }));
            }
          } catch (err) {
            console.error("Failed to get price estimate:", err);
            toast.error("Failed to calculate price estimate");
          }
        }, 500);
      } else if (data.action?.action === "MODIFY_JOB" && data.action?.jobId) {
        // Modify job
        setTimeout(async () => {
          try {
            const modifyRes = await apiFetch("/api/ai/chat/modify-job", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(data.action),
            });

            if (modifyRes.ok) {
              const modifyData = await modifyRes.json();
              const modifyMsg: Message = {
                id: `modify-${Date.now()}`,
                role: "assistant",
                content: modifyData.message,
                timestamp: new Date().toISOString(),
              };
              setMessages((prev) => [...prev, modifyMsg]);
            } else {
              const error = await modifyRes.json();
              toast.error(error.error || "Failed to modify job");
            }
          } catch (err) {
            console.error("Failed to modify job:", err);
            toast.error("Failed to modify job");
          }
        }, 500);
      } else if (data.action?.action === "URGENT_SERVICE") {
        // Search for urgent service providers
        setTimeout(async () => {
          try {
            const urgentRes = await apiFetch("/api/ai/chat/urgent-service", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ jobData: data.action.jobData }),
            });

            if (urgentRes.ok) {
              const urgentData = await urgentRes.json();
              const urgentMsg: Message = {
                id: `urgent-${Date.now()}`,
                role: "assistant",
                content: urgentData.message,
                timestamp: new Date().toISOString(),
              };
              setMessages((prev) => [...prev, urgentMsg]);

              if (urgentData.urgentProviders && urgentData.urgentProviders.length > 0) {
                setAvailableProviders(urgentData.urgentProviders);
                setConversationState((prev) => ({
                  ...prev,
                  jobData: data.action.jobData,
                  urgentMode: true,
                }));
              }
            }
          } catch (err) {
            console.error("Failed to search urgent providers:", err);
            toast.error("Failed to find urgent service providers");
          }
        }, 500);
      } else if (data.action?.action === "SWITCH_PROVIDER") {
        // Handle provider switch request
        setTimeout(async () => {
          try {
            const switchRes = await apiFetch("/api/ai/chat/switch-provider", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                jobId: conversationState?.jobId,
                jobData: data.action.jobData,
                reason: data.action.reason,
                feedback: data.action.feedback,
              }),
            });

            if (switchRes.ok) {
              const switchData = await switchRes.json();
              const switchMsg: Message = {
                id: `switch-${Date.now()}`,
                role: "assistant",
                content: switchData.message,
                timestamp: new Date().toISOString(),
              };
              setMessages((prev) => [...prev, switchMsg]);

              if (
                switchData.replacementProviders &&
                switchData.replacementProviders.length > 0
              ) {
                setAvailableProviders(switchData.replacementProviders);
                setConversationState((prev) => ({
                  ...prev,
                  switchMode: true,
                }));
              }
            } else {
              const error = await switchRes.json();
              toast.error(error.error || "Failed to switch provider");
              const errorMsg: Message = {
                id: `switch-error-${Date.now()}`,
                role: "assistant",
                content: error.error || "Unable to switch provider at this time",
                timestamp: new Date().toISOString(),
              };
              setMessages((prev) => [...prev, errorMsg]);
            }
          } catch (err) {
            console.error("Failed to switch provider:", err);
            toast.error("Failed to process provider switch");
          }
        }, 500);
      } else if (data.action?.action === "VENDOR_REQUEST") {
        // Handle vendor/partner inquiry
        setTimeout(async () => {
          try {
            const vendorRes = await apiFetch("/api/ai/chat/vendor-request", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(data.action),
            });

            if (vendorRes.ok) {
              const vendorData = await vendorRes.json();
              const vendorMsg: Message = {
                id: `vendor-${Date.now()}`,
                role: "assistant",
                content: vendorData.message,
                timestamp: new Date().toISOString(),
              };
              setMessages((prev) => [...prev, vendorMsg]);
              toast.success("Vendor inquiry submitted! We'll contact you soon.");
            } else {
              const error = await vendorRes.json();
              toast.error(error.error || "Failed to submit vendor inquiry");
            }
          } catch (err) {
            console.error("Failed to submit vendor inquiry:", err);
            toast.error("Failed to submit vendor inquiry");
          }
        }, 500);
      } else if (data.nextAction === "ASSIGN_PROVIDER" && data.extractedData) {
        // Update conversation state with job data
        setConversationState((prev) => ({
          ...prev,
          jobData: data.extractedData,
        }));

        // In real implementation, would search providers here
        // For now, simulate with mock data
        setTimeout(() => {
          const mockProviders = [
            {
              providerId: "provider1",
              name: "Juan Plumbing Services",
              rating: 4.8,
              jobs: 128,
              matchScore: 95,
              reason: "Expert plumber with 95% match in your area",
            },
          ];
          setAvailableProviders(mockProviders);
          setConversationState((prev) => ({
            ...prev,
            selectedProvider: mockProviders[0],
          }));
        }, 1500);
      } else if (data.nextAction === "CONFIRM_BOOKING") {
        setShowBookingConfirm(true);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send message");
      // Remove the user message on error
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

      // Create job and assign provider
      const bookingRes = await apiFetch("/api/ai/chat/confirm-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobData: conversationState.jobData,
          providerId: conversationState.selectedProvider.providerId,
        }),
      });

      if (!bookingRes.ok) {
        const error = await bookingRes.json();
        throw new Error(error.error || "Failed to confirm booking");
      }

      const bookingData = await bookingRes.json();

      setShowBookingConfirm(false);

      // Add success message with jobId
      const successMsg: Message = {
        id: `success-${Date.now()}`,
        role: "assistant",
        content: `✅ Booking confirmed! Your job has been created (ID: ${bookingData.jobId.slice(-8)}). The provider has been notified and will contact you shortly.\n\nYou can ask 'Where is my provider?' or 'Cancel my request' anytime.`,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, successMsg]);

      // Update state with created jobId
      setConversationState((prev) => ({
        ...prev,
        jobId: bookingData.jobId,
        jobStatus: "assigned",
      }));

      toast.success("Booking confirmed!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to confirm booking");
    }
  };

  const handleSelectProvider = (provider: any) => {
    setConversationState((prev) => ({
      ...prev,
      selectedProvider: provider,
    }));

    const msg: Message = {
      id: `provider-select-${Date.now()}`,
      role: "user",
      content: `Great! Let's go with ${provider.name}. Please confirm the booking.`,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, msg]);

    // Trigger confirmation
    setTimeout(() => {
      setShowBookingConfirm(true);
    }, 500);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // Auto-resize textarea
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 100)}px`;
  };

  return (
    <>
      {/* Chat button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-40 rounded-full shadow-lg p-4 transition-all duration-300 ${
          isOpen
            ? "bg-slate-600 hover:bg-slate-700"
            : "bg-gradient-to-br from-primary to-primary-dark hover:shadow-xl"
        } text-white`}
        title={isOpen ? "Close chat" : "Open AI assistant"}
        aria-label="AI Chat Dispatcher"
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <MessageCircle className="w-6 h-6" />
        )}
      </button>

      {/* Chat window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-40 w-96 max-w-[calc(100vw-24px)] bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col max-h-[600px]">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary to-primary-dark text-white px-6 py-4 rounded-t-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              <h3 className="font-semibold">LocalPro Assistant</h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:bg-white/20 rounded-lg p-1 transition-colors"
              aria-label="Close chat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
              <div key={msg.id}>
                <div
                  className={`flex ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-xs px-4 py-3 rounded-lg ${
                      msg.role === "user"
                        ? "bg-primary text-white rounded-br-none"
                        : "bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-bl-none"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {msg.content}
                    </p>
                  </div>
                </div>

                {/* Provider Selection UI */}
                {msg.nextAction === "ASSIGN_PROVIDER" &&
                  availableProviders.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {availableProviders.map((provider) => (
                        <button
                          key={provider.providerId}
                          onClick={() => handleSelectProvider(provider)}
                          className="w-full text-left p-3 rounded-lg border border-slate-200 dark:border-slate-600 hover:border-primary hover:bg-primary/5 dark:hover:bg-primary/10 transition-all"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium text-slate-900 dark:text-white">
                                {provider.name}
                              </p>
                              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                                ⭐ {provider.rating} ({provider.jobs} jobs)
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                {provider.reason}
                              </p>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-bold text-green-600 dark:text-green-400">
                                {provider.matchScore}%
                              </div>
                              <p className="text-xs text-slate-500">match</p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-100 dark:bg-slate-700 px-4 py-3 rounded-lg rounded-bl-none">
                  <Loader2 className="w-5 h-5 animate-spin text-slate-600 dark:text-slate-300" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-slate-200 dark:border-slate-700 p-4 rounded-b-xl">
            <div className="flex gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                placeholder="Tell me what you need..."
                className="flex-1 resize-none bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary dark:text-slate-100 dark:placeholder-slate-400"
                rows={1}
              />
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="bg-primary hover:bg-primary-dark disabled:bg-slate-400 text-white rounded-lg p-2 transition-colors flex items-center justify-center"
                title="Send message"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
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
