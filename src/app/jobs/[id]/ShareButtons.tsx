"use client";

import { useState } from "react";
import { Copy, Check, Share2 } from "lucide-react";

interface ShareButtonsProps {
  url: string;
  text: string;
}

export function ShareButtons({ url, text }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1.5">
        <Share2 className="h-3.5 w-3.5 text-slate-400" />
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Share this Job
        </span>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {/* Facebook */}
        <a
          href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Share on Facebook"
          className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#1877f2] hover:opacity-80 transition-opacity"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
            <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.875v2.256h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
          </svg>
        </a>

        {/* WhatsApp */}
        <a
          href={`https://wa.me/?text=${encodeURIComponent(text)}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Share on WhatsApp"
          className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#25d366] hover:opacity-80 transition-opacity"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
          </svg>
        </a>

        {/* Messenger */}
        <a
          href={`https://www.facebook.com/dialog/send?link=${encodeURIComponent(url)}&redirect_uri=${encodeURIComponent(url)}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Share on Messenger"
          className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-[#0084ff] to-[#a334fa] hover:opacity-80 transition-opacity"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
            <path d="M12 0C5.373 0 0 4.974 0 11.111c0 3.498 1.744 6.614 4.469 8.652V24l4.088-2.242c1.092.3 2.246.464 3.443.464 6.627 0 12-4.975 12-11.111S18.627 0 12 0zm1.191 14.963l-3.055-3.26-5.963 3.26L10.732 8l3.131 3.26L19.752 8l-6.561 6.963z" />
          </svg>
        </a>

        {/* TikTok */}
        <a
          href={`https://www.tiktok.com/share?url=${encodeURIComponent(url)}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Share on TikTok"
          className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#010101] border border-white/10 hover:opacity-80 transition-opacity"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z" />
          </svg>
        </a>

        {/* X (Twitter) */}
        <a
          href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Share on X (Twitter)"
          className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#000000] border border-white/10 hover:opacity-80 transition-opacity"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </a>

        {/* Viber */}
        <a
          href={`viber://forward?text=${encodeURIComponent(text + " " + url)}`}
          aria-label="Share on Viber"
          className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#7360f2] hover:opacity-80 transition-opacity"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
            <path d="M11.997 0C5.976 0 1.038 4.366.065 10.142c-.433 2.596-.082 5.225 1.003 7.59L.02 23.462a.38.38 0 0 0 .475.463l5.895-1.636a11.957 11.957 0 0 0 5.607 1.394C18.02 23.683 23 18.703 23 12.5 23 5.597 18.12 0 11.997 0zm.003 21.52a9.973 9.973 0 0 1-4.962-1.313l-.357-.214-3.7.972.992-3.614-.234-.37A9.97 9.97 0 0 1 2 12.5C2 6.7 6.478 2 12 2s10 4.7 10 10.5c0 5.8-4.478 9.02-10 9.02zm5.36-7.54c-.293-.147-1.737-.855-2.006-.952-.268-.1-.464-.147-.659.147-.195.293-.757.952-.927 1.148-.171.195-.342.22-.635.073-.293-.147-1.237-.455-2.354-1.45-.87-.773-1.457-1.727-1.628-2.021-.171-.293-.018-.452.128-.597.132-.132.293-.342.44-.513.147-.17.195-.292.293-.487.097-.195.049-.366-.025-.513-.073-.147-.659-1.586-.903-2.172-.237-.57-.48-.492-.659-.503a11.74 11.74 0 0 0-.562-.01c-.195 0-.513.073-.781.366-.268.293-1.025 1.001-1.025 2.44 0 1.44 1.049 2.832 1.196 3.027.147.195 2.063 3.149 4.998 4.416.699.3 1.244.481 1.669.614.701.224 1.34.193 1.844.117.562-.084 1.733-.708 1.977-1.392.245-.684.245-1.27.171-1.392-.073-.122-.268-.196-.562-.342z" />
          </svg>
        </a>

        {/* Copy link */}
        <button
          onClick={handleCopy}
          aria-label="Copy job link"
          className={`flex items-center gap-1.5 px-3 h-9 rounded-xl text-xs font-semibold transition-colors flex-shrink-0 ${
            copied
              ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40"
              : "bg-white/10 text-slate-300 hover:bg-white/20"
          }`}
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              Copy Link
            </>
          )}
        </button>
      </div>
    </div>
  );
}
