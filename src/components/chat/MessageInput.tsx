"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface MessageInputProps {
  onSend: (body: string) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
}

export default function MessageInput({ onSend, disabled, placeholder = "Type a message…" }: MessageInputProps) {
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);
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

  return (
    <div className="flex items-end gap-2 border-t border-slate-200 bg-white p-3">
      <textarea
        ref={textareaRef}
        rows={1}
        value={value}
        onChange={(e) => setValue(e.target.value)}
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
  );
}
