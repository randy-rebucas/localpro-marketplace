"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { Send, Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { apiFetch } from "@/lib/fetchClient";

interface MessageInputProps {
  onSend: (body: string) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
  /** If provided, enables the AI quick reply button */
  aiSuggestData?: {
    lastMessages: { body: string; senderRole?: string }[];
    role: string;
    jobTitle?: string;
  };
}

export default function MessageInput({ onSend, disabled, placeholder = "Type a message…", aiSuggestData }: MessageInputProps) {
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = async () => {
    const trimmed = value.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    try {
      await onSend(trimmed);
    } catch (err) {
      // Restore the message so the user can retry
      setValue(trimmed);
      toast.error(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  const fetchSuggestions = async () => {
    if (!aiSuggestData || loadingSuggestions) return;
    setLoadingSuggestions(true);
    setSuggestions([]);
    try {
      const res = await apiFetch("/api/ai/suggest-replies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(aiSuggestData),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Could not fetch suggestions"); return; }
      setSuggestions(data.replies ?? []);
    } catch {
      toast.error("Could not reach AI service.");
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const applySuggestion = (reply: string) => {
    setValue(reply);
    setSuggestions([]);
    textareaRef.current?.focus();
  };

  return (
    <div className="border-t border-slate-200 bg-white">
      {/* AI quick reply chips */}
      {(suggestions.length > 0 || (aiSuggestData && aiSuggestData.lastMessages.length > 0)) && (
        <div className="flex items-center gap-2 px-3 pt-2.5 flex-wrap">
          {suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => applySuggestion(s)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-violet-200 bg-violet-50 text-violet-700 text-xs font-medium hover:bg-violet-100 transition-colors max-w-[240px] truncate"
            >
              {s}
            </button>
          ))}
          {suggestions.length === 0 && aiSuggestData && (
            <button
              type="button"
              onClick={fetchSuggestions}
              disabled={loadingSuggestions || disabled}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-slate-200 text-slate-500 text-xs hover:border-violet-300 hover:text-violet-600 transition-colors disabled:opacity-40"
            >
              {loadingSuggestions
                ? <Loader2 className="h-3 w-3 animate-spin" />
                : <Sparkles className="h-3 w-3" />}
              {loadingSuggestions ? "Suggesting…" : "Suggest replies"}
            </button>
          )}
        </div>
      )}
      <div className="flex items-end gap-2 p-3">
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={(e) => { setValue(e.target.value); if (suggestions.length > 0) setSuggestions([]); }}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          placeholder={placeholder}
          disabled={disabled || sending}
          className={cn(
            "flex-1 resize-none rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5",
            "text-sm text-slate-800 placeholder:text-slate-400",
            "focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary",
            "disabled:opacity-50 transition-colors max-h-40 overflow-y-auto"
          )}
        />
        <button
          onClick={handleSend}
          disabled={!value.trim() || sending || disabled}
          className={cn(
            "flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-xl",
            "bg-primary text-white transition-opacity",
            "disabled:opacity-40 hover:bg-primary-700"
          )}
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
