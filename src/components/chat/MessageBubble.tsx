"use client";

import { memo, useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { CheckCheck, Check, FileText, Download, X, ZoomIn, ZoomOut, ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";

interface MessageBubbleProps {
  body: string;
  senderName: string;
  senderRole?: string;
  createdAt: string | Date;
  isMine: boolean;
  readAt?: string | null;
  /** Message type — 'text' | 'file' | 'system' */
  type?: string;
  fileUrl?: string;
  fileName?: string;
  fileMime?: string;
  fileSize?: number;
  /** First message in a consecutive same-sender group */
  isFirst?: boolean;
  /** Last message in a consecutive same-sender group */
  isLast?: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Per-position bubble border-radius (iMessage / WhatsApp style) */
function getBubbleRadius(isMine: boolean, isFirst: boolean, isLast: boolean): string {
  if (isMine) {
    if (isFirst && isLast) return "rounded-2xl rounded-br-sm";
    if (isFirst)           return "rounded-tl-2xl rounded-tr-2xl rounded-br-xl rounded-bl-2xl";
    if (isLast)            return "rounded-tl-2xl rounded-tr-xl rounded-br-sm rounded-bl-2xl";
    return "rounded-l-2xl rounded-r-xl";
  } else {
    if (isFirst && isLast) return "rounded-2xl rounded-bl-sm";
    if (isFirst)           return "rounded-tl-2xl rounded-tr-2xl rounded-br-2xl rounded-bl-xl";
    if (isLast)            return "rounded-tl-xl rounded-tr-2xl rounded-br-2xl rounded-bl-sm";
    return "rounded-r-2xl rounded-l-xl";
  }
}

/** Avatar circle with the sender's initial */
function SenderAvatar({ name, visible }: { name: string; visible: boolean }) {
  const initial = name.charAt(0).toUpperCase();
  return (
    <div
      className={cn(
        "flex-shrink-0 h-7 w-7 rounded-full bg-slate-200 text-slate-600 text-xs font-semibold flex items-center justify-center self-end mb-0.5",
        !visible && "invisible"
      )}
      aria-hidden={!visible}
    >
      {visible ? initial : null}
    </div>
  );
}

function ImageLightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  const t = useTranslations("messageBubble");
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "z" || e.key === "Z") setZoomed((z) => !z);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-sm"
      onClick={() => { if (zoomed) setZoomed(false); else onClose(); }}
    >
      {/* Toolbar */}
      <div
        className="absolute top-4 right-4 flex items-center gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        <a
          href={src}
          download
          className="flex items-center justify-center text-white bg-black/50 hover:bg-black/70 rounded-full p-2 transition-colors"
          aria-label={t("downloadAriaLabel")}
        >
          <Download className="h-4 w-4" />
        </a>
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center text-white bg-black/50 hover:bg-black/70 rounded-full p-2 transition-colors"
          aria-label={t("openNewTabAriaLabel")}
        >
          <ExternalLink className="h-4 w-4" />
        </a>
        <button
          onClick={() => setZoomed((z) => !z)}
          className="flex items-center justify-center text-white bg-black/50 hover:bg-black/70 rounded-full p-2 transition-colors"
          aria-label={zoomed ? "Zoom out" : "Zoom in"}
        >
          {zoomed ? <ZoomOut className="h-4 w-4" /> : <ZoomIn className="h-4 w-4" />}
        </button>
        <button
          onClick={onClose}
          className="flex items-center justify-center text-white bg-black/50 hover:bg-black/70 rounded-full p-2 transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Image */}
      <div
        className={cn(
          "transition-all duration-200",
          zoomed ? "overflow-auto cursor-zoom-out" : "cursor-zoom-in"
        )}
        onClick={(e) => { e.stopPropagation(); setZoomed((z) => !z); }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className={cn(
            "rounded-xl shadow-2xl object-contain transition-all duration-200",
            zoomed
              ? "max-w-none max-h-none w-auto h-auto"
              : "max-w-[90vw] max-h-[90vh]"
          )}
        />
      </div>

      {/* Hint */}
      {!zoomed && (
        <p className="absolute bottom-5 left-1/2 -translate-x-1/2 text-white/40 text-xs select-none">
          {t("zoomHint")}
        </p>
      )}
    </div>,
    document.body
  );
}

const MessageBubble = memo(function MessageBubble({
  body,
  senderName,
  createdAt,
  isMine,
  readAt,
  type = "text",
  fileUrl,
  fileName,
  fileMime,
  fileSize,
  isFirst = true,
  isLast = true,
}: MessageBubbleProps) {
  const t = useTranslations("messageBubble");
  const time = new Date(createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const isImage = fileMime?.startsWith("image/") ?? false;
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const openLightbox = useCallback(() => setLightboxOpen(true), []);
  const closeLightbox = useCallback(() => setLightboxOpen(false), []);

  const radius = getBubbleRadius(isMine, isFirst, isLast);

  // ── System messages ──────────────────────────────────────────────────────
  if (type === "system") {
    return (
      <div className="flex justify-center my-1 msg-in">
        <span className="text-xs text-slate-400 bg-slate-100 px-3 py-1 rounded-full">{body}</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-end gap-1.5 msg-in",
        isMine ? "flex-row-reverse self-end" : "flex-row self-start",
        // more vertical space at the start of a new group
        isFirst ? "mt-3" : "mt-0.5"
      )}
    >
      {/* Avatar — only for other person's messages */}
      {!isMine && (
        <SenderAvatar name={senderName} visible={isLast} />
      )}

      <div className={cn("flex flex-col gap-0.5 max-w-[72%]", isMine ? "items-end" : "items-start")}>
        {/* Sender name — only first in group */}
        {!isMine && isFirst && (
          <span className="text-xs font-medium text-slate-500 px-1 ml-0.5">{senderName}</span>
        )}

        {/* ── File attachment ── */}
        {type === "file" && fileUrl ? (
          <div className={cn(
            "overflow-hidden border",
            radius,
            isMine ? "border-primary/30 bg-primary/5" : "border-slate-200 bg-white shadow-sm"
          )}>
            {isImage ? (
              <>
                {lightboxOpen && (
                  <ImageLightbox src={fileUrl} alt={fileName ?? "Image"} onClose={closeLightbox} />
                )}
                <button type="button" onClick={openLightbox} className="block group relative text-left">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={fileUrl}
                    alt={fileName ?? "Image"}
                    className="block max-w-[280px] max-h-64 w-auto h-auto object-contain"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                    <ZoomIn className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 text-white drop-shadow" />
                  </div>
                  {fileName && (
                    <p className={cn(
                      "text-[10px] px-2 pb-1.5 pt-0.5 truncate max-w-[280px]",
                      isMine ? "text-primary/60" : "text-slate-400"
                    )}>{fileName}</p>
                  )}
                </button>
              </>
            ) : (
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "flex items-center gap-2.5 px-4 py-3 group",
                  isMine ? "text-primary" : "text-slate-700"
                )}
              >
                <FileText className="h-8 w-8 flex-shrink-0 text-slate-400 group-hover:text-primary transition-colors" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate max-w-[160px]">{fileName ?? body}</p>
                  {fileSize && <p className="text-xs text-slate-400">{formatBytes(fileSize)}</p>}
                </div>
                <Download className="h-4 w-4 ml-1 opacity-60 group-hover:opacity-100 transition-opacity" />
              </a>
            )}
          </div>
        ) : (
          /* ── Regular text message ── */
          <div
            className={cn(
              "px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words",
              radius,
              isMine
                ? "bg-primary text-white"
                : "bg-white border border-slate-200 text-slate-800 shadow-sm"
            )}
          >
            {body}
          </div>
        )}

        {/* Timestamp + read receipt — only on last in group */}
        {isLast && (
          <div className={cn("flex items-center gap-1 px-1", isMine ? "flex-row-reverse" : "flex-row")}>
            <span className="text-[11px] text-slate-400">{time}</span>
            {isMine && (
              readAt
                ? <CheckCheck className="h-3.5 w-3.5 text-primary" aria-label={t("readAriaLabel")} />
                : <Check className="h-3.5 w-3.5 text-slate-400" aria-label={t("sentAriaLabel")} />
            )}
          </div>
        )}
      </div>
    </div>
  );
});

export default MessageBubble;
