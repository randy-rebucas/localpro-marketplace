"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { Send, Sparkles, Loader2, Paperclip, X, FileText, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { apiFetch } from "@/lib/fetchClient";
import { containsContactInfo } from "@/lib/contactFilter";
import { useTranslations } from "next-intl";

interface MessageInputProps {
  onSend: (body: string) => Promise<void>;
  /** Called when a file is attached — send file to the attachment endpoint */
  onAttach?: (file: File) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
  /** If provided, enables the AI quick reply button */
  aiSuggestData?: {
    lastMessages: { body: string; senderRole?: string }[];
    role: string;
    jobTitle?: string;
  };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MessageInput({
  onSend,
  onAttach,
  disabled,
  placeholder,
  aiSuggestData,
}: MessageInputProps) {
  const t = useTranslations("messageInput");
  const resolvedPlaceholder = placeholder ?? t("defaultPlaceholder");
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Create/revoke blob URL for image previews
  useEffect(() => {
    if (pendingFile?.type.startsWith("image/")) {
      const url = URL.createObjectURL(pendingFile);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreviewUrl(null);
  }, [pendingFile]);

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
      setValue(trimmed);
      toast.error(err instanceof Error ? err.message : t("sendFailed"));
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
      if (!res.ok) { toast.error(data.error ?? t("suggestionsFailed")); return; }
      setSuggestions(data.replies ?? []);
    } catch {
      toast.error(t("serviceError"));
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const applySuggestion = (reply: string) => {
    setValue(reply);
    setSuggestions([]);
    textareaRef.current?.focus();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    e.target.value = "";
  };

  const sendFile = async () => {
    if (!pendingFile || !onAttach) return;
    setUploadingFile(true);
    try {
      await onAttach(pendingFile);
      setPendingFile(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("uploadFailed"));
    } finally {
      setUploadingFile(false);
    }
  };

  const hasContactInfo = value.trim().length > 0 && containsContactInfo(value);

  return (
    <div className="border-t border-slate-200 bg-white">
      {/* Contact-info warning */}
      {hasContactInfo && (
        <div className="mx-3 mt-2.5 flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2">
          <ShieldAlert className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 leading-snug">
            {t("contactWarning")}
          </p>
        </div>
      )}

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
              {loadingSuggestions ? t("suggesting") : t("suggestReplies")}
            </button>
          )}
        </div>
      )}

      {/* Pending file preview */}
      {pendingFile && (
        <div className="mx-3 mt-2.5 rounded-xl bg-slate-50 border border-slate-200 overflow-hidden">
          {/* Image preview */}
          {previewUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt={pendingFile.name}
              className="w-full max-h-48 object-contain bg-slate-100"
            />
          )}
          <div className="flex items-center gap-2 px-3 py-2">
            {!previewUrl && <FileText className="h-4 w-4 text-slate-500 flex-shrink-0" />}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-700 truncate">{pendingFile.name}</p>
              <p className="text-[10px] text-slate-400">{formatBytes(pendingFile.size)}</p>
            </div>
            {!uploadingFile ? (
              <>
                <button
                  type="button"
                  onClick={sendFile}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary-700 transition-colors"
                >
                  <Send className="h-3 w-3" /> {t("sendFileBtn")}
                </button>
                <button
                  type="button"
                  onClick={() => setPendingFile(null)}
                  className="h-6 w-6 flex items-center justify-center rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {t("uploading")}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex items-end gap-2 p-3">
        {/* Hidden file input */}
        {onAttach && (
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
            onChange={handleFileChange}
          />
        )}

        {/* Attach button */}
        {onAttach && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || uploadingFile}
            title={t("attachTitle")}
            className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-xl border border-slate-200 text-slate-400 hover:text-primary hover:border-primary/40 transition-colors disabled:opacity-40"
          >
            <Paperclip className="h-4 w-4" />
          </button>
        )}

        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={(e) => { setValue(e.target.value); if (suggestions.length > 0) setSuggestions([]); }}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          placeholder={resolvedPlaceholder}
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
