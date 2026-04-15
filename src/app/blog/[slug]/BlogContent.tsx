"use client";

import { useState, useEffect } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";

interface BlogContentProps {
  content: string;
}

/**
 * Client component for rendering markdown blog content
 * Uses marked for parsing markdown and DOMPurify for sanitizing HTML
 * 
 * Note: DOMPurify only runs in the browser (via useEffect) to avoid
 * "not a function" errors during server-side rendering
 */
export default function BlogContent({ content }: BlogContentProps) {
  const [html, setHtml] = useState("");

  useEffect(() => {
    try {
      const parsed = marked.parse(content, { breaks: true, async: false }) as string;
      const sanitized = DOMPurify.sanitize(parsed);
      setHtml(sanitized);
    } catch (error) {
      console.error("Error rendering blog content:", error);
      setHtml("<p>Error rendering content</p>");
    }
  }, [content]);

  return (
    <div 
      className="prose dark:prose-invert max-w-none"
      dangerouslySetInnerHTML={{ __html: html }}
      style={({
        "--tw-prose-body": "rgb(55 65 81 / 1)",
        "--tw-prose-headings": "rgb(17 24 39 / 1)",
        "--tw-prose-lead": "rgb(75 85 99 / 1)",
        "--tw-prose-links": "rgb(37 99 235 / 1)",
        "--tw-prose-bold": "rgb(17 24 39 / 1)",
        "--tw-prose-counters": "rgb(107 114 128 / 1)",
        "--tw-prose-bullets": "rgb(209 213 219 / 1)",
        "--tw-prose-hr": "rgb(229 231 235 / 1)",
        "--tw-prose-quotes": "rgb(107 114 128 / 1)",
        "--tw-prose-quote-borders": "rgb(229 231 235 / 1)",
        "--tw-prose-captions": "rgb(107 114 128 / 1)",
        "--tw-prose-code": "rgb(17 24 39 / 1)",
        "--tw-prose-pre-code": "rgb(243 244 246 / 1)",
        "--tw-prose-pre-bg": "rgb(17 24 39 / 1)",
        "--tw-prose-th-borders": "rgb(209 213 219 / 1)",
        "--tw-prose-td-borders": "rgb(229 231 235 / 1)",
      } as any)}
    />
  );
}
