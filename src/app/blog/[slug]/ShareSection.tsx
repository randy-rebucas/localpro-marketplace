"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

interface ShareSectionProps {
  title: string;
  slug: string;
}

export default function ShareSection({ title, slug }: ShareSectionProps) {
  const [copied, setCopied] = useState(false);

  const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/blog/${slug}`;

  const handleCopy = async () => {
    const url = typeof window !== "undefined"
      ? `${window.location.origin}/blog/${slug}`
      : shareUrl;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const encoded = encodeURIComponent(shareUrl);
  const encodedTitle = encodeURIComponent(title);

  return (
    <div className="py-7 border-t border-slate-100">
      <p className="text-sm font-bold text-slate-700 mb-3">Share this article:</p>
      <div className="flex items-center gap-2 flex-wrap">
        <a
          href={`https://www.facebook.com/sharer/sharer.php?u=${encoded}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Share on Facebook"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#1877F2] text-white text-xs font-semibold hover:bg-[#166fe5] transition-colors"
        >
          <FacebookIcon />
          Facebook
        </a>
        <a
          href={`https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encoded}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Share on Twitter"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-700 transition-colors"
        >
          <TwitterIcon />
          Twitter
        </a>
        <a
          href={`https://www.linkedin.com/shareArticle?mini=true&url=${encoded}&title=${encodedTitle}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Share on LinkedIn"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0077B5] text-white text-xs font-semibold hover:bg-[#006497] transition-colors"
        >
          <LinkedInIcon />
          LinkedIn
        </a>
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:border-primary/40 hover:text-primary transition-colors"
        >
          {copied ? (
            <><Check className="w-3.5 h-3.5 text-emerald-500" /> Copied!</>
          ) : (
            <><Copy className="w-3.5 h-3.5" /> Copy Link</>
          )}
        </button>
      </div>
    </div>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function TwitterIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}
