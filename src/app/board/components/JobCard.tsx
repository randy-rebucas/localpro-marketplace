"use client";

import { useState } from "react";
import { MapPin, CalendarDays, Briefcase, Copy, Check, Share2, Zap, Tag } from "lucide-react";
import { formatPeso, formatSchedule, qrUrl } from "../utils";
import { APP_URL } from "../constants";
import type { BoardJob } from "../types";

function jobUrl(jobId: string) {
  return `${APP_URL}/jobs/${jobId}`;
}

function shareText(job: BoardJob) {
  return `📌 Job Available: ${job.title} in ${job.location} — ${formatPeso(job.budget)}. Apply now on LocalPro!`;
}

interface ShareBtnProps {
  href: string;
  label: string;
  color: string;
  children: React.ReactNode;
}
function ShareBtn({ href, label, color, children }: ShareBtnProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className={`flex items-center justify-center w-7 h-7 rounded-lg text-white text-[10px] font-bold flex-shrink-0 ${color} hover:opacity-80 transition-opacity`}
    >
      {children}
    </a>
  );
}

const JOB_TAG_LABELS: Record<string, string> = {
  peso:        "PESO",
  lgu_project: "LGU Project",
  gov_program: "Gov't Program",
  emergency:   "Emergency",
  internship:  "Internship",
};

const JOB_TAG_COLORS: Record<string, string> = {
  peso:        "bg-blue-500/20 text-blue-300 border-blue-500/30",
  lgu_project: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  gov_program: "bg-violet-500/20 text-violet-300 border-violet-500/30",
  emergency:   "bg-red-500/20 text-red-300 border-red-500/30",
  internship:  "bg-amber-500/20 text-amber-300 border-amber-500/30",
};

const SOURCE_LABELS: Record<string, string> = {
  peso: "PESO",
  lgu:  "LGU",
};

export function JobCard({ job }: { job: BoardJob }) {
  const [imgSrc, setImgSrc] = useState(() => qrUrl(job._id));
  const [copied, setCopied] = useState(false);
  const [showShare, setShowShare] = useState(false);

  const url = jobUrl(job._id);
  const text = shareText(job);

  function handleCopy() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="bg-white/[0.07] border border-white/10 rounded-2xl p-4 flex flex-col gap-3 hover:bg-white/[0.10] transition-colors">
      {/* Top row: QR + details */}
      <div className="flex gap-3">
        {/* QR code */}
        <div className="flex-shrink-0 bg-white rounded-xl p-1.5 self-start">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imgSrc}
            alt="Scan to apply"
            width={96}
            height={96}
            className="rounded-lg"
            onError={() =>
              setImgSrc(
                `https://api.qrserver.com/v1/create-qr-code/?size=96x96&data=${encodeURIComponent(url)}&format=png`
              )
            }
          />
          <p className="text-[11px] text-slate-400 text-center mt-1 font-medium">SCAN TO APPLY</p>
        </div>

        {/* Details */}
        <div className="min-w-0 flex-1">
          {/* Badges row */}
          <div className="flex items-center flex-wrap gap-1.5 mb-1.5">
            <span className="inline-block px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold uppercase tracking-wider">
              {job.category}
            </span>
            {job.isPriority && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 text-xs font-semibold">
                <Zap className="h-2.5 w-2.5" />
                Priority
              </span>
            )}
            {job.jobSource && job.jobSource !== "private" && (
              <span className="inline-block px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30 text-xs font-semibold">
                {SOURCE_LABELS[job.jobSource] ?? job.jobSource.toUpperCase()}
              </span>
            )}
          </div>

          <div className="flex items-start justify-between gap-2 mb-2">
            <p className="text-base font-bold text-white leading-snug line-clamp-2 flex-1">{job.title}</p>
            <button
              onClick={() => setShowShare((v) => !v)}
              aria-label="Share job"
              title="Share this job"
              className={`flex-shrink-0 p-1.5 rounded-lg transition-all ${
                showShare
                  ? "bg-blue-500/25 text-blue-300 ring-1 ring-blue-400/30"
                  : "text-slate-600 hover:text-slate-300 hover:bg-white/10"
              }`}
            >
              <Share2 className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-1 text-sm text-slate-300 mb-1.5">
            <MapPin className="h-3.5 w-3.5 text-blue-400 flex-shrink-0" />
            <span className="truncate">{job.location}</span>
          </div>

          {/* Schedule (left) + Budget (right) */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1 text-sm text-slate-300 min-w-0">
              <CalendarDays className="h-3.5 w-3.5 text-blue-400 flex-shrink-0" />
              <span className="truncate">{formatSchedule(job.scheduleDate)}</span>
            </div>
            <div className="inline-flex items-center gap-1 bg-emerald-500/20 border border-emerald-500/30 rounded-lg px-2.5 py-1 flex-shrink-0">
              <Briefcase className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-sm font-bold text-emerald-300">{formatPeso(job.budget)}</span>
            </div>
          </div>

          {/* Job tags */}
          {job.jobTags && job.jobTags.length > 0 && (
            <div className="flex items-center flex-wrap gap-1">
              <Tag className="h-2.5 w-2.5 text-slate-500 flex-shrink-0" />
              {job.jobTags.map((tag) => (
                <span
                  key={tag}
                  className={`inline-block px-1.5 py-0.5 rounded border text-[10px] font-semibold ${
                    JOB_TAG_COLORS[tag] ?? "bg-white/10 text-slate-400 border-white/10"
                  }`}
                >
                  {JOB_TAG_LABELS[tag] ?? tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Share drawer */}
      {showShare && (
        <div className="border-t border-white/10 pt-2.5 pb-0.5 flex items-center justify-between gap-2 bg-black/10 px-4 -mx-4 -mb-3 rounded-b-2xl">
          <div className="flex items-center gap-1 min-w-0">
            <Share2 className="h-3 w-3 text-slate-500 flex-shrink-0" />
            <span className="text-[10px] text-slate-500 font-medium whitespace-nowrap">Share with your network</span>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0 pb-2.5">
            {/* Facebook */}
            <ShareBtn href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`} label="Share on Facebook" color="bg-[#1877f2]">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white"><path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.875v2.256h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/></svg>
            </ShareBtn>
            {/* WhatsApp */}
            <ShareBtn href={`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`} label="Share on WhatsApp" color="bg-[#25d366]">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
            </ShareBtn>
            {/* Messenger */}
            <ShareBtn href={`https://www.facebook.com/dialog/send?link=${encodeURIComponent(url)}&redirect_uri=${encodeURIComponent(url)}`} label="Share on Messenger" color="bg-gradient-to-br from-[#0084ff] to-[#a334fa]">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white"><path d="M12 0C5.373 0 0 4.974 0 11.111c0 3.498 1.744 6.614 4.469 8.652V24l4.088-2.242c1.092.3 2.246.464 3.443.464 6.627 0 12-4.975 12-11.111S18.627 0 12 0zm1.191 14.963l-3.055-3.26-5.963 3.26L10.732 8l3.131 3.26L19.752 8l-6.561 6.963z"/></svg>
            </ShareBtn>
            {/* TikTok */}
            <ShareBtn href={`https://www.tiktok.com/share?url=${encodeURIComponent(url)}`} label="Share on TikTok" color="bg-[#010101]">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z"/></svg>
            </ShareBtn>
            {/* Copy link */}
            <button
              onClick={handleCopy}
              aria-label="Copy job link"
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
