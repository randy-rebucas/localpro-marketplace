"use client";

import { useState } from "react";
import Image from "next/image";
import { Star, Award, CheckCircle2, Share2, Copy, Check } from "lucide-react";
import { RANK_MEDAL } from "../constants";
import { APP_URL } from "../constants";
import type { LeaderboardEntry } from "../types";

function buildShareText(entry: LeaderboardEntry) {
  const rank = entry.rank === 1 ? "🥇 #1 Top Provider" : entry.rank === 2 ? "🥈 #2 Provider" : entry.rank === 3 ? "🥉 #3 Provider" : `#${entry.rank} Provider`;
  const rating = entry.avgRating > 0 ? ` • ${entry.avgRating.toFixed(1)}⭐` : "";
  return `${rank} on LocalPro Marketplace!\n${entry.name} • ${entry.completedJobCount} jobs completed${rating}\nJoin LocalPro: ${APP_URL}/register`;
}

function buildShareUrl(entry: LeaderboardEntry) {
  return `${APP_URL}/providers/${entry._id}`;
}

const SHARE_BUTTONS = [
  {
    key: "fb",
    label: "Facebook",
    bg: "bg-[#1877f2]",
    href: (url: string) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    icon: <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white"><path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.875v2.256h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/></svg>,
  },
  {
    key: "wa",
    label: "WhatsApp",
    bg: "bg-[#25d366]",
    href: (_url: string, text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`,
    icon: <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>,
  },
  {
    key: "msg",
    label: "Messenger",
    bg: "bg-gradient-to-br from-[#0084ff] to-[#a334fa]",
    href: (url: string) => `https://www.facebook.com/dialog/send?link=${encodeURIComponent(url)}&redirect_uri=${encodeURIComponent(url)}`,
    icon: <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white"><path d="M12 0C5.373 0 0 4.974 0 11.111c0 3.498 1.744 6.614 4.469 8.652V24l4.088-2.242c1.092.3 2.246.464 3.443.464 6.627 0 12-4.975 12-11.111S18.627 0 12 0zm1.191 14.963l-3.055-3.26-5.963 3.26L10.732 8l3.131 3.26L19.752 8l-6.561 6.963z"/></svg>,
  },
  {
    key: "tt",
    label: "TikTok",
    bg: "bg-[#010101] border border-white/10",
    href: (url: string) => `https://www.tiktok.com/share?url=${encodeURIComponent(url)}`,
    icon: <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z"/></svg>,
  },
];

export function LeaderboardCard({ entry }: { entry: LeaderboardEntry }) {
  const [showShare, setShowShare] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareText = buildShareText(entry);
  const shareUrl = buildShareUrl(entry);
  const isTop = entry.rank === 1;

  function handleCopy() {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className={`rounded-xl overflow-hidden transition-all ${
      isTop
        ? "bg-gradient-to-r from-amber-500/15 to-amber-600/5 border border-amber-500/30 shadow-[0_0_12px_rgba(251,191,36,0.08)]"
        : entry.rank === 2
        ? "bg-slate-400/10 border border-slate-400/20"
        : entry.rank === 3
        ? "bg-orange-700/10 border border-orange-700/20"
        : "bg-white/[0.05] border border-white/[0.08]"
    }`}>

      {/* Main row */}
      <div className="flex items-center gap-3 px-3 py-2.5">
        {/* Rank medal */}
        <span className="text-2xl flex-shrink-0 w-7 text-center leading-none select-none">
          {RANK_MEDAL[entry.rank - 1] ?? `#${entry.rank}`}
        </span>

        {/* Avatar */}
        <div className="relative flex-shrink-0">
          {entry.avatar ? (
            <Image
              src={entry.avatar}
              alt={entry.name}
              width={38}
              height={38}
              className={`rounded-full object-cover w-[38px] h-[38px] border-2 ${isTop ? "border-amber-400/50" : "border-white/20"}`}
            />
          ) : (
            <div className={`w-[38px] h-[38px] rounded-full flex items-center justify-center text-white font-bold text-sm border-2 ${isTop ? "bg-amber-600 border-amber-400/50" : "bg-blue-600 border-white/20"}`}>
              {entry.name.charAt(0).toUpperCase()}
            </div>
          )}
          {isTop && (
            <span className="absolute -top-1.5 -right-1 text-xs leading-none">👑</span>
          )}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className={`text-sm font-bold truncate leading-none ${isTop ? "text-amber-100" : "text-white"}`}>
              {entry.name}
            </p>
            {entry.isLocalProCertified && (
              <Award className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" aria-label="LocalPro Certified" />
            )}
            {isTop && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-500/30 text-amber-300 text-[9px] font-bold uppercase tracking-wider flex-shrink-0 leading-none">
                🏆 Top Provider
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {entry.avgRating > 0 && (
              <span className="flex items-center gap-0.5 text-xs text-amber-300 font-semibold">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                {entry.avgRating.toFixed(1)}
              </span>
            )}
            <span className="text-xs text-slate-400 font-medium">{entry.completedJobCount} jobs</span>
            {entry.completionRate > 0 && (
              <span className="flex items-center gap-0.5 text-xs text-emerald-400 font-medium">
                <CheckCircle2 className="h-3 w-3" />
                {entry.completionRate}%
              </span>
            )}
          </div>
        </div>

        {/* Share toggle */}
        <button
          onClick={() => setShowShare((v) => !v)}
          aria-label="Share achievement"
          title="Share this provider's achievement"
          className={`flex-shrink-0 p-1.5 rounded-lg transition-all ${
            showShare
              ? "bg-blue-500/25 text-blue-300 ring-1 ring-blue-400/30"
              : "text-slate-600 hover:text-slate-300 hover:bg-white/10"
          }`}
        >
          <Share2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Share drawer */}
      {showShare && (
        <div className="px-3 pb-2.5 pt-2 border-t border-white/5 bg-black/10 flex items-center justify-between gap-2">
          <p className="text-[10px] text-slate-500 font-medium whitespace-nowrap">Share achievement:</p>
          <div className="flex items-center gap-1.5">
            {SHARE_BUTTONS.map((btn) => (
              <a
                key={btn.key}
                href={btn.key === "wa" ? btn.href(shareUrl, shareText) : btn.href(shareUrl, shareText)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Share on ${btn.label}`}
                className={`flex items-center justify-center w-7 h-7 rounded-lg hover:opacity-80 active:scale-95 transition-all ${btn.bg}`}
              >
                {btn.icon}
              </a>
            ))}
            <button
              onClick={handleCopy}
              aria-label="Copy profile link"
              className={`flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0 transition-all active:scale-95 ${
                copied ? "bg-emerald-500/30 text-emerald-300 ring-1 ring-emerald-400/30" : "bg-white/10 text-slate-400 hover:bg-white/20"
              }`}
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

